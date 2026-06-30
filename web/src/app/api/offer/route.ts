import { Type } from "@google/genai";
import { gemini, MODEL, FAST } from "@/lib/gemini";
import { rateLimit } from "@/lib/rateLimit";
import { ATTRIBUTES, HOTEL, hotelBrief } from "@/lib/hotel";

export const maxDuration = 30;

const schema = {
  type: Type.OBJECT,
  properties: {
    bundleName: { type: Type.STRING, description: "2-3 word bundle name ending in 'Bundle', e.g. 'Productivity Bundle'" },
    tagline: { type: Type.STRING, description: "One short line selling the bundle to this specific guest" },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Attribute id from the catalogue, verbatim" },
          why: { type: Type.STRING, description: "Max 9 words: why this guest specifically" },
        },
        required: ["id", "why"],
      },
    },
  },
  required: ["bundleName", "tagline", "items"],
};

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { guestName, persona } = await req.json();

  const prompt = `You are the agentic booking engine of ${HOTEL.name}.

${hotelBrief()}

A guest is booking a ${HOTEL.baseRoom.name} (base $${HOTEL.baseRoom.price}/night).
Guest name: ${guestName}
Guest persona: ${persona}

Compose a personalised attribute bundle for this guest: pick exactly 4 or 5 attribute ids from the catalogue that best fit the persona. Choose a sharp bundle name and tagline addressed to this guest. Each "why" must be specific to the persona, not generic.`;

  try {
    const t0 = Date.now();
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        ...FAST,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.9,
      },
    });
    const latencyMs = Date.now() - t0;

    const parsed = JSON.parse(res.text ?? "{}") as {
      bundleName: string;
      tagline: string;
      items: Array<{ id: string; why: string }>;
    };

    // Price server-side from the catalogue — the model never does arithmetic.
    const items = parsed.items
      .map((item) => {
        const attr = ATTRIBUTES.find((a) => a.id === item.id);
        return attr ? { id: attr.id, label: attr.label, price: attr.price, why: item.why } : null;
      })
      .filter(Boolean) as Array<{ id: string; label: string; price: number; why: string }>;

    const base = HOTEL.baseRoom.price;
    const total = base + items.reduce((sum, i) => sum + i.price, 0);

    return Response.json({
      bundleName: parsed.bundleName,
      tagline: parsed.tagline,
      base,
      items,
      total,
      liftPct: Math.round(((total - base) / base) * 100),
      _debug: { prompt, rawResponse: res.text ?? "", model: MODEL, latencyMs },
    });
  } catch (err) {
    console.error("offer route failed", err);
    return Response.json({ error: "The booking engine is busy — try again." }, { status: 502 });
  }
}
