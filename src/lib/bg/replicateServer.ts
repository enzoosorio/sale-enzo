/**
 * Server-side Replicate call for background removal (BiRefNet), shared by the
 * /api/admin/bg route and the eval script. Pure fetch: no framework imports.
 */
const API = "https://api.replicate.com/v1";
/** First attempt blocks this long; anything slower (cold start) is polled. */
const WAIT_SECONDS = 25;
const POLL_EVERY_MS = 1500;
const DEFAULT_DEADLINE_MS = 80_000;
const REQUEST_TIMEOUT_MS = 20_000;

interface Prediction {
  status?: string;
  output?: string | string[] | null;
  error?: string | null;
  urls?: { get?: string; cancel?: string };
}

export type ReplicateResult =
  | { ok: true; png: ArrayBuffer }
  | { ok: false; status: number; error: string };

const TERMINAL = new Set(["succeeded", "failed", "canceled"]);

/** Replicate answers HTML/plain text on gateway errors: never let r.json() throw. */
async function readPrediction(res: Response): Promise<Prediction> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Prediction;
  } catch {
    return { status: "failed", error: `Replicate ${res.status}: ${text.slice(0, 200)}` };
  }
}

export async function removeBackgroundViaReplicate(
  bytes: Uint8Array,
  contentType: string,
  opts: { token: string; version: string; deadlineMs?: number; fetchImpl?: typeof fetch },
): Promise<ReplicateResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const headers = { Authorization: `Bearer ${opts.token}` };
  const deadline = Date.now() + (opts.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const dataUri = `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;

  try {
    let prediction = await readPrediction(
      await doFetch(`${API}/predictions`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", Prefer: `wait=${WAIT_SECONDS}` },
        body: JSON.stringify({ version: opts.version, input: { image: dataUri } }),
        signal: AbortSignal.timeout(WAIT_SECONDS * 1000 + REQUEST_TIMEOUT_MS),
      }),
    );

    // Cold starts outlive the blocking wait: poll until it settles or the deadline hits.
    while (!TERMINAL.has(prediction.status ?? "") && prediction.urls?.get && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
      prediction = await readPrediction(
        await doFetch(prediction.urls.get, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
      );
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (prediction.status !== "succeeded" || !outputUrl) {
      const timedOut = !TERMINAL.has(prediction.status ?? "");
      if (timedOut && prediction.urls?.cancel) {
        // Don't keep paying for a prediction nobody is waiting for.
        void doFetch(prediction.urls.cancel, { method: "POST", headers }).catch(() => undefined);
      }
      return {
        ok: false,
        status: timedOut ? 504 : 502,
        error: timedOut ? "Replicate timed out" : (prediction.error ?? `Prediction ${prediction.status}`),
      };
    }

    const png = await doFetch(outputUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!png.ok) return { ok: false, status: 502, error: `Replicate output ${png.status}` };
    return { ok: true, png: await png.arrayBuffer() };
  } catch (e) {
    return { ok: false, status: 502, error: e instanceof Error ? e.message : "Replicate request failed" };
  }
}
