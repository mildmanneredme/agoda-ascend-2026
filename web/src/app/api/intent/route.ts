import { Type } from "@google/genai";
import { gemini, MODEL, FAST } from "@/lib/gemini";
import { HOTEL, hotelBrief } from "@/lib/hotel";

export const maxDuration = 30;

const schema = {
  type: Type.OBJECT,
  properties: {
    language: { type: Type.STRING, description: "The detected language name in English, e.g. 'Thai'" },
    languageNative: { type: Type.STRING, description: "The language's name in its own script, e.g. 'ไทย'" },
    flag: { type: Type.STRING, description: "A single flag emoji representing the language's most common region" },
    intent: { type: Type.STRING, description: "The guest's core intent in a short English phrase, max 8 words" },
    urgency: { type: Type.STRING, enum: ["routine", "soon", "urgent"] },
    routedTo: { type: Type.STRING, description: "The department that should handle this, e.g. 'Housekeeping'" },
    entities: {
      type: Type.ARRAY,
      description: "Structured details extracted from the message",
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING, description: "Field name, e.g. 'time', 'item', 'room'" },
          value: { type: Type.STRING, description: "Extracted value" },
        },
        required: ["key", "value"],
      },
    },
    replyNative: { type: Type.STRING, description: "The reply to the guest, written in their own language, warm and specific, max 45 words" },
    replyEnglish: { type: Type.STRING, description: "An English translation of the reply, for staff" },
  },
  required: ["language", "languageNative", "flag", "intent", "urgency", "routedTo", "entities", "replyNative", "replyEnglish"],
};

export async function POST(req: Request) {
  const { message } = await req.json();

  const prompt = `You are the Multilingual Intent Engine of ${HOTEL.name}. A guest has messaged in their own language. Detect the language, extract their intent and the structured details, route it to the right department, and write a reply IN THE GUEST'S OWN LANGUAGE — then provide an English translation for staff. Ground any facility references in the hotel's real details below. Be natural and native in the reply, never machine-translated in tone.

${hotelBrief()}

GUEST MESSAGE:
"""
${message}
"""`;

  try {
    const t0 = Date.now();
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { ...FAST, responseMimeType: "application/json", responseSchema: schema, temperature: 0.6 },
    });
    const latencyMs = Date.now() - t0;
    return Response.json({
      ...JSON.parse(res.text ?? "{}"),
      _debug: { prompt, rawResponse: res.text ?? "", model: MODEL, latencyMs },
    });
  } catch (err) {
    console.error("intent route failed", err);
    return Response.json({ error: "The language engine is busy — try again." }, { status: 502 });
  }
}
