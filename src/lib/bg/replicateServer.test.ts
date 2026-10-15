import { describe, expect, it, vi } from "vitest";
import { removeBackgroundViaReplicate } from "./replicateServer";

const opts = { token: "t", version: "v" };
const bytes = new Uint8Array([1, 2, 3]);

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const png = () => new Response(new Uint8Array([137, 80]), { headers: { "content-type": "image/png" } });

describe("removeBackgroundViaReplicate", () => {
  it("returns the PNG when the first blocking call already succeeded", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ status: "succeeded", output: "https://r/out.png" })).mockResolvedValueOnce(png());
    const res = await removeBackgroundViaReplicate(bytes, "image/jpeg", { ...opts, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(res).toMatchObject({ ok: true });
    expect(fetchImpl.mock.calls[0][1].headers.Prefer).toMatch(/^wait=/);
    // The image travels as a data URI in the prediction input.
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).input.image).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("polls a cold start until it settles instead of failing at the first wait", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(json({ status: "starting", urls: { get: "https://r/get/1", cancel: "https://r/cancel/1" } }))
        .mockResolvedValueOnce(json({ status: "processing", urls: { get: "https://r/get/1" } }))
        .mockResolvedValueOnce(json({ status: "succeeded", output: ["https://r/out.png"] }))
        .mockResolvedValueOnce(png());
      const pending = removeBackgroundViaReplicate(bytes, "image/jpeg", { ...opts, fetchImpl: fetchImpl as unknown as typeof fetch });
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toMatchObject({ ok: true });
      expect(fetchImpl).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up at the deadline with a 504 and cancels the prediction", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockImplementation(async () => json({ status: "processing", urls: { get: "https://r/get/1", cancel: "https://r/cancel/1" } }));
      const pending = removeBackgroundViaReplicate(bytes, "image/jpeg", { ...opts, deadlineMs: 4000, fetchImpl: fetchImpl as unknown as typeof fetch });
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await pending).toEqual({ ok: false, status: 504, error: "Replicate timed out" });
      expect(fetchImpl.mock.calls.some(([url, init]) => url === "https://r/cancel/1" && init?.method === "POST")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("survives non-JSON gateway errors and failed predictions", async () => {
    const html = vi.fn().mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
    const a = await removeBackgroundViaReplicate(bytes, "image/jpeg", { ...opts, fetchImpl: html as unknown as typeof fetch });
    expect(a).toMatchObject({ ok: false, status: 502 });

    const failed = vi.fn().mockResolvedValue(json({ status: "failed", error: "NSFW" }));
    expect(await removeBackgroundViaReplicate(bytes, "image/jpeg", { ...opts, fetchImpl: failed as unknown as typeof fetch })).toEqual({
      ok: false,
      status: 502,
      error: "NSFW",
    });
  });
});
