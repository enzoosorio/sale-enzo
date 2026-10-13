import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0C0C0C";
const PAPER = "#FAF9F6";

export default async function OpengraphImage() {
  const prata = await readFile(
    join(process.cwd(), "node_modules/@fontsource/prata/files/prata-latin-400-normal.woff"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: PAPER,
          color: INK,
          fontFamily: "Prata",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, textTransform: "uppercase" }}>
          Lima · Perú
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 148, lineHeight: 1 }}>{SITE_NAME}</div>
          <div style={{ display: "flex", width: 160, height: 2, background: INK, margin: "40px 0 32px" }} />
          <div style={{ display: "flex", fontSize: 44 }}>{SITE_TAGLINE}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>
          Fotos reales · Estado de cada prenda · Coordinamos por WhatsApp
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Prata", data: prata, style: "normal", weight: 400 }] },
  );
}
