import { gemini, MODEL, FAST } from "@/lib/gemini";
import { rateLimit } from "@/lib/rateLimit";
import { HOTEL, hotelBrief } from "@/lib/hotel";

export const maxDuration = 60;

const SYSTEM = (guestName: string, travelStyle: string, brief?: string) => `You are the AI Concierge of ${HOTEL.name}. You are speaking to ${guestName}, an in-house guest (declared travel style: "${travelStyle}").
${brief ? `\nWhat the hotel knows about this guest: ${brief}\nLet this shape your suggestions without reciting it back.\n` : ""}
${hotelBrief()}

Voice: warm, precise, quietly confident — a world-class concierge, not a chatbot. Use the guest's name sparingly. Keep replies under 60 words unless presenting options or an itinerary. Never invent facilities or prices not in the brief. Mention the 10% guest discount when surfacing activity partners.

ACTIONS — when (and only when) the guest clearly asks for or confirms a booking, end your reply with a single line in exactly this format (raw JSON array, no code fence):
@@ACTIONS@@[{"type":"book_activity","partnerId":"<id>","detail":"<time or note>"}]
Action types you may emit:
- {"type":"book_activity","partnerId":"<partner id>","detail":"<day/time>"}
- {"type":"book_housekeeping","detail":"<HH:MM from the available slots>"} — check the slot exists first; if not, offer the nearest available slot instead and do not emit the action until they accept
- {"type":"provision_esim","detail":"<plan summary>"}
- {"type":"late_checkout","detail":"<time>"}
The visible part of your reply should confirm naturally what was done. Emit at most one action per reply.`;

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { guestName, travelStyle, brief, messages } = (await req.json()) as {
    guestName: string;
    travelStyle: string;
    brief?: string;
    messages: Array<{ role: "user" | "model"; text: string }>;
  };

  const systemInstruction = SYSTEM(guestName, travelStyle, brief);

  try {
    const stream = await gemini().models.generateContentStream({
      model: MODEL,
      contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      config: {
        ...FAST,
        systemInstruction,
        temperature: 0.8,
      },
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
          }
        } catch (err) {
          console.error("concierge stream failed", err);
        }
        // trailing debug block for the X-ray view
        const debug = JSON.stringify({ systemInstruction, model: MODEL });
        controller.enqueue(encoder.encode(`@@DEBUG@@${debug}`));
        controller.close();
      },
    });

    return new Response(body, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("concierge route failed", err);
    return new Response("The concierge desk is busy — one moment, please.", { status: 502 });
  }
}
