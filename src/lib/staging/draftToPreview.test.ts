import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT_FIELDS } from "@/lib/catalog/schema";
import type { DraftImageRow, DraftRow } from "@/types/staging";
import { draftToCard, draftToDetail, marketplaceText, orderedDoneImages, publicVariantMetadata } from "./draftToPreview";

const draft: DraftRow = {
  ...EMPTY_DRAFT_FIELDS,
  id: "d1",
  sku: "SE-0007",
  status: "pending_review",
  source: "xlsx",
  transcript: null,
  ai_raw: null,
  source_row: null,
  missing_fields: [],
  field_confidence: {},
  published_product_id: null,
  published_variant_id: null,
  published_item_id: null,
  published_at: null,
  created_at: "2026-09-24",
  updated_at: "2026-09-24",
  name: "Polo Nike Chicago Bulls Durant 35 naranja",
  brand: "Nike",
  size: "M",
  also_unisex: true,
  fits_like_min: "XS",
  fits_like_max: "S",
  metadata: { team: "Chicago Bulls", player: "Kevin Durant" },
  condition_score: 8,
  condition_note: "Buen estado, con una marca leve apenas visible.",
  price: 39,
  compare_at_price: 49,
  defects: [{ type: "stain", zone: "pecho", severity: "mild", note: null }],
  specs_raw: "secreto",
};

const img = (id: string, position: number, is_main: boolean, status: DraftImageRow["status"] = "done"): DraftImageRow => ({
  id,
  draft_id: "d1",
  position,
  is_main,
  original_key: `originals/polos/SE-0007/${position}.jpg`,
  cutout_key: `cutout/polos/SE-0007/${position}.webp`,
  cutout_web_key: `web/polos/SE-0007/${position}.webp`,
  width: 1,
  height: 1,
  bytes_original: 1,
  bytes_cutout: 1,
  bytes_web: 1,
  dominant_colors: [],
  status,
  error: null,
  created_at: "",
  updated_at: "",
});

const url = (k: string | null) => (k ? `https://m.test/${k}` : null);

describe("draftToPreview", () => {
  const images = [img("a", 1, false), img("b", 2, true), img("c", 3, false, "failed")];

  it("main image first, failed ones excluded", () => {
    expect(orderedDoneImages(images).map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("card uses the main web cutout", () => {
    const card = draftToCard(draft, images, url);
    expect(card.variant.main_img_url).toBe("https://m.test/web/polos/SE-0007/2.webp");
    expect(card.item.price).toBe(39);
  });

  it("detail never exposes private fields", () => {
    const detail = draftToDetail(draft, images, url);
    const json = JSON.stringify(detail);
    expect(json).not.toContain("secreto");
    expect(json).not.toContain("stain");
    expect(detail.fitsLike).toBe("XS–S");
    expect(detail.images).toHaveLength(2);
  });

  it("public metadata adds fit hints but never defects", () => {
    expect(publicVariantMetadata(draft)).toEqual({
      team: "Chicago Bulls",
      player: "Kevin Durant",
      also_unisex: "true",
      fits_like_min: "XS",
      fits_like_max: "S",
    });
  });

  it("marketplace text", () => {
    const text = marketplaceText(draft);
    expect(text).toContain("S/ 39 (antes S/ 49)");
    expect(text).toContain("Ref: SE-0007");
    expect(text).not.toContain("secreto");
  });
});
