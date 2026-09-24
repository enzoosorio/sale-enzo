/**
 * Imports the legacy SALE ENZO.xlsx into staging.product_drafts.
 *
 *   npx tsx scripts/import-xlsx.ts --dry-run [--out report.json] [--limit 5]
 *   npx tsx scripts/import-xlsx.ts --offline --out report.json   (no DB: seed taxonomy, implies --dry-run)
 *   npx tsx scripts/import-xlsx.ts [--file "C:/path/SALE ENZO.xlsx"]
 *
 * Each row goes through: deterministic normalizers → the same AI extraction as
 * voice capture (closed taxonomy + segmentation) → tactful public copy.
 * Rows are processed in order and each new draft is added to the catalog
 * context, so sibling rows group as variants of one product.
 * Re-running skips rows already imported (matched by source_row name).
 */
import "dotenv/config";
import os from "node:os";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { extractDraft, narrowCatalog, type ExtractionContext } from "../src/lib/catalog/extract";
import { loadExtractionContext } from "../src/lib/catalog/catalogContext";
import { auditCopy, generatePublicCopy } from "../src/lib/catalog/copywriter";
import { computeMissingFields, EMPTY_DRAFT_FIELDS, type DraftFields } from "../src/lib/catalog/schema";
import { deterministicFields, isJunkRow, rowToUtterance, type LegacyRow } from "../src/lib/staging/xlsxRow";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const FILE = option("file") ?? path.join(os.homedir(), "Downloads", "SALE ENZO.xlsx");
const OFFLINE = flag("offline");
const DRY_RUN = flag("dry-run") || OFFLINE;
const LIMIT = Number(option("limit") ?? Infinity);
const OUT = option("out");

async function readRows(file: string): Promise<{ excelRow: number; row: LegacyRow }[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.getWorksheet("PRODUCTOS") ?? wb.worksheets[0];

  let header: string[] | null = null;
  const rows: { excelRow: number; row: LegacyRow }[] = [];
  sheet.eachRow((r, n) => {
    const values = (r.values as unknown[]).slice(1).map((v) =>
      v && typeof v === "object" && "result" in v ? (v as { result: unknown }).result : v,
    );
    if (!header) {
      // The real header is the row that names "especificaciones"
      if (values.some((v) => String(v ?? "").trim() === "especificaciones")) {
        header = values.map((v) => String(v ?? "").trim());
      }
      return;
    }
    const row = Object.fromEntries(header.map((h, i) => [h, values[i] ?? null]).filter(([h]) => h)) as LegacyRow;
    rows.push({ excelRow: n, row });
  });

  if (!header) throw new Error("Header row with 'especificaciones' not found");
  return rows;
}

/** Makes a freshly created draft visible to the next rows' segmentation. */
function addToCatalog(ctx: ExtractionContext, id: string, f: Partial<DraftFields>) {
  const variant = {
    ref: `dv:${id}`,
    size: f.size ?? null,
    gender: f.gender ?? null,
    fit: f.fit ?? null,
    color: f.main_color_hex ?? null,
    metadata: (f.metadata ?? {}) as Record<string, string>,
  };
  const parentRef = f.target_draft_id ? `dp:${f.target_draft_id}` : null;
  const parent = f.match_kind !== "new_product" && parentRef ? ctx.catalog.find((p) => p.ref === parentRef) : null;
  if (parent) {
    parent.variants.push(variant);
  } else if (f.match_kind === "new_product" && f.name) {
    ctx.catalog.push({ ref: `dp:${id}`, name: f.name, brand: f.brand ?? null, subcategory_id: f.subcategory_id ?? null, variants: [variant] });
  }
}

/** Mirrors the seed in 20260924000002_public_additions.sql, with placeholder ids. */
const OFFLINE_CONTEXT: ExtractionContext = {
  taxonomy: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Polos",
      slug: "polos",
      children: [
        { id: "00000000-0000-4000-8000-000000000002", name: "Polos manga corta", slug: "polos-manga-corta" },
        { id: "00000000-0000-4000-8000-000000000003", name: "Polos manga larga", slug: "polos-manga-larga" },
      ],
    },
  ],
  brands: ["Nike", "Under Armour", "The North Face", "Gymshark", "Puma", "Adidas", "Reebok", "New Balance", "Columbia", "Patagonia"],
  catalog: [],
};

async function main() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const db = OFFLINE
    ? null
    : createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

  const ctx = db ? await loadExtractionContext(db) : structuredClone(OFFLINE_CONTEXT);
  if (ctx.taxonomy.length === 0) {
    throw new Error("No categories with subcategories found. Run supabase/migrations first.");
  }

  const { data: existing } = db
    ? await db.schema("staging").from("product_drafts").select("source_row").eq("source", "xlsx")
    : { data: [] };
  const imported = new Set((existing ?? []).map((d) => (d.source_row as LegacyRow | null)?.name).filter(Boolean));

  const rows = (await readRows(FILE)).filter(({ row }) => !isJunkRow(row));
  console.log(`📄 ${rows.length} rows in ${path.basename(FILE)} (${imported.size} already imported)`);

  const report: Record<string, unknown>[] = [];
  let processed = 0;

  for (const { excelRow, row } of rows) {
    if (processed >= LIMIT) break;
    if (imported.has(row.name)) continue;
    processed++;

    const det = deterministicFields(row, ctx);
    const utterance = rowToUtterance(row);
    const result = await extractDraft(
      openai,
      { ...ctx, catalog: narrowCatalog(ctx.catalog, utterance) },
      { utterance, source: "xlsx", current: det },
    );

    // Deterministic values win: they have exactly one interpretation
    const fields: DraftFields = { ...EMPTY_DRAFT_FIELDS, ...result.fields, ...det };
    const warnings = [...result.warnings];

    try {
      const subcategory = ctx.taxonomy.flatMap((c) => c.children).find((s) => s.id === fields.subcategory_id);
      const copy = await generatePublicCopy(openai, { ...fields, subcategory_name: subcategory?.name });
      fields.description = copy.description;
      fields.condition_note = copy.condition_note;
      warnings.push(...auditCopy(copy, fields));
    } catch (e) {
      warnings.push(`Copy no generado: ${(e as Error).message}`);
    }

    const missing = computeMissingFields(fields);
    let id: string = randomUUID();
    let sku = "(dry-run)";

    if (!DRY_RUN && db) {
      const { data, error } = await db
        .schema("staging")
        .from("product_drafts")
        .insert({
          ...fields,
          source: "xlsx",
          status: "pending_review",
          transcript: utterance,
          source_row: row,
          ai_raw: { raw: result.raw, warnings },
          field_confidence: result.confidence,
          missing_fields: missing,
        })
        .select("id, sku")
        .single();
      if (error || !data) throw new Error(`Row ${excelRow}: ${error?.message}`);
      ({ id, sku } = data);
    }
    addToCatalog(ctx, id, fields);

    const lowConfidence = Object.entries(result.confidence)
      .filter(([, c]) => c < 0.6)
      .map(([k]) => k);

    report.push({ excelRow, sku, id, ...fields, missing, lowConfidence, warnings });
    console.log(
      [
        `#${excelRow}`.padEnd(4),
        sku.padEnd(10),
        (fields.name ?? "?").slice(0, 42).padEnd(42),
        `${fields.match_kind}${fields.target_draft_id || fields.target_product_id ? "→" + (fields.target_draft_id ?? fields.target_product_id)!.slice(0, 8) : ""}`.padEnd(22),
        `${fields.size ?? "?"} ${fields.gender ?? "?"}${fields.also_unisex ? "+U" : ""}`.padEnd(12),
        `S/${fields.price ?? "?"}`.padEnd(7),
        `${fields.defects.length}def`,
        missing.length ? `❗${missing.join(",")}` : "✓",
        lowConfidence.length ? `⚠${lowConfidence.join(",")}` : "",
      ].join(" "),
    );
    for (const w of warnings) console.log(`       ↳ ${w}`);
  }

  if (OUT) {
    await writeFile(OUT, JSON.stringify(report, null, 2), "utf8");
    console.log(`\n📝 Report written to ${OUT}`);
  }
  console.log(`\n${DRY_RUN ? "🧪 Dry run" : "✅ Imported"}: ${processed} drafts`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
