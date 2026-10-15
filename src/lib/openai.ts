import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export function visionModel(): string {
  return process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
}

/** Model for the web_search title check; falls back to the chat model. */
export function webModel(): string {
  return process.env.OPENAI_WEB_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
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
