"use client";

import { useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useDevTrace } from "@/components/DevTrace";
import { prettyJson } from "@/lib/trace";

const TONE_COLOR: Record<string, string> = {
  red: "var(--ray-red)",
  orange: "var(--ray-amber)",
  green: "var(--ray-green)",
};

const SAMPLES: Array<{ label: string; tone: "red" | "orange" | "green"; text: string }> = [
  {
    label: "Frustrated",
    tone: "red",
    text: "Booked a quiet room and got put right next to the lift. Asked to move twice and nobody followed up. The bathroom drain was clogged. For this price I expected far better.",
  },
  {
    label: "Let down",
    tone: "red",
    text: "Checked in at midnight after a 14-hour flight to find our room hadn't been made up — hair in the sink, towels already used. Reception was apologetic but it took 40 minutes to find us another room. Not what I expect at this price.",
  },
  {
    label: "Mixed stay",
    tone: "orange",
    text: "The river view from our room was absolutely stunning and the staff at check-in were so warm. But the air conditioning rattled all night and we couldn't sleep, and breakfast was cold by the time we got to the buffet at 9am. Honestly torn — the place has so much potential.",
  },
  {
    label: "Glowing",
    tone: "green",
    text: "Best hotel stay I've had in years. The concierge remembered my coffee order from a previous visit, the spa was world-class, and the late checkout saved my morning. Maria at the front desk went above and beyond. I'll be back.",
  },
];

const PRIORITY_STYLE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: "rgba(255,40,56,0.14)", fg: "var(--ray-red)" },
  high: { bg: "rgba(253,184,18,0.14)", fg: "var(--ray-amber)" },
  normal: { bg: "rgba(0,170,224,0.14)", fg: "var(--ray-cyan)" },
};

const SENT_STYLE: Record<string, string> = {
  positive: "var(--ray-green)",
  mixed: "var(--ray-amber)",
  neutral: "var(--ink-dim)",
  negative: "var(--ray-red)",
};

type Result = {
  sentiment: string;
  score: number;
  headline: string;
  aspects: Array<{ label: string; sentiment: string; quote: string }>;
  actions: Array<{ department: string; task: string; priority: string; sla: string }>;
  reply: string;
  staffKudos?: { team: string; message: string };
  _debug?: { prompt: string; rawResponse: string; model: string; latencyMs: number };
};

export default function SentimentLab() {
  const { record } = useDevTrace();
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function analyze(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: text }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Result;
      setResult(data);
      record({
        appKey: "sentiment",
        title: `Decomposed a review into ${data.actions?.length ?? 0} dispatched tasks`,
        model: data._debug?.model,
        latencyMs: data._debug?.latencyMs,
        steps: [
          { agentId: "sentiment", note: `Scored sentiment ${data.score}/100 across ${data.aspects?.length ?? 0} themes` },
          { agentId: "reasoning", note: "Extracted concrete issues from free text" },
          { agentId: "dispatch", note: `Routed ${data.actions?.length ?? 0} tasks to departments with SLAs` },
          { agentId: "concierge", note: "Drafted a personal reply to the guest" },
        ],
        sections: [
          { label: "Review (input)", body: text, mono: false },
          { label: "Prompt → Gemini", body: data._debug?.prompt ?? "(unavailable)", mono: true },
          { label: "Structured response", body: prettyJson(data._debug?.rawResponse ?? "{}"), mono: true },
        ],
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("The analysis engine hiccuped — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AppHeader title="Sentiment Lab" pillar="human-edge" />

      <div className="relative z-10 px-5 pb-24">
        <p className="rise mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-ray-magenta">
          Feedback → action
        </p>
        <h2 className="rise display mb-2 text-2xl font-bold leading-tight">
          Every review, <span className="prism-text">a to-do list.</span>
        </h2>
        <p className="rise mb-4 text-sm leading-relaxed text-ink-dim">
          Paste a guest review. Watch it become routed, prioritised tasks in seconds — the work
          that used to take a manager 24–72 hours.
        </p>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Paste a guest review here…"
          rows={4}
          className="glass-deep mb-3 w-full resize-none rounded-2xl px-4 py-3 text-[0.9rem] text-ink caret-ray-magenta outline-none placeholder:text-ink-faint focus:border-ray-magenta/50"
        />
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => setReview(s.text)}
              className="press glass flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.74rem] font-medium"
              style={{ color: TONE_COLOR[s.tone], borderColor: `color-mix(in srgb, ${TONE_COLOR[s.tone]} 40%, transparent)` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[s.tone] }} />
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => analyze(review)}
          disabled={busy || !review.trim()}
          className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss transition-opacity disabled:opacity-30"
        >
          {busy ? "Analysing…" : "Decompose into actions"}
        </button>

        {error && (
          <p className="mt-4 rounded-xl border border-ray-red/40 bg-ray-red/10 px-4 py-3 text-sm text-ink">{error}</p>
        )}

        {busy && (
          <div className="mt-6 flex items-center gap-2 text-ink-dim">
            <span className="thinking-dots flex gap-1.5">
              <span /><span /><span /><span /><span />
            </span>
            <span className="text-sm">Reading between the lines…</span>
          </div>
        )}

        {result && (
          <div className="mt-6">
            {/* sentiment gauge */}
            <div className="bloom glass-deep mb-4 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">Overall sentiment</p>
                  <p className="display text-xl font-bold capitalize" style={{ color: SENT_STYLE[result.sentiment] }}>
                    {result.sentiment}
                  </p>
                </div>
                <p className="display text-3xl font-bold tabular-nums" style={{ color: SENT_STYLE[result.sentiment] }}>
                  {result.score}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${result.score}%`, background: `linear-gradient(90deg, var(--ray-red), var(--ray-amber) 50%, var(--ray-green))` }}
                />
              </div>
              <p className="mt-3 text-[0.85rem] italic text-ink-dim">“{result.headline}”</p>
            </div>

            {/* aspects */}
            <div className="mb-4 flex flex-wrap gap-2">
              {result.aspects?.map((a, i) => (
                <span
                  key={i}
                  className="glass rounded-full px-3 py-1.5 text-[0.74rem] font-medium"
                  style={{ color: SENT_STYLE[a.sentiment], borderColor: `color-mix(in srgb, ${SENT_STYLE[a.sentiment]} 35%, transparent)` }}
                  title={a.quote}
                >
                  {a.sentiment === "positive" ? "▲" : a.sentiment === "negative" ? "▼" : "■"} {a.label}
                </span>
              ))}
            </div>

            {/* staff kudos — positive reviews only */}
            {result.staffKudos && (
              <div className="bloom mb-4 rounded-2xl border border-ray-green/30 bg-ray-green/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-base">🎉</span>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ray-green">
                    Kudos sent to {result.staffKudos.team}
                  </p>
                </div>
                <p className="text-[0.85rem] leading-relaxed text-ink">{result.staffKudos.message}</p>
              </div>
            )}

            {/* dispatched tasks */}
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ray-magenta">
              Dispatched to teams
            </p>
            <div className="stagger flex flex-col gap-2.5">
              {result.actions?.map((a, i) => {
                const ps = PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.normal;
                return (
                  <div key={i} className="glass flex items-start gap-3 rounded-2xl p-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink">{a.department}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em]"
                          style={{ background: ps.bg, color: ps.fg }}
                        >
                          {a.priority}
                        </span>
                      </div>
                      <p className="text-[0.85rem] leading-snug text-ink-dim">{a.task}</p>
                    </div>
                    <span className="shrink-0 text-[0.68rem] font-semibold text-ray-cyan">{a.sla}</span>
                  </div>
                );
              })}
            </div>

            {/* draft reply */}
            <div className="bloom glass-deep mt-4 rounded-2xl p-4">
              <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-aqua">
                Draft reply to the guest
              </p>
              <p className="text-[0.86rem] leading-relaxed text-ink">{result.reply}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
