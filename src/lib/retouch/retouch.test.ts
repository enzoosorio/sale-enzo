import { describe, expect, it, vi } from "vitest";
import { findImagePayload, geminiProvider, IRON_PROMPT } from "./gemini";
import { photoroomProvider } from "./photoroom";
import { RetouchError } from "./types";

const input = { bytes: new Uint8Array([1, 2, 3]), mime: "image/jpeg" };
const b64 = Buffer.from("x".repeat(300)).toString("base64");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("findImagePayload", () => {
  it("finds the image wherever the response nests it", () => {
    expect(findImagePayload({ output_image: { type: "image", data: b64, mime_type: "image/png" } })).toEqual({ data: b64, mime: "image/png" });
    expect(findImagePayload({ steps: [{ type: "model_output", content: [{ type: "text", text: "hi" }, { type: "image", data: b64 }] }] })).toEqual({
      data: b64,
      mime: "image/jpeg",
    });
  });

  it("ignores short strings and non-images", () => {
    expect(findImagePayload({ steps: [{ content: [{ type: "text", data: b64 }] }] })).toBeNull();
    expect(findImagePayload({ output_image: { type: "image", data: "abc" } })).toBeNull();
    expect(findImagePayload(null)).toBeNull();
  });
});

describe("geminiProvider", () => {
  it("sends the guarded prompt plus the image and returns the edited bytes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ steps: [{ content: [{ type: "image", data: b64, mime_type: "image/png" }] }] }));
    const out = await geminiProvider("key", "test-model", fetchImpl as unknown as typeof fetch).iron(input);

    expect(out.mime).toBe("image/png");
    expect(out.bytes.byteLength).toBe(300);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/v1beta/interactions");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.input[0].text).toBe(IRON_PROMPT);
    expect(body.input[1]).toMatchObject({ type: "image", mime_type: "image/jpeg", data: Buffer.from(input.bytes).toString("base64") });
  });

  it("tells the model not to hide real wear", () => {
    expect(IRON_PROMPT).toMatch(/Do NOT repair, hide or soften stains, holes/);
  });

  it("fails clearly when unconfigured, on HTTP errors and when no image comes back", async () => {
    await expect(geminiProvider("", "m").iron(input)).rejects.toMatchObject({ status: 501 });
    const http = vi.fn().mockResolvedValue(new Response("quota", { status: 429 }));
    await expect(geminiProvider("k", "m", http as unknown as typeof fetch).iron(input)).rejects.toMatchObject({ status: 429 });
    const none = vi.fn().mockResolvedValue(json({ steps: [{ content: [{ type: "text", text: "no" }] }] }));
    await expect(geminiProvider("k", "m", none as unknown as typeof fetch).iron(input)).rejects.toBeInstanceOf(RetouchError);
  });
});

describe("photoroomProvider", () => {
  it("asks for ironing without removing the background", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(new Uint8Array([9, 9]), { headers: { "content-type": "image/png" } }));
    const out = await photoroomProvider("pr-key", fetchImpl as unknown as typeof fetch).iron(input);

    expect(out).toEqual({ bytes: new Uint8Array([9, 9]), mime: "image/png" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://image-api.photoroom.com/v2/edit");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("pr-key");
    const form = init.body as FormData;
    expect(form.get("ironing.mode")).toBe("ai.auto");
    expect(form.get("removeBackground")).toBe("false");
    expect(form.get("imageFile")).toBeInstanceOf(Blob);
  });

  it("surfaces provider errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 402 }));
    await expect(photoroomProvider("k", fetchImpl as unknown as typeof fetch).iron(input)).rejects.toMatchObject({ status: 402 });
    await expect(photoroomProvider("").iron(input)).rejects.toMatchObject({ status: 501 });
  });
});
