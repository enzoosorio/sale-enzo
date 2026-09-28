/** Uploads only the deterministic local catalog's images to Cloudflare R2.
 *
 * Run after `supabase db reset --local`:
 *   npm run seed:r2 -- --dry-run
 *   npm run seed:r2
 *   npm run seed:r2 -- --verify
 *
 * Re-running checks each object before uploading and accepts only seed URLs or
 * this script's own R2 URLs in the local database.
 */
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config({ path: ".env" });

interface MediaEntry {
  productId: string;
  variantId: string;
  sourceUrl: string;
  seedUrl: string;
  key: string;
}

const dryRun = process.argv.includes("--dry-run");
const verifyOnly = process.argv.includes("--verify");
if (dryRun && verifyOnly) throw new Error("Choose --dry-run or --verify");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}; see docs/R2_SETUP.md`);
  return value;
}

function localSupabaseUrl(): string {
  const raw = required("SUPABASE_URL");
  const url = new URL(raw);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "55521") {
    throw new Error("seed:r2 only accepts sale-enzo-search local Supabase at http://127.0.0.1:55521");
  }
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (publicUrl && new URL(publicUrl).origin !== url.origin) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must point to the same local Supabase instance");
  }
  return raw;
}

function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e.name === "NotFound" || e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404;
}

async function objectExists(r2: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (isMissingObject(error)) return false;
    throw error;
  }
}

const sourceCache = new Map<string, Uint8Array>();
async function sourceImage(url: string): Promise<Uint8Array> {
  const cached = sourceCache.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Source image HTTP ${response.status}: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 3 || bytes.length > 10 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new Error(`Source is not a JPEG within 10 MB: ${url}`);
  }
  sourceCache.set(url, bytes);
  return bytes;
}

async function publicObjectExists(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (response.ok) return true;
    if (attempt === 2) throw new Error(`Public image HTTP ${response.status}: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
}

async function main() {
  const dbUrl = localSupabaseUrl();
  const db = createClient(dbUrl, required("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
  const entries = JSON.parse(await readFile(new URL("../supabase/seed-media.json", import.meta.url), "utf8")) as MediaEntry[];
  if (entries.length !== 80 || new Set(entries.map((entry) => entry.variantId)).size !== 80 || new Set(entries.map((entry) => entry.key)).size !== 80) {
    throw new Error("Expected 80 distinct seed variants and R2 keys");
  }

  const { data, error } = await db.from("product_variants")
    .select("id, product_id, main_img_url")
    .in("id", entries.map((entry) => entry.variantId));
  if (error) throw error;
  const variants = new Map((data ?? []).map((row) => [row.id, row]));
  if (variants.size !== 80) throw new Error(`Found ${variants.size}/80 seed variants in local Supabase; run db reset --local first`);

  const [products, items] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true })
      .in("id", entries.map((entry) => entry.productId)).eq("is_active", true),
    db.from("product_items").select("id", { count: "exact", head: true })
      .like("sku", "SEED-%").eq("status", "available").gt("stock", 0),
  ]);
  if (products.error || items.error || products.count !== 80 || items.count !== 80) {
    throw new Error(`Expected 80 active seed products and 80 available seed items; found ${products.count ?? "?"} and ${items.count ?? "?"}`);
  }

  const baseUrl = new URL(required("NEXT_PUBLIC_R2_PUBLIC_BASE_URL"));
  if (baseUrl.protocol !== "https:" || baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
    throw new Error("NEXT_PUBLIC_R2_PUBLIC_BASE_URL must be a public HTTPS origin without a path");
  }
  const publicBase = baseUrl.origin;
  const bucket = required("R2_BUCKET_MEDIA");
  const r2 = dryRun ? null : r2Client();
  let uploaded = 0;
  let reused = 0;
  let updated = 0;

  // Validate all target rows before making any external changes.
  for (const entry of entries) {
    const row = variants.get(entry.variantId);
    const target = `${publicBase}/${entry.key}`;
    if (!row || row.product_id !== entry.productId || ![entry.seedUrl, target].includes(row.main_img_url)) {
      throw new Error(`Seed variant ${entry.variantId} is missing, reassigned, or has a non-seed image URL`);
    }
  }

  for (const [index, entry] of entries.entries()) {
    const row = variants.get(entry.variantId)!;
    const target = `${publicBase}/${entry.key}`;
    if (dryRun) {
      console.log(`${index + 1}/80 ${entry.variantId} -> ${bucket}/${entry.key}`);
      continue;
    }

    if (!(await objectExists(r2!, bucket, entry.key))) {
      if (verifyOnly) throw new Error(`R2 object missing: ${entry.key}`);
      await r2!.send(new PutObjectCommand({
        Bucket: bucket,
        Key: entry.key,
        Body: await sourceImage(entry.sourceUrl),
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      }));
      uploaded++;
    } else {
      reused++;
    }
    if (!(await objectExists(r2!, bucket, entry.key)) || !(await publicObjectExists(target))) {
      throw new Error(`Could not verify uploaded image: ${entry.key}`);
    }
    if (row.main_img_url !== target) {
      if (verifyOnly) throw new Error(`Database image URL is not R2: ${entry.variantId}`);
      const result = await db.from("product_variants")
        .update({ main_img_url: target })
        .eq("id", entry.variantId)
        .eq("product_id", entry.productId)
        .eq("main_img_url", entry.seedUrl)
        .select("id")
        .single();
      if (result.error || !result.data) throw new Error(`Database update failed for ${entry.variantId}: ${result.error?.message ?? "row changed"}`);
      updated++;
    }
    console.log(`${index + 1}/80 OK ${entry.key}`);
  }
  console.log(dryRun ? "Dry run complete: 80 planned images" : `Verified 80 public R2 images; uploaded ${uploaded}, reused ${reused}, updated ${updated} local rows`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
