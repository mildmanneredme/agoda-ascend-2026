import { Type } from "@google/genai";
import { gemini, MODEL, FAST } from "@/lib/gemini";
import { HOTEL, hotelBrief } from "@/lib/hotel";
import { guestById } from "@/lib/careRadar";
import { personaById } from "@/lib/personas";

export const maxDuration = 30;

const schema = {
  type: Type.OBJECT,
  properties: {
    emotion: { type: Type.STRING, description: "The guest's dominant emotional state in one word, e.g. 'Grief', 'Anxiety', 'Joy'" },
    intensity: { type: Type.NUMBER, description: "How strongly they're feeling it, 0–100" },
    occasion: { type: Type.STRING, description: "The occasion or situation behind the stay, max 10 words" },
    unspokenNeed: { type: Type.STRING, description: "What this guest actually needs but has not asked for, max 20 words" },
    evidence: {
      type: Type.ARRAY,
      description: "The 2–4 interaction signals that most reveal the guest's state",
      items: {
        type: Type.OBJECT,
        properties: {
          signal: { type: Type.STRING, description: "A short paraphrase of the telling interaction, max 14 words" },
          reads: { type: Type.STRING, description: "What it reveals about how they feel, max 16 words" },
        },
        required: ["signal", "reads"],
      },
    },
    careBrief: { type: Type.STRING, description: "For staff: what's really going on and how to show up for this guest. 2–3 warm, specific sentences." },
    doNow: { type: Type.ARRAY, description: "2–4 tasteful, specific gestures staff should do now", items: { type: Type.STRING } },
    restraint: { type: Type.ARRAY, description: "1–3 things staff should deliberately NOT do right now, e.g. 'No upselling tonight'", items: { type: Type.STRING } },
    guestReply: { type: Type.STRING, description: "A warm, calibrated line a staff member could say or send to this guest, max 40 words. Match their emotional register — never a templated greeting. If the guest's interactions are in a non-English language, write this line in THAT language so staff can say it back to them." },
    language: { type: Type.STRING, description: "The English name of the language the guest is communicating in, e.g. 'Thai', 'Japanese', 'Spanish'. Use 'English' if they are writing in English." },
    flag: { type: Type.STRING, description: "A single emoji flag for that language's most likely country, e.g. '🇹🇭' for Thai, '🇯🇵' for Japanese. Empty string if English." },
    sensitivityFlag: { type: Type.BOOLEAN, description: "True if this guest is in a sensitive situation that all staff should be briefed on (grief, illness, distress)" },
  },
  required: ["emotion", "intensity", "occasion", "unspokenNeed", "evidence", "careBrief", "doNow", "restraint", "guestReply", "language", "flag", "sensitivityFlag"],
};

export async function POST(req: Request) {
  const { guestId } = await req.json();
  const guest = guestById(guestId);
  if (!guest) {
    return Response.json({ error: "Unknown guest." }, { status: 404 });
  }

  const persona = guest.personaId ? personaById(guest.personaId) : undefined;
  const interactions = guest.interactions
    .map((i) => `• [${i.channel} · ${i.time}] ${i.text}`)
    .join("\n");

  const prompt = `You are the Care Radar of ${HOTEL.name} — the empathy layer the staff rely on. You read the human state behind a guest's stay and tell the team how to show up. Empathy is perception + restraint + the right gesture: sometimes the most caring move is to suppress an upsell, protect someone's privacy, or simply leave them be.

Read the interaction history below. Infer the guest's true emotional state and the unspoken need, then write a care brief for staff: what's really going on, what to do now, and — just as importantly — what NOT to do. Be specific to THIS guest and ground every gesture in what ${HOTEL.name} actually offers. Calibrate the tone of the suggested reply to their emotional register; never sound templated.

Detect the language the guest is communicating in. Report it in "language"/"flag". If it is NOT English, write the "guestReply" line in that same language so staff can deliver it word-for-word; everything else (care brief, gestures) stays in English for the team.

${hotelBrief()}

GUEST: ${guest.name} · Room ${guest.room} · ${guest.party} · ${guest.nights}
SITUATION (seeded): ${guest.occasion}. Front-desk read: ${guest.emotion} (${guest.status}).${
    persona ? `\nKNOWN PROFILE: ${persona.brief}` : ""
  }

INTERACTION HISTORY:
${interactions}`;

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
    console.error("care-radar route failed", err);
    return Response.json({ error: "The Care Radar is busy — try again." }, { status: 502 });
  }
}
