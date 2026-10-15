/**
 * Side-by-side evaluation of the photo providers on YOUR garments, before paying for any of them.
 *
 *   npm run photos:eval -- [--dir scripts/fixtures/photos] [--out scripts/fixtures/out] [--only bg|iron] [--limit 20]
 *
 * Put ~20 representative photos (wrinkled, same-color-as-background, prints, labels, shoes…)
 * in the input folder. For each one it runs, when its key is configured:
 *   - background removal: Replicate (BiRefNet), scored by the same quality gate the app uses
 *   - ironing: Gemini and PhotoRoom (a sandbox key is free but watermarked), with the same
 *     palette tripwire the app uses
 * and writes report.html next to the outputs so you can compare them by eye.
 * The on-device model (imgly) runs in the browser, so judge it by capturing the same photos
 * in the app; the gate verdicts shown there use the exact same rules.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import sharp from "sharp";
import { removeBackgroundViaReplicate } from "../src/lib/bg/replicateServer";
import { assessCutout, dominantColors } from "../src/lib/capture/imageOps";
import { compareIroned } from "../src/lib/capture/ironCheck";
import { geminiProvider } from "../src/lib/retouch/gemini";
import { photoroomProvider } from "../src/lib/retouch/photoroom";
import type { RetouchProvider } from "../src/lib/retouch/types";

config({ path: ".env.local" });
config({ path: ".env" });

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const dir = arg("dir", "scripts/fixtures/photos") as string;
const outDir = arg("out", "scripts/fixtures/out") as string;
const only = arg("only");
const limit = Number(arg("limit", "50"));

/** What one call costs (USD), per provider docs at the time of writing: verify before budgeting. */
const COST = { replicate: "≈ 0.001–0.05", gemini: "≈ 0.034", photoroom: "0.10" } as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

interface Cell {
  file?: string;
  ms?: number;
  note?: string;
  error?: string;
}

async function rgba(buffer: Buffer, side: number) {
  const { data, info } = await sharp(buffer)
    .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

async function evalBackground(name: string, input: Buffer): Promise<Cell> {
  const token = process.env.REPLICATE_API_TOKEN;
  const version = process.env.REPLICATE_BG_VERSION;
  if (!token || !version) return { error: "REPLICATE_API_TOKEN / REPLICATE_BG_VERSION not set" };

  const jpeg = await sharp(input).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  const started = performance.now();
  const res = await removeBackgroundViaReplicate(new Uint8Array(jpeg), "image/jpeg", { token, version });
  const ms = Math.round(performance.now() - started);
  if (!res.ok) return { error: res.error, ms };

  const png = Buffer.from(res.png);
  const file = `${name}.bg-replicate.png`;
  await writeFile(path.join(outDir, file), png);
  const { data, width, height } = await rgba(png, 512);
  const q = assessCutout(data, width, height);
  return { file, ms, note: `${q.verdict}${q.reasons.length ? ` (${q.reasons.join(", ")})` : ""} · cobertura ${(q.coverage * 100).toFixed(0)}%` };
}

async function evalIron(name: string, input: Buffer, provider: RetouchProvider): Promise<Cell> {
  const jpeg = await sharp(input).rotate().resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  const started = performance.now();
  try {
    const out = await provider.iron({ bytes: new Uint8Array(jpeg), mime: "image/jpeg" });
    const ms = Math.round(performance.now() - started);
    const outJpeg = await sharp(out.bytes).jpeg({ quality: 92 }).toBuffer();
    const file = `${name}.iron-${provider.name}.jpg`;
    await writeFile(path.join(outDir, file), outJpeg);

    const [a, b] = await Promise.all([rgba(jpeg, 96), rgba(outJpeg, 96)]);
    const meta = await sharp(outJpeg).metadata();
    const check = compareIroned(
      { width: a.width, height: a.height, colors: dominantColors(a.data) },
      { width: meta.width ?? b.width, height: meta.height ?? b.height, colors: dominantColors(b.data) },
    );
    return { file, ms, note: `${check.verdict}${check.reasons.length ? ` (${check.reasons.join(", ")})` : ""} · paleta Δ${(check.paletteShift * 100).toFixed(0)}%` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), ms: Math.round(performance.now() - started) };
  }
}

const cellHtml = (c: Cell | undefined) =>
  !c
    ? "<td></td>"
    : `<td>${c.file ? `<img src="${esc(c.file)}" loading="lazy">` : ""}${c.error ? `<p class="err">${esc(c.error)}</p>` : ""}<p>${c.ms !== undefined ? `${c.ms} ms` : ""}${c.note ? ` · ${esc(c.note)}` : ""}</p></td>`;

async function main() {
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).slice(0, limit);
  if (files.length === 0) throw new Error(`No photos found in ${dir}. Add some .jpg/.png/.webp files and run again.`);

  const irons: RetouchProvider[] = [];
  if (process.env.GEMINI_API_KEY) irons.push(geminiProvider());
  if (process.env.PHOTOROOM_API_KEY) irons.push(photoroomProvider());
  if (only !== "bg" && irons.length === 0) console.warn("No GEMINI_API_KEY / PHOTOROOM_API_KEY: skipping the ironing comparison.");

  const rows: { name: string; original: string; bg?: Cell; iron: Record<string, Cell> }[] = [];
  for (const file of files) {
    const name = path.parse(file).name;
    const input = await readFile(path.join(dir, file));
    await writeFile(path.join(outDir, `${name}.original.jpg`), await sharp(input).rotate().resize({ width: 900, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer());
    console.log(`▶ ${file}`);

    const row: (typeof rows)[number] = { name, original: `${name}.original.jpg`, iron: {} };
    if (only !== "iron") row.bg = await evalBackground(name, input);
    if (only !== "bg") for (const p of irons) row.iron[p.name] = await evalIron(name, input, p);
    rows.push(row);
  }

  const ironNames = irons.map((p) => p.name);
  const html = `<!doctype html><meta charset="utf-8"><title>Photo providers</title>
<style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;vertical-align:top}img{width:260px;display:block;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px}.err{color:#b91c1c}p{margin:4px 0;max-width:260px;font-size:12px;color:#444}</style>
<h1>Photo providers</h1>
<p>Costo aprox. por llamada (USD): Replicate ${COST.replicate} · Gemini ${COST.gemini} · PhotoRoom ${COST.photoroom}. Confirma los precios vigentes antes de presupuestar.</p>
<table><tr><th>Foto</th><th>Original</th>${only !== "iron" ? "<th>Recorte · Replicate BiRefNet</th>" : ""}${only !== "bg" ? ironNames.map((n) => `<th>Planchada · ${n}</th>`).join("") : ""}</tr>
${rows.map((r) => `<tr><td>${esc(r.name)}</td><td><img src="${esc(r.original)}"></td>${only !== "iron" ? cellHtml(r.bg) : ""}${only !== "bg" ? ironNames.map((n) => cellHtml(r.iron[n])).join("") : ""}</tr>`).join("\n")}
</table>`;
  const report = path.join(outDir, "report.html");
  await writeFile(report, html);
  console.log(`\nListo: abre ${report}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
