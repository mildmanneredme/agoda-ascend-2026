"use client";

import { useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useDevTrace } from "@/components/DevTrace";
import LiveReasoning from "@/components/LiveReasoning";
import { prettyJson } from "@/lib/trace";

const SAMPLES = [
  {
    label: "Board offsite",
    text: "We're a fintech scale-up planning a one-day leadership offsite for 45 people in early March. Need a plenary room for the morning, breakout space for the afternoon, lunch, and a relaxed evening drinks reception with a view. Budget around USD 12k.",
  },
  {
    label: "Product launch",
    text: "Looking to host a product launch for ~150 guests — theatre-style keynote with strong AV and live streaming, followed by a standing reception. One evening only. Premium feel, budget flexible.",
  },
  {
    label: "Team workshop",
    text: "Small design team of 18, two-day working workshop. Lots of wall space and natural light, casual lunches, no formal dinner needed. Keep it cost-effective.",
  },
];

type Question = { question: string; why: string };
type Alternative = { name: string; rationale: string; indicativeTotal: number };

type Proposal = {
  title: string;
  pitch: string;
  delegates: number;
  days: number;
  spaceRationale: string;
  agenda: Array<{ time: string; item: string }>;
  lineItems: Array<{ label: string; amount: number }>;
  alternatives: Alternative[];
  email: string;
  space: { name: string; theatre: number; banquet: number; reception: number; dayRate: number; blurb: string };
  ddr: number;
  ddrTotal: number;
  extrasTotal: number;
  grandTotal: number;
  _debug?: { prompt: string; rawResponse: string; model: string; latencyMs: number };
};

type Stage = "ask" | "clarifying" | "answer" | "proposing" | "proposal";

export default function Mice() {
  const { record } = useDevTrace();
  const [rfp, setRfp] = useState("");
  const [stage, setStage] = useState<Stage>("ask");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copyEmail(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — silently no-op */
    }
  }

  async function askCoPilot(text: string) {
    if (!text.trim() || stage === "clarifying") return;
    setStage("clarifying");
    setError(null);
    setProposal(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/mice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfp: text, stage: "clarify" }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { questions: Question[] };
      const qs = data.questions ?? [];
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setStage("answer");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("The events desk hiccuped — try again.");
      setStage("ask");
    }
  }

  async function generateProposal() {
    setStage("proposing");
    setError(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/mice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfp,
          stage: "propose",
          answers: questions.map((q, i) => ({ question: q.question, answer: answers[i] })),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Proposal;
      setProposal(data);
      setStage("proposal");
      record({
        appKey: "mice",
        title: `Talked through the brief, then drafted a proposal for ${data.delegates} delegates`,
        model: data._debug?.model,
        latencyMs: data._debug?.latencyMs,
        steps: [
          { agentId: "reasoning", note: `Asked ${questions.length} clarifying question(s) before drafting` },
          { agentId: "events", note: `Recommended ${data.space?.name} + ${data.alternatives?.length ?? 0} alternatives` },
          { agentId: "revenue", note: `Priced the primary at $${data.grandTotal?.toLocaleString()}` },
          { agentId: "concierge", note: "Wrote the client-ready reply email" },
        ],
        sections: [
          { label: "Enquiry + answers", body: `${rfp}\n\n${questions.map((q, i) => `Q: ${q.question}\nA: ${answers[i] || "(no preference)"}`).join("\n\n")}`, mono: false },
          { label: "Pricing (computed server-side)", body: `DDR $${data.ddr}/pax × ${data.delegates} × ${data.days} = $${data.ddrTotal?.toLocaleString()}\nextras = $${data.extrasTotal?.toLocaleString()}\n— grand total = $${data.grandTotal?.toLocaleString()}`, mono: true },
          { label: "Prompt → Gemini", body: data._debug?.prompt ?? "(unavailable)", mono: true },
          { label: "Structured response", body: prettyJson(data._debug?.rawResponse ?? "{}"), mono: true },
        ],
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("The events desk hiccuped — try again.");
      setStage("answer");
    }
  }

  function reset() {
    setStage("ask");
    setQuestions([]);
    setAnswers([]);
    setProposal(null);
    setError(null);
    setCopied(false);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AppHeader title="MICE Co-Pilot" pillar="human-edge" perspective="guest" />

      <div className="relative z-10 px-5 pb-24">
        <p className="rise mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-ray-magenta">
          Staff co-pilot
        </p>
        <h2 className="rise display mb-2 text-2xl font-bold leading-tight">
          Let&apos;s scope it <span className="prism-text">together.</span>
        </h2>
        <p className="rise mb-4 text-sm leading-relaxed text-ink-dim">
          Describe an event. The co-pilot asks a sharp question or two, then returns a costed
          proposal — with alternatives — and a client-ready email.
        </p>

        {/* ---------- ASK ---------- */}
        {(stage === "ask" || stage === "clarifying") && (
          <>
            <textarea
              value={rfp}
              onChange={(e) => setRfp(e.target.value)}
              placeholder="Describe the event you want to host…"
              rows={4}
              className="glass-deep mb-3 w-full resize-none rounded-2xl px-4 py-3 text-[0.9rem] text-ink caret-ray-magenta outline-none placeholder:text-ink-faint focus:border-ray-magenta/50"
            />
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setRfp(s.text)}
                  className="press glass shrink-0 rounded-full px-3.5 py-2 text-[0.74rem] font-medium text-ink-dim"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => askCoPilot(rfp)}
              disabled={stage === "clarifying" || !rfp.trim()}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss transition-opacity disabled:opacity-30"
            >
              {stage === "clarifying" ? "Reading the brief…" : "Ask the co-pilot"}
            </button>
            {stage === "clarifying" && (
              <div className="mt-6 flex items-center gap-2 text-ink-dim">
                <span className="thinking-dots flex gap-1.5"><span /><span /><span /><span /><span /></span>
                <span className="text-sm">Thinking of what to ask…</span>
              </div>
            )}
          </>
        )}

        {/* ---------- ANSWER follow-up questions ---------- */}
        {(stage === "answer" || stage === "proposing") && (
          <div>
            <div className="bloom glass mb-3 flex items-start gap-3 rounded-2xl rounded-tl-sm p-4">
              <span className="lightbulb flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ray-amber/15 text-base">💡</span>
              <p className="text-[0.88rem] leading-relaxed text-ink">
                Got it. {questions.length === 1 ? "One quick question" : "A couple of quick questions"} so I pitch the right room:
              </p>
            </div>

            <div className="mb-4 flex flex-col gap-3">
              {questions.map((q, i) => (
                <div key={i} className="slide-in-left glass-deep rounded-2xl p-4" style={{ animationDelay: `${0.12 + i * 0.14}s` }}>
                  <p className="text-[0.9rem] font-semibold text-ink">{q.question}</p>
                  <p className="mt-1 mb-2 flex items-center gap-1.5 text-[0.72rem] text-ray-amber">
                    <span className="shrink-0 text-[0.7rem]">↳ why it matters</span>
                    <span className="text-ink-faint">{q.why}</span>
                  </p>
                  <input
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                    placeholder="Your answer (optional)…"
                    className="w-full rounded-xl border border-hairline bg-transparent px-3 py-2 text-[0.86rem] text-ink caret-ray-magenta outline-none placeholder:text-ink-faint focus:border-ray-magenta/50"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={generateProposal}
              disabled={stage === "proposing"}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss transition-opacity disabled:opacity-40"
            >
              {stage === "proposing" ? "Building proposal…" : "Generate the proposal →"}
            </button>
            {stage === "answer" && (
              <button onClick={reset} className="press mt-2 w-full py-2 text-sm font-semibold text-ink-dim">
                Start over
              </button>
            )}
            {stage === "proposing" && (
              <>
                <div className="mt-6 flex items-center gap-2 text-ink-dim">
                  <span className="thinking-dots flex gap-1.5"><span /><span /><span /><span /><span /></span>
                  <span className="text-sm">Matching spaces, pricing, drafting…</span>
                </div>
                <LiveReasoning appKey="mice" active={stage === "proposing"} className="mt-3" />
              </>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-ray-red/40 bg-ray-red/10 px-4 py-3 text-sm text-ink">{error}</p>
        )}

        {/* ---------- PROPOSAL ---------- */}
        {stage === "proposal" && proposal && (
          <div className="mt-2">
            <div className="bloom glass-deep mb-4 rounded-2xl p-5">
              <h3 className="display text-xl font-bold">{proposal.title}</h3>
              <p className="mt-1 text-[0.86rem] leading-relaxed text-ink-dim">{proposal.pitch}</p>
            </div>

            {/* recommended space */}
            <div className="bloom glass mb-4 rounded-2xl p-4">
              <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-cyan">
                Primary recommendation
              </p>
              <p className="display text-lg font-semibold">{proposal.space?.name}</p>
              <p className="mt-0.5 text-[0.8rem] text-ink-dim">{proposal.space?.blurb}</p>
              <p className="mt-2 text-[0.78rem] italic text-ink-dim">{proposal.spaceRationale}</p>
              <div className="mt-3 flex gap-3 border-t border-hairline pt-2 text-[0.7rem] text-ink-faint">
                <span>Theatre {proposal.space?.theatre}</span>
                <span>Banquet {proposal.space?.banquet}</span>
                <span>Reception {proposal.space?.reception}</span>
              </div>
            </div>

            {/* agenda */}
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ray-magenta">Proposed agenda</p>
            <div className="mb-4 flex flex-col gap-1.5">
              {proposal.agenda?.map((a, i) => (
                <div key={i} className="glass flex items-center gap-3 rounded-xl px-4 py-2.5">
                  <span className="display w-12 shrink-0 text-sm font-semibold text-ray-cyan">{a.time}</span>
                  <span className="text-[0.84rem] text-ink-dim">{a.item}</span>
                </div>
              ))}
            </div>

            {/* pricing */}
            <div className="bloom glass-deep mb-4 rounded-2xl p-4">
              <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-green">Indicative cost</p>
              <div className="flex flex-col gap-1.5 text-[0.84rem]">
                <div className="flex justify-between">
                  <span className="text-ink-dim">
                    Day-delegate rate · ${proposal.ddr}/pax × {proposal.delegates} × {proposal.days}d
                  </span>
                  <span className="font-semibold tabular-nums">${proposal.ddrTotal?.toLocaleString()}</span>
                </div>
                {proposal.lineItems?.map((li, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-ink-dim">{li.label}</span>
                    <span className="font-semibold tabular-nums">${li.amount?.toLocaleString()}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-end justify-between border-t border-hairline pt-3">
                  <span className="display font-semibold">Estimated total</span>
                  <span className="display text-2xl font-bold tabular-nums text-ray-green">
                    ${proposal.grandTotal?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* alternatives */}
            {proposal.alternatives?.length > 0 && (
              <>
                <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ray-amber">
                  Or consider
                </p>
                <div className="mb-4 flex flex-col gap-2.5">
                  {proposal.alternatives.map((alt, i) => (
                    <div key={i} className="glass flex items-start justify-between gap-3 rounded-2xl p-4">
                      <div className="min-w-0">
                        <p className="text-[0.9rem] font-semibold text-ink">{alt.name}</p>
                        <p className="mt-0.5 text-[0.78rem] leading-snug text-ink-dim">{alt.rationale}</p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[0.82rem] font-semibold tabular-nums text-ray-amber">
                        ~${alt.indicativeTotal?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* draft email */}
            <div className="bloom glass relative rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-aqua">Draft reply email</p>
                <button
                  onClick={() => copyEmail(proposal.email)}
                  className="press shrink-0 rounded-full border border-hairline px-3 py-1.5 text-[0.72rem] font-semibold text-ink-dim"
                >
                  Copy email 📋
                </button>
              </div>
              <p className="whitespace-pre-wrap text-[0.85rem] leading-relaxed text-ink">{proposal.email}</p>
              {copied && (
                <div className="toast-in pointer-events-none absolute right-4 top-3 rounded-full bg-ray-green/15 px-3 py-1.5 text-[0.72rem] font-semibold text-ray-green">
                  Copied!
                </div>
              )}
            </div>

            <button onClick={reset} className="press mt-4 w-full rounded-2xl py-3 text-sm font-semibold text-ink-dim">
              New enquiry
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
