import { Type } from "@google/genai";
import { gemini, MODEL, FAST } from "@/lib/gemini";
import { rateLimit } from "@/lib/rateLimit";
import { HOTEL } from "@/lib/hotel";

export const maxDuration = 30;

const schema = {
  type: Type.OBJECT,
  properties: {
    sentiment: { type: Type.STRING, enum: ["positive", "mixed", "negative"], description: "Overall sentiment" },
    score: { type: Type.INTEGER, description: "Sentiment score 0 (terrible) to 100 (glowing)" },
    headline: { type: Type.STRING, description: "One line capturing the essence of the review, max 12 words" },
    aspects: {
      type: Type.ARRAY,
      description: "3 to 5 themes the guest raised",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Theme, max 3 words, e.g. 'Room cleanliness'" },
          sentiment: { type: Type.STRING, enum: ["positive", "neutral", "negative"] },
          quote: { type: Type.STRING, description: "A short paraphrase or quote from the review, max 14 words" },
        },
        required: ["label", "sentiment", "quote"],
      },
    },
    actions: {
      type: Type.ARRAY,
      description: "Concrete tasks dispatched to departments, most urgent first",
      items: {
        type: Type.OBJECT,
        properties: {
          department: { type: Type.STRING, description: "Owning team, e.g. 'Housekeeping', 'F&B', 'Front Office', 'Engineering', 'Guest Relations'" },
          task: { type: Type.STRING, description: "The action to take, max 16 words" },
          priority: { type: Type.STRING, enum: ["urgent", "high", "normal"] },
          sla: { type: Type.STRING, description: "Target response window, e.g. 'within 15 min'" },
        },
        required: ["department", "task", "priority", "sla"],
      },
    },
    reply: { type: Type.STRING, description: "A warm, specific draft reply to the guest, 2-3 sentences, signed from The Grand Neural" },
    staffKudos: {
      type: Type.OBJECT,
      description: "ONLY when overall sentiment is positive: an internal shout-out notifying the team that earned the praise. Omit entirely for mixed or negative reviews.",
      properties: {
        team: { type: Type.STRING, description: "The team or role to congratulate, e.g. 'Front Office', 'Spa team', 'Concierge'" },
        message: { type: Type.STRING, description: "A warm internal note praising them, quoting what the guest loved, max 24 words" },
      },
      required: ["team", "message"],
    },
  },
  required: ["sentiment", "score", "headline", "aspects", "actions", "reply"],
};

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { review } = await req.json();

  const prompt = `You are the Sentiment-to-Action engine of ${HOTEL.name}. A guest review has just landed. Decompose it completely — sentiment, the themes raised, and a dispatch list of concrete tasks each routed to the right department with a priority and response SLA. Then draft a warm, specific reply to the guest. Be precise: tasks must reference what the review actually said, not generic service language. Urgent issues (safety, cleanliness, anything broken) get the tightest SLA.

If — and only if — the overall sentiment is positive, also produce "staffKudos": an internal notification congratulating the specific team that earned the praise, quoting what the guest loved. For mixed or negative reviews, do NOT include staffKudos.

REVIEW:
"""
${review}
"""`;

  try {
    const t0 = Date.now();
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { ...FAST, responseMimeType: "application/json", responseSchema: schema, temperature: 0.7 },
    });
    const latencyMs = Date.now() - t0;
    return Response.json({
      ...JSON.parse(res.text ?? "{}"),
      _debug: { prompt, rawResponse: res.text ?? "", model: MODEL, latencyMs },
    });
  } catch (err) {
    console.error("sentiment route failed", err);
    return Response.json({ error: "The analysis engine is busy — try again." }, { status: 502 });
  }
}
