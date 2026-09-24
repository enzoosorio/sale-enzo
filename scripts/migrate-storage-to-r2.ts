/**
 * Copies product images from Supabase Storage (bucket "variant-images") to
 * Cloudflare R2 and rewrites the stored URLs.
 *
 *   npx tsx scripts/migrate-storage-to-r2.ts --dry-run
 *   npx tsx scripts/migrate-storage-to-r2.ts
 *
 * Idempotent: rows already pointing to R2 are skipped. Supabase objects are
 * NOT deleted; remove the bucket manually once everything looks right.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const DRY_RUN = process.argv.includes("--dry-run");
const LEGACY_MARKER = "/storage/v1/object/public/variant-images/";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});
const MEDIA_BUCKET = process.env.R2_BUCKET_MEDIA!;
const PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL!.replace(/\/$/, "");

const copied = new Map<string, string>();

/** Copies one legacy object (once) and returns its R2 public URL. */
async function migrateUrl(legacyUrl: string): Promise<string> {
  const cached = copied.get(legacyUrl);
  if (cached) return cached;

  const key = legacyUrl.split(LEGACY_MARKER)[1]?.split("?")[0];
  if (!key) throw new Error(`Unexpected URL: ${legacyUrl}`);
  const target = `${PUBLIC_BASE}/${key}`;

  if (!DRY_RUN) {
    const res = await fetch(legacyUrl);
    if (!res.ok) throw new Error(`Download ${res.status}: ${legacyUrl}`);
    await r2.send(
      new PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: key,
        Body: new Uint8Array(await res.arrayBuffer()),
        ContentType: res.headers.get("content-type") ?? "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }
  copied.set(legacyUrl, target);
  return target;
}

async function migrateColumn(table: string, idColumn: string, urlColumn: string) {
  const { data, error } = await db.from(table).select(`${idColumn}, ${urlColumn}`).like(urlColumn, `%${LEGACY_MARKER}%`);
  if (error) throw new Error(`${table}: ${error.message}`);

  let ok = 0;
  let failed = 0;
  for (const row of (data ?? []) as unknown as Record<string, string>[]) {
    try {
      const url = await migrateUrl(row[urlColumn]);
      if (!DRY_RUN) {
        const { error: updateError } = await db.from(table).update({ [urlColumn]: url }).eq(idColumn, row[idColumn]);
        if (updateError) throw new Error(updateError.message);
      }
      ok++;
      console.log(`  ✓ ${table}.${urlColumn} ${row[idColumn].slice(0, 8)} → ${url}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${table} ${row[idColumn]}: ${(e as Error).message}`);
    }
  }
  console.log(`${table}.${urlColumn}: ${ok} ${DRY_RUN ? "to migrate" : "migrated"}, ${failed} failed`);
}

async function main() {
  console.log(DRY_RUN ? "🧪 Dry run (no writes)" : "🚚 Migrating Supabase Storage → R2");
  await migrateColumn("product_variants", "id", "main_img_url");
  await migrateColumn("variant_images", "id", "image_url");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
