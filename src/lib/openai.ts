import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/** Fixed domain vocabulary that speech-to-text tends to mangle. */
export const STT_VOCABULARY = [
  "Dri-FIT",
  "HeatGear",
  "ColdGear",
  "Gymshark",
  "The North Face",
  "Under Armour",
  "oversize",
  "boxy",
  "slim fit",
  "manga corta",
  "manga larga",
  "unisex",
];
