import { describe, expect, it } from "vitest";
import { ironBlockReason, MAX_IRON_GENERATIONS, STALE_PENDING_MS } from "./rules";

const now = Date.parse("2026-10-12T12:00:00Z");
const image = (over: Partial<Parameters<typeof ironBlockReason>[0]> = {}) => ({
  shot_role: "front" as const,
  status: "done" as const,
  original_key: "originals/polos/SE-0001/1.jpg",
  ironed_status: "none" as const,
  ironed_version: 0,
  updated_at: new Date(now - 1000).toISOString(),
  ...over,
});

describe("ironBlockReason", () => {
  it("allows a finished, non-defect photo", () => {
    expect(ironBlockReason(image(), now)).toBeNull();
    expect(ironBlockReason(image({ shot_role: null, ironed_status: "rejected", ironed_version: 1 }), now)).toBeNull();
  });

  it("never irons defect photos", () => {
    expect(ironBlockReason(image({ shot_role: "defect" }), now)).toMatch(/defectos/);
  });

  it("needs a processed photo", () => {
    expect(ironBlockReason(image({ status: "processing" }), now)).toMatch(/procesarse/);
    expect(ironBlockReason(image({ original_key: null }), now)).toMatch(/procesarse/);
  });

  it("blocks while running, but not once the attempt is stale", () => {
    expect(ironBlockReason(image({ ironed_status: "pending", ironed_version: 1 }), now)).toMatch(/Ya se está planchando/);
    const stale = new Date(now - STALE_PENDING_MS - 1).toISOString();
    expect(ironBlockReason(image({ ironed_status: "pending", ironed_version: 1, updated_at: stale }), now)).toBeNull();
  });

  it("caps paid generations", () => {
    expect(ironBlockReason(image({ ironed_version: MAX_IRON_GENERATIONS }), now)).toMatch(/generaciones/);
  });
});
