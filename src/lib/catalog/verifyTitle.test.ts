import { beforeEach, describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { clearVerifyCache, collectSources, verifyTitle } from "./verifyTitle";

const payload = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    matched: true,
    canonical_name: "Nike Air Zoom Pegasus 40",
    summary: "Zapatilla de running de Nike.",
    specs: { material: "mesh", technology: "Air Zoom", fit: null, release_year: "2023" },
    confidence: 0.9,
    ...over,
  });

const response = (text: string, urls: { url: string; title?: string }[] = []) =>
  ({
    output_text: text,
    output: [
      { type: "web_search_call", id: "ws_1", status: "completed" },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text,
            annotations: urls.map((u) => ({ type: "url_citation", title: u.title ?? "", url: u.url, start_index: 0, end_index: 1 })),
          },
        ],
      },
    ],
  }) as unknown as OpenAI.Responses.Response;

const clientReturning = (res: OpenAI.Responses.Response) => {
  const create = vi.fn().mockResolvedValue(res);
  return { client: { responses: { create } } as unknown as OpenAI, create };
};

describe("verifyTitle", () => {
  beforeEach(() => clearVerifyCache());

  it("returns a match with sources taken from the citations only", async () => {
    const { client, create } = clientReturning(
      response(payload({ summary: "ver https://inventado.example" }), [
        { url: "https://www.nike.com/pegasus-40", title: "Nike" },
        { url: "https://www.nike.com/pegasus-40", title: "duplicado" },
        { url: "javascript:alert(1)" },
      ]),
    );

    const res = await verifyTitle(client, { name: "Nike Air Zoom Pegasus 40", brand: "Nike" }, "test-model");

    expect(res.matched).toBe(true);
    expect(res.canonical_name).toBe("Nike Air Zoom Pegasus 40");
    expect(res.specs.technology).toBe("Air Zoom");
    expect(res.sources).toEqual([{ title: "Nike", url: "https://www.nike.com/pegasus-40" }]);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        tools: [expect.objectContaining({ type: "web_search" })],
        text: { format: expect.objectContaining({ type: "json_schema", strict: true }) },
      }),
    );
  });

  it("reports a generic title as not matched", async () => {
    const { client } = clientReturning(
      response(payload({ matched: false, canonical_name: null, confidence: 0.2, summary: "Nombre genérico." })),
    );
    const res = await verifyTitle(client, { name: "Polo Nike azul", brand: "Nike" });
    expect(res.matched).toBe(false);
    expect(res.canonical_name).toBeNull();
  });

  it("downgrades a match that has no citations behind it", async () => {
    const { client } = clientReturning(response(payload()));
    const res = await verifyTitle(client, { name: "Algo raro 9000" });
    expect(res.matched).toBe(false);
    expect(res.canonical_name).toBeNull();
    expect(res.confidence).toBeLessThanOrEqual(0.3);
  });

  it("caches by normalized brand + name", async () => {
    const { client, create } = clientReturning(response(payload(), [{ url: "https://www.nike.com/x" }]));
    await verifyTitle(client, { name: "Nike  Pegasus 40", brand: "Nike" });
    await verifyTitle(client, { name: "nike pegasus 40", brand: "NIKE" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("throws when the model returns nothing", async () => {
    const { client } = clientReturning(response(""));
    await expect(verifyTitle(client, { name: "Nike Pegasus" })).rejects.toThrow(/no content/);
  });
});

describe("collectSources", () => {
  it("caps the list and ignores non-message output", () => {
    const urls = Array.from({ length: 8 }, (_, i) => ({ url: `https://e.com/${i}` }));
    expect(collectSources(response("{}", urls))).toHaveLength(5);
  });
});
