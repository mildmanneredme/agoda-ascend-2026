import { GoogleGenAI } from "@google/genai";

export const MODEL = "gemini-3-flash-preview";

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Demo-speed config: skip thinking so responses land in ~1s on conference wifi. */
export const FAST = { thinkingConfig: { thinkingBudget: 0 } };
