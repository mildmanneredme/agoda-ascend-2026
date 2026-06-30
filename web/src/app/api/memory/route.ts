import { Type } from "@google/genai";
import { gemini, MODEL, FAST } from "@/lib/gemini";
import { rateLimit } from "@/lib/rateLimit";
import { HOTEL, hotelBrief } from "@/lib/hotel";

export const maxDuration = 30;

const schema = {
  type: Type.OBJECT,
  properties: {
    greeting: { type: Type.STRING, description: "One warm line welcoming the guest by name, max 12 words" },
    tier: { type: Type.STRING, description: "An evocative 2-word loyalty tier name for this guest" },
    preferences: {
      type: Type.ARRAY,
      description: "Exactly 4 inferred preferences",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Short preference, max 6 words, e.g. 'Quiet rooms, high floors'" },
          confidence: { type: Type.INTEGER, description: "Confidence 55-98" },
          signal: { type: Type.STRING, description: "The single observed (simulated) behaviour signal this is inferred from, phrased as a concrete event at a sister property or this stay, max 16 words" },
          reasoning: { type: Type.STRING, description: "Plain-language explanation of the inference, max 25 words, transparent and non-creepy" },
          action: { type: Type.STRING, description: "What the hotel has already done about it, max 14 words" },
        },
        required: ["label", "confidence", "signal", "reasoning", "action"],
      },
    },
  },
  required: ["greeting", "tier", "preferences"],
};

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { guestName, travelStyle, brief, signals } = await req.json();

  const context = brief
    ? `Guest: ${guestName}. Declared preference: "${travelStyle}".\nKnown profile: ${brief}\nObserved signals on file:\n${(signals ?? []).map((s: string) => `- ${s}`).join("\n")}`
    : `Guest: ${guestName}. Their one declared preference at signup: "${travelStyle}". No prior stay history is on file.`;

  const prompt = `You are the Guest Memory & Preference Engine of ${HOTEL.name}.

${hotelBrief()}

${context}

Build their inferred preference profile. The first preference should map directly to their declared preference. ${
    signals?.length
      ? "Ground the other inferences in the observed signals above — each preference's signal field should reference real on-file behaviour."
      : "The other three are plausible inferences from simulated past behaviour (sister properties in Lisbon, Tokyo, or Singapore; app interactions; dining or spa history)."
  } Signals must be concrete and specific ("ordered room service after 22:00 on 3 of 4 nights in Tokyo"), never vague. Reasoning must be transparent enough that an executive sees exactly how AI connects signal to preference. Actions show the hotel acting before being asked. Address a sophisticated guest — warm, never creepy.`;

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
    const payload = { ...JSON.parse(res.text ?? "{}"), _debug: { prompt, rawResponse: res.text ?? "", model: MODEL, latencyMs } };
    return Response.json(payload);
  } catch (err) {
    console.error("memory route failed", err);
    return Response.json({ error: "The memory engine is busy — try again." }, { status: 502 });
  }
}
