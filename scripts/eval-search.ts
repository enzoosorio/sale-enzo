import { createHash } from "node:crypto";

const uuid = (index: number) => {
  const hex = createHash("md5").update(`sale-enzo:product:${index}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const cases: [string, number[]][] = [
  ["polo para correr", [1, 2, 3, 4, 5]],
  ["camiseta ligera running", [1, 2, 3, 4, 5]],
  ["polo selección Perú", [6, 7, 8, 9, 10]],
  ["camiseta fútbol selección", [6, 7, 8, 9, 10]],
  ["polera Gymshark", [11, 12, 13, 14, 15]],
  ["hoodie gymsh", [11, 12, 13, 14, 15]],
  ["casaca para lluvia", [16, 17, 18, 19, 20]],
  ["chaqueta impermeable outdoor", [16, 17, 18, 19, 20]],
  ["short para correr", [21, 22, 23, 24, 25]],
  ["short running ligero", [21, 22, 23, 24, 25]],
  ["pantalón jogger gym", [26, 27, 28, 29, 30]],
  ["jogger entrenamiento", [26, 27, 28, 29, 30]],
  ["zapatillas running", [31, 32, 33, 34, 35]],
  ["tenis para correr", [31, 32, 33, 34, 35]],
  ["mochila senderismo", [36, 37, 38, 39, 40]],
];

async function main() {
const endpoint = new URL("/api/search", process.env.SEARCH_EVAL_URL ?? "http://localhost:3000");
const latencies: number[] = [];
let hits = 0;
for (const [query, expectedNumbers] of cases) {
  const expected = new Set(expectedNumbers.map(uuid));
  const started = performance.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 5 }),
  });
  const elapsed = performance.now() - started;
  if (!response.ok) throw new Error(`${query}: HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json() as {
    success: boolean;
    data: { products: { id: string }[]; mode: string; took_ms: number };
  };
  if (!payload.success) throw new Error(`${query}: unsuccessful response`);
  const hitCount = payload.data.products.slice(0, 5).filter((product) => expected.has(product.id)).length;
  hits += hitCount;
  latencies.push(elapsed);
  console.log(`${query.padEnd(32)} ${hitCount}/5  ${elapsed.toFixed(0)} ms  ${payload.data.mode}`);
}

latencies.sort((a, b) => a - b);
const precision = hits / (cases.length * 5);
const p50 = latencies[Math.floor(latencies.length / 2)];
console.log(`Precision@5: ${(precision * 100).toFixed(1)}%; p50 end-to-end: ${p50.toFixed(0)} ms`);
if (precision < 0.8 || p50 >= 500) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
