import { Type } from "@google/genai";
import { gemini, MODEL, FAST } from "@/lib/gemini";
import { DDR_PER_PERSON, EVENT_SPACES, HOTEL, miceBrief } from "@/lib/hotel";

export const maxDuration = 30;

const clarifySchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      description: "1 or 2 sharp clarifying questions that materially change the proposal (budget, format, dates, dietary, AV, etc.). Never ask what's already stated.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The question to the planner, max 16 words" },
          why: { type: Type.STRING, description: "Why it matters, max 10 words" },
        },
        required: ["question", "why"],
      },
    },
  },
  required: ["questions"],
};

const proposeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A proposal title naming the client's event, max 8 words" },
    pitch: { type: Type.STRING, description: "Two-sentence opening. The FIRST sentence MUST echo back the key constraints the planner gave (e.g. 'For a premium offsite of up to 150 over one evening…'), naming their headcount, format, budget tier or any preferences they answered. If an answer was blank, fall back to the constraints stated in the enquiry. The second sentence sets up the recommendation." },
    delegates: { type: Type.INTEGER, description: "Number of attendees" },
    days: { type: Type.INTEGER, description: "Number of event days (default 1)" },
    spaceId: { type: Type.STRING, description: "The recommended event space id from the inventory, verbatim" },
    spaceRationale: { type: Type.STRING, description: "Why this space fits, max 24 words" },
    agenda: {
      type: Type.ARRAY,
      description: "4 to 6 timeline items for the day",
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING, description: "e.g. '09:00'" },
          item: { type: Type.STRING, description: "What happens, max 10 words" },
        },
        required: ["time", "item"],
      },
    },
    lineItems: {
      type: Type.ARRAY,
      description: "Priced components other than the per-delegate rate",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Line item name, max 8 words" },
          amount: { type: Type.INTEGER, description: "Total USD for this item across the event" },
        },
        required: ["label", "amount"],
      },
    },
    alternatives: {
      type: Type.ARRAY,
      description: "Exactly 2 alternative directions the planner could pick instead — a different space, format or budget tier",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Option name, e.g. 'Skyline Studio · intimate' — max 6 words" },
          rationale: { type: Type.STRING, description: "When you'd choose this instead, max 18 words" },
          indicativeTotal: { type: Type.INTEGER, description: "Rough total USD for this alternative" },
        },
        required: ["name", "rationale", "indicativeTotal"],
      },
    },
    email: { type: Type.STRING, description: "A polished draft reply email to the client, 3-4 sentences, signed 'The Grand Neural Events Team'" },
  },
  required: ["title", "pitch", "delegates", "days", "spaceId", "spaceRationale", "agenda", "lineItems", "alternatives", "email"],
};

export async function POST(req: Request) {
  const { rfp, answers, stage } = await req.json();

  // ---- Stage 1: ask 1-2 smart clarifying questions ----
  if (stage === "clarify") {
    const prompt = `You are the Staff Co-Pilot for the events team at ${HOTEL.name}. A corporate event enquiry just arrived. Before drafting anything, ask the ONE or TWO highest-leverage clarifying questions whose answers would most change the proposal (e.g. budget ceiling, exact headcount, formal dinner vs reception, hybrid/streaming, dietary). Do not ask what the brief already answers. Keep it to a real planner's instinct: minimal, sharp.

${miceBrief()}

ENQUIRY:
"""
${rfp}
"""`;
    try {
      const t0 = Date.now();
      const res = await gemini().models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { ...FAST, responseMimeType: "application/json", responseSchema: clarifySchema, temperature: 0.7 },
      });
      const latencyMs = Date.now() - t0;
      return Response.json({
        ...JSON.parse(res.text ?? "{}"),
        _debug: { prompt, rawResponse: res.text ?? "", model: MODEL, latencyMs },
      });
    } catch (err) {
      console.error("mice clarify failed", err);
      return Response.json({ error: "The events desk is busy — try again." }, { status: 502 });
    }
  }

  // ---- Stage 2: full proposal with a primary pick + alternatives ----
  const answerBlock = Array.isArray(answers) && answers.length
    ? `\n\nPLANNER'S ANSWERS TO YOUR QUESTIONS:\n${answers.map((a: { question: string; answer: string }) => `- ${a.question} → ${a.answer || "(no preference)"}`).join("\n")}`
    : "";

  const prompt = `You are the Staff Co-Pilot for the events team at ${HOTEL.name}. Using the enquiry AND the planner's answers, produce a complete first-draft proposal in one pass: recommend the single best space (your PRIMARY pick), sketch a day agenda, list priced extras beyond the day-delegate rate, give exactly TWO alternative directions the planner could choose instead, and write a draft reply email. Match the space to the headcount (never propose a room that can't hold them). Reflect the planner's answers explicitly — open the pitch by echoing the key constraints they gave back to them. If an answer was left blank, fall back gracefully to what the enquiry already states; never invent constraints the planner didn't give.

${miceBrief()}

ENQUIRY:
"""
${rfp}
"""${answerBlock}`;

  try {
    const t0 = Date.now();
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { ...FAST, responseMimeType: "application/json", responseSchema: proposeSchema, temperature: 0.8 },
    });
    const latencyMs = Date.now() - t0;

    const parsed = JSON.parse(res.text ?? "{}") as {
      spaceId: string;
      delegates: number;
      days: number;
      lineItems: Array<{ label: string; amount: number }>;
      [k: string]: unknown;
    };
    const space = EVENT_SPACES.find((s) => s.id === parsed.spaceId) ?? EVENT_SPACES[0];
    const delegates = Math.max(1, parsed.delegates || 1);
    const days = Math.max(1, parsed.days || 1);
    const ddrTotal = DDR_PER_PERSON * delegates * days;
    const extras = (parsed.lineItems ?? []).reduce((sum, li) => sum + (li.amount || 0), 0);

    return Response.json({
      ...parsed,
      space,
      delegates,
      days,
      ddr: DDR_PER_PERSON,
      ddrTotal,
      extrasTotal: extras,
      grandTotal: ddrTotal + extras,
      _debug: { prompt, rawResponse: res.text ?? "", model: MODEL, latencyMs },
    });
  } catch (err) {
    console.error("mice propose failed", err);
    return Response.json({ error: "The events desk is busy — try again." }, { status: 502 });
  }
}
