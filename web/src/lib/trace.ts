/**
 * The "under the hood" model. A Trace is what the X-ray panel renders:
 * a sequence of logical agents that fired (the orchestration map) plus the
 * real raw detail behind the request (prompt, response, pricing, latency).
 *
 * Honest framing: each app makes ONE Gemini call. The agents are the logical
 * stages of that orchestration — the raw sections show the single real call.
 */

export type AgentId =
  | "memory"
  | "reasoning"
  | "personalization"
  | "booking"
  | "revenue"
  | "concierge"
  | "housekeeping"
  | "activities"
  | "connectivity"
  | "journey"
  | "sentiment"
  | "dispatch"
  | "events"
  | "linguist";

export type AgentSpec = { id: AgentId; label: string; glyph: string; color: string };

export const AGENTS: Record<AgentId, AgentSpec> = {
  memory: { id: "memory", label: "Guest Memory", glyph: "◉", color: "var(--ray-aqua)" },
  reasoning: { id: "reasoning", label: "Inference Engine", glyph: "◈", color: "var(--ray-cyan)" },
  personalization: { id: "personalization", label: "Personalization", glyph: "✦", color: "var(--ray-magenta)" },
  booking: { id: "booking", label: "Booking Engine", glyph: "◆", color: "var(--ray-cyan)" },
  revenue: { id: "revenue", label: "Revenue / Pricing", glyph: "％", color: "var(--ray-green)" },
  concierge: { id: "concierge", label: "Concierge Orchestrator", glyph: "✦", color: "var(--ray-amber)" },
  housekeeping: { id: "housekeeping", label: "Housekeeping Ops", glyph: "⊹", color: "var(--ray-magenta)" },
  activities: { id: "activities", label: "Activities & Partners", glyph: "⛰", color: "var(--ray-green)" },
  connectivity: { id: "connectivity", label: "Connectivity", glyph: "≋", color: "var(--ray-cyan)" },
  journey: { id: "journey", label: "Journey Ops", glyph: "✈", color: "var(--ray-amber)" },
  sentiment: { id: "sentiment", label: "Sentiment Analysis", glyph: "❋", color: "var(--ray-magenta)" },
  dispatch: { id: "dispatch", label: "Task Dispatch", glyph: "⊿", color: "var(--ray-amber)" },
  events: { id: "events", label: "Events & MICE", glyph: "▣", color: "var(--ray-cyan)" },
  linguist: { id: "linguist", label: "Language Engine", glyph: "⟡", color: "var(--ray-aqua)" },
};

export type TraceStep = { agentId: AgentId; note: string };

export type TraceSection = {
  label: string;
  body: string;
  mono?: boolean; // render in monospace (prompts, JSON)
};

export type Trace = {
  appKey: string;
  title: string;
  steps: TraceStep[];
  sections: TraceSection[];
  model?: string;
  latencyMs?: number;
};

/**
 * Per-module identity for the X-ray panel. Keyed by `appKey`, so the panel can
 * reflect *how this particular module works* — its pillar accent, the agent that
 * defines it, a one-line architecture note, and honest per-module framing — without
 * the app pages having to pass any of it. The dynamic detail still comes from the
 * recorded Trace (title/steps/sections); this is the stable wrapper around it.
 */
export type ModuleMeta = {
  name: string; // "Offer Builder"
  glyph: string; // distinct module glyph
  pillarLabel: string; // "Know Me" | "Already Handled" | "Human Edge"
  accent: string; // ray token from the pillar (aqua / amber / magenta)
  signature: AgentId; // the agent that defines this module — gets lead emphasis
  architecture: string; // one line: how it really works in the background
  footer: string; // per-module honest framing (replaces the generic footer)
};

export const MODULES: Record<string, ModuleMeta> = {
  "offer-builder": {
    name: "Offer Builder",
    glyph: "◆",
    pillarLabel: "Know Me",
    accent: "var(--ray-aqua)",
    signature: "booking",
    architecture:
      "One Gemini call returns attribute IDs as JSON; the total and RevPAR lift are computed server-side, so the AI never invents a price.",
    footer:
      "The bundle felt curated because the pricing was math, not a guess — composed server-side so the number is always real.",
  },
  "memory-engine": {
    name: "Memory Engine",
    glyph: "◉",
    pillarLabel: "Know Me",
    accent: "var(--ray-aqua)",
    signature: "memory",
    architecture:
      "Behaviour signals go in; Gemini infers preferences with confidence scores — read-only, nothing is booked. The reasoning is shown, not hidden.",
    footer:
      "It feels like the hotel remembers you because the inference is shown in full — every preference traces back to a signal.",
  },
  concierge: {
    name: "AI Concierge",
    glyph: "✦",
    pillarLabel: "Already Handled",
    accent: "var(--ray-amber)",
    signature: "concierge",
    architecture:
      "Each message is interpreted live; the visible reply streams while a parallel actions block emits real, bookable moves (eSIM, housekeeping, activities).",
    footer:
      "The reply felt instant because the orchestration didn't — intent, grounding and live actions all resolved in one pass.",
  },
  journey: {
    name: "Journey Assistant",
    glyph: "✈",
    pillarLabel: "Already Handled",
    accent: "var(--ray-amber)",
    signature: "journey",
    architecture:
      "A flight event triggers it — no guest prompt. It cross-checks the onward plan, then re-sequences room, transfer and rebooking holds before anyone asks.",
    footer:
      "You were re-homed before you noticed the delay because the journey agent watched the flight, not your messages.",
  },
  sentiment: {
    name: "Sentiment Lab",
    glyph: "❋",
    pillarLabel: "Human Edge",
    accent: "var(--ray-magenta)",
    signature: "sentiment",
    architecture:
      "One review in; Gemini scores sentiment, decomposes it into prioritised tasks with SLAs, routes them to departments, and drafts a human reply.",
    footer:
      "One review became a dispatched work queue in seconds — the empathy in the reply is real, the routing underneath is relentless.",
  },
  mice: {
    name: "MICE Co-Pilot",
    glyph: "▣",
    pillarLabel: "Human Edge",
    accent: "var(--ray-magenta)",
    signature: "events",
    architecture:
      "An RFP in free text becomes a full proposal in one pass — space match, agenda, and a server-side priced quote (DDR × delegates × days + extras).",
    footer:
      "A 30-second proposal looks effortless because the pricing, space-fit and email were composed in a single coordinated pass.",
  },
  intent: {
    name: "Intent Engine",
    glyph: "⟡",
    pillarLabel: "Human Edge",
    accent: "var(--ray-magenta)",
    signature: "linguist",
    architecture:
      "Language is detected first; intent, urgency, routing and a native-language reply (plus an English gloss for staff) all flow from that single detection.",
    footer:
      "It answered in your language because it understood the language first — everything else was downstream of that.",
  },
};

export function prettyJson(value: unknown): string {
  try {
    return typeof value === "string" ? JSON.stringify(JSON.parse(value), null, 2) : JSON.stringify(value, null, 2);
  } catch {
    return typeof value === "string" ? value : String(value);
  }
}
