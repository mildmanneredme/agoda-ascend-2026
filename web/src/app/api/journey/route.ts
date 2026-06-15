import { Type } from "@google/genai";
import { gemini, MODEL, FAST } from "@/lib/gemini";
import { HOTEL } from "@/lib/hotel";

export const maxDuration = 30;

const schema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: "Reassuring one-liner addressed to the guest, max 10 words" },
    summary: { type: Type.STRING, description: "One sentence on what the delay means and that it's handled" },
    actions: {
      type: Type.ARRAY,
      description: "4 to 6 proactive moves the hotel made, in the order they'd happen",
      items: {
        type: Type.OBJECT,
        properties: {
          kind: {
            type: Type.STRING,
            enum: ["checkout", "transfer", "dayroom", "message", "arrival", "lounge", "rebook", "extend"],
            description: "The category of action ('extend' = extending/holding the room for an extra night)",
          },
          title: { type: Type.STRING, description: "Short action title, max 7 words" },
          detail: { type: Type.STRING, description: "One concrete sentence on what was done, max 22 words" },
          timing: { type: Type.STRING, description: "When it happened, e.g. 'the moment the delay posted'" },
          time: {
            type: Type.STRING,
            description: "The single clock time (24h 'HH:MM') this action is anchored to / affects, e.g. the hour the room is held until, the transfer pickup time, the start of lounge access. Use a real time grounded in the scheduled and new departure times.",
          },
        },
        required: ["kind", "title", "detail", "timing", "time"],
      },
    },
  },
  required: ["headline", "summary", "actions"],
};

export async function POST(req: Request) {
  const { guestName, brief, flight, delayMinutes, scenario } = await req.json();

  const isCancel = scenario === "cancel";

  const situation = isCancel
    ? `Their flight ${flight.no} ${flight.from} → ${flight.to} (scheduled ${flight.std}) has just been CANCELLED. The next available seat is on tomorrow's departure. The guest had checked out today and now has nowhere to sleep tonight. They have NOT contacted the hotel yet.`
    : `Their flight ${flight.no} ${flight.from} → ${flight.to} (scheduled ${flight.std}) just picked up a delay of ${delayMinutes} minutes. The guest has NOT contacted the hotel — they may not even know yet.`;

  const guidance = isCancel
    ? `Act first. The CENTRAL move is a stay extension: re-open or hold the SAME room (or an equivalent) for an extra night so the guest never worries about where to sleep — waive or pre-clear any rate friction, and restore their on-file preferences. Around that, sequence: confirming the airline rebooking / new flight time, rebooking the airport transfer for tomorrow, a warm reassuring message that it's already handled, dinner or lounge for tonight, and a fresh late-checkout for the new departure. Use the 'extend' kind for the room-extension move. Make every move concrete.`
    : `Act first. Produce the sequence of proactive moves the hotel's AI makes the moment the delay posts: holding/extending the room or late checkout, rebooking the airport transfer to the new time, offering lounge or a day room to wait in comfort, a warm heads-up message, and a helpful nudge for the onward journey (e.g. arrival formalities at ${flight.to}). Make each move specific and grounded in the actual delay length.`;

  const prompt = `You are the Proactive Journey Assistant of ${HOTEL.name}, ${HOTEL.city}.

Guest: ${guestName}.${brief ? ` Profile: ${brief}` : ""}
The guest is checking out today and flying ${flight.from} → ${flight.to} on ${flight.no}, scheduled ${flight.std}.
${situation}

${guidance} Tailor to the guest's profile where it fits.`;

  try {
    const t0 = Date.now();
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { ...FAST, responseMimeType: "application/json", responseSchema: schema, temperature: 0.85 },
    });
    const latencyMs = Date.now() - t0;
    return Response.json({
      ...JSON.parse(res.text ?? "{}"),
      _debug: { prompt, rawResponse: res.text ?? "", model: MODEL, latencyMs },
    });
  } catch (err) {
    console.error("journey route failed", err);
    return Response.json({ error: "The journey desk is busy — try again." }, { status: 502 });
  }
}
