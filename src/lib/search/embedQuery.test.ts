import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/openai", () => ({ openai: () => ({ embeddings: { create } }) }));

import { clearQueryEmbeddingCache, embedQuery, normalizeSearchQuery } from "./embedQuery";

beforeEach(() => {
  clearQueryEmbeddingCache();
  create.mockReset();
  create.mockResolvedValue({ data: [{ embedding: Array(1536).fill(0.1) }] });
});

describe("query embeddings", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeSearchQuery("  POLO   Para\tCORRER  ")).toBe("polo para correr");
  });

  it("reuses the normalized query embedding", async () => {
    await embedQuery("  POLO  para correr ");
    await embedQuery("polo para correr");
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ input: "polo para correr" }));
  });

  it("evicts the oldest entry after 500 queries", async () => {
    for (let index = 0; index < 501; index++) await embedQuery(`consulta ${index}`);
    await embedQuery("consulta 0");
    expect(create).toHaveBeenCalledTimes(502);
  });

  it("removes a failed embedding from the cache", async () => {
    create.mockRejectedValueOnce(new Error("unavailable"));
    await expect(embedQuery("fallo")).rejects.toThrow("unavailable");
    await embedQuery("fallo");
    expect(create).toHaveBeenCalledTimes(2);
  });
});
