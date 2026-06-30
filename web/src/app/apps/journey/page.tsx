"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import LiveReasoning from "@/components/LiveReasoning";
import { loadGuest, type GuestProfile } from "@/lib/guest";
import { personaOf } from "@/lib/personas";
import { useDevTrace } from "@/components/DevTrace";
import { prettyJson } from "@/lib/trace";

type Flight = { no: string; from: string; to: string; std: string; label: string };

const FLIGHTS: Flight[] = [
  { no: "EK385", from: "BKK", to: "DXB", std: "23:55", label: "Dubai" },
  { no: "TG916", from: "BKK", to: "LHR", std: "00:20", label: "London" },
  { no: "SQ707", from: "BKK", to: "SIN", std: "18:40", label: "Singapore" },
];

const DELAY_MIN = 180;

const KIND_ICON: Record<string, string> = {
  checkout: "🕓",
  transfer: "🚗",
  dayroom: "🛏️",
  message: "💬",
  arrival: "🛂",
  lounge: "🛋️",
  rebook: "🔁",
  extend: "🌙",
};

type Scenario = "delay" | "cancel";

type JourneyAction = { kind: string; title: string; detail: string; timing: string; time?: string };
type Plan = {
  headline: string;
  summary: string;
  actions: JourneyAction[];
  _debug?: { prompt: string; rawResponse: string; model: string; latencyMs: number };
};

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Pull a clean "HH:MM" out of whatever Gemini hands back, if there is one.
function cleanTime(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// A robust client-side fallback clock time per action kind, anchored to the
// scheduled / new departure so the timeline always reads cleanly even if the
// model omits or fumbles `time`.
const KIND_OFFSET: Record<string, number> = {
  message: 0, // the moment it posts
  checkout: 30,
  extend: 30,
  dayroom: 45,
  lounge: 60,
  transfer: -60, // an hour before the new departure
  rebook: 75,
  arrival: 90,
};

function fallbackTime(kind: string, std: string, dep: string, isCancel: boolean): string {
  if (isCancel) {
    // Cancellation centres on tonight's stay — anchor around the original departure.
    const off = KIND_OFFSET[kind] ?? 30;
    return addMinutes(std, off);
  }
  if (kind === "transfer") return addMinutes(dep, KIND_OFFSET.transfer);
  return addMinutes(std, KIND_OFFSET[kind] ?? 30);
}

export default function Journey() {
  const router = useRouter();
  const { record } = useDevTrace();
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [flight, setFlight] = useState<Flight>(FLIGHTS[0]);
  const [scenario, setScenario] = useState<Scenario>("delay");
  const [phase, setPhase] = useState<"ready" | "thinking" | "handled">("ready");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [visible, setVisible] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const g = loadGuest();
    if (!g) {
      router.replace("/");
      return;
    }
    setGuest(g);
  }, [router]);

  useEffect(() => {
    if (phase !== "handled" || !plan) return;
    if (visible >= plan.actions.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 520);
    return () => clearTimeout(t);
  }, [phase, plan, visible]);

  async function simulate(kind: Scenario) {
    const isCancel = kind === "cancel";
    setScenario(kind);
    setPhase("thinking");
    setError(null);
    setVisible(0);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guest!.name,
          brief: personaOf(guest)?.brief,
          flight,
          delayMinutes: DELAY_MIN,
          scenario: kind,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Plan;
      setPlan(data);
      setPhase("handled");
      record({
        appKey: "journey",
        title: isCancel
          ? `Re-homed ${guest!.name} for the night before they asked`
          : `Handled ${flight.no}'s delay before ${guest!.name} asked`,
        model: data._debug?.model,
        latencyMs: data._debug?.latencyMs,
        steps: [
          { agentId: "journey", note: isCancel ? `Detected ${flight.no} ${flight.from}→${flight.to} cancelled` : `Detected a ${DELAY_MIN}-min delay on ${flight.no} ${flight.from}→${flight.to}` },
          { agentId: "memory", note: `Cross-checked ${guest!.name}'s checkout and onward plan` },
          { agentId: "booking", note: isCancel ? "Extended the room and re-sequenced transfer + rebooking" : "Re-sequenced room hold, transfer and waiting options" },
          { agentId: "concierge", note: `Composed ${data.actions?.length ?? 0} proactive moves` },
        ],
        sections: [
          { label: "Trigger", body: isCancel ? `Flight ${flight.no} ${flight.from}→${flight.to} (std ${flight.std}) CANCELLED → guest needs tonight's stay extended, rebooked tomorrow` : `Flight ${flight.no} ${flight.from}→${flight.to} (std ${flight.std}) delayed ${DELAY_MIN} min → new departure ${addMinutes(flight.std, DELAY_MIN)}`, mono: false },
          { label: "Prompt → Gemini", body: data._debug?.prompt ?? "(unavailable)", mono: true },
          { label: "Structured response", body: prettyJson(data._debug?.rawResponse ?? "{}"), mono: true },
        ],
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("The journey desk hiccuped — try again.");
      setPhase("ready");
    }
  }

  if (!guest) return null;
  const isCancel = scenario === "cancel";
  const newDep = addMinutes(flight.std, DELAY_MIN);
  const disrupted = phase !== "ready";

  // Resolve each action to a clock time (model-provided when usable, else a
  // grounded fallback) so the recovery list becomes a real-time timeline.
  const timeline = (plan?.actions ?? []).map((a) => ({
    ...a,
    at: cleanTime(a.time) ?? cleanTime(a.timing) ?? fallbackTime(a.kind, flight.std, newDep, isCancel),
  }));

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AppHeader title="Journey Assistant" pillar="already-handled" perspective="guest" />

      <div className="relative z-10 px-5 pb-24">
        <p className="rise mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-ray-amber">
          Proactive · before you ask
        </p>
        <h2 className="rise display mb-2 text-2xl font-bold leading-tight">
          The hotel <span className="prism-text">acts first.</span>
        </h2>
        <p className="rise mb-5 text-sm leading-relaxed text-ink-dim">
          {guest.name} is checking out and heading to the airport. Trigger disruption — and watch
          the hotel handle it before a single message is sent.
        </p>

        {phase === "ready" && (
          <>
            {/* flight selector */}
            <div className="mb-4 flex gap-2">
              {FLIGHTS.map((f) => (
                <button
                  key={f.no}
                  onClick={() => setFlight(f)}
                  className={`press rounded-xl px-3 py-2 text-[0.78rem] font-semibold ${
                    flight.no === f.no ? "glass-deep text-ink" : "glass text-ink-dim"
                  }`}
                  style={flight.no === f.no ? { borderColor: "color-mix(in srgb, var(--ray-amber) 45%, transparent)" } : undefined}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* boarding-pass card */}
        <div className="glass-deep relative mb-5 overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint">Flight</p>
              <p className="display text-xl font-bold">{flight.no}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] ${
                !disrupted ? "bg-ray-green/15 text-ray-green" : isCancel ? "bg-ray-red/20 text-ray-red" : "bg-ray-amber/20 text-ray-amber"
              }`}
            >
              {!disrupted ? "On time" : isCancel ? "Cancelled" : "Delayed"}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-center">
              <p className="display text-2xl font-bold">{flight.from}</p>
              <p className="text-[0.7rem] text-ink-faint">Bangkok</p>
            </div>
            <div className="flex-1 px-3">
              <div className="relative h-px bg-hairline">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ink-dim">✈</span>
              </div>
            </div>
            <div className="text-center">
              <p className="display text-2xl font-bold">{flight.to}</p>
              <p className="text-[0.7rem] text-ink-faint">{flight.label}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-sm">
            <span className="text-ink-faint">Departure</span>
            {!disrupted ? (
              <span className="font-semibold text-ink">{flight.std}</span>
            ) : isCancel ? (
              <span className="font-semibold">
                <span className="text-ink-faint line-through">{flight.std}</span>{" "}
                <span className="text-ray-red">Rebooked tomorrow</span>
              </span>
            ) : (
              <span className="font-semibold">
                <span className="text-ink-faint line-through">{flight.std}</span>{" "}
                <span className="text-ray-amber">{newDep}</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-ray-red/40 bg-ray-red/10 px-4 py-3 text-sm text-ink">{error}</p>
        )}

        {phase === "ready" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => simulate("delay")}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss shadow-[0_0_40px_rgba(253,184,18,0.2)]"
            >
              Simulate a 3-hour delay
            </button>
            <button
              onClick={() => simulate("cancel")}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss shadow-[0_0_40px_rgba(253,184,18,0.2)]"
            >
              Simulate a flight cancellation
            </button>
          </div>
        )}

        {phase === "thinking" && (
          <div className="flex flex-col items-start pt-1">
            <p className="rise mb-3 font-display text-lg font-medium text-ink">The hotel is reacting…</p>
            <LiveReasoning appKey="journey" active={phase === "thinking"} className="w-full" />
          </div>
        )}

        {phase === "handled" && plan && (
          <div>
            {/* Emotional beat: alarm → relief. */}
            <div
              className="glow-flash bloom mb-4 rounded-2xl border p-4"
              style={{
                borderColor: "color-mix(in srgb, var(--ray-red) 35%, transparent)",
                background: "color-mix(in srgb, var(--ray-red) 8%, transparent)",
                ["--flash" as string]: "var(--ray-red)",
              }}
            >
              <p className="text-[0.92rem] font-semibold leading-snug text-ink">
                {isCancel ? (
                  <>
                    Your <span className="text-ray-red line-through">{flight.std}</span> departure was{" "}
                    <span className="text-ray-red">cancelled</span>.
                  </>
                ) : (
                  <>
                    Your <span className="text-ray-amber line-through">{flight.std}</span> departure is now{" "}
                    <span className="text-ray-amber">{newDep}</span>.
                  </>
                )}{" "}
                <span className="text-ray-green">Here&apos;s what&apos;s already in motion.</span>
              </p>
            </div>

            <div className="bloom mb-4">
              <h3 className="display text-xl font-bold text-ray-amber">{plan.headline}</h3>
              <p className="mt-1 text-sm text-ink-dim">{plan.summary}</p>
            </div>

            {/* Time-anchored recovery timeline. */}
            <div className="relative pl-1">
              {/* connecting line */}
              {timeline.length > 1 && (
                <span
                  aria-hidden
                  className="absolute left-[1.4rem] top-3 bottom-3 w-px"
                  style={{ background: "var(--hairline)" }}
                />
              )}
              <div className="flex flex-col gap-3">
                {timeline.slice(0, visible).map((a, i) => (
                  <div key={i} className="slide-in-left relative flex items-start gap-3">
                    <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ray-amber/12 text-base ring-1 ring-[var(--hairline)] backdrop-blur">
                      {KIND_ICON[a.kind] ?? "✓"}
                    </span>
                    <div className="glass min-w-0 flex-1 rounded-2xl p-3.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[0.9rem] font-semibold text-ink">{a.title}</p>
                        <span className="shrink-0 font-display text-[0.78rem] font-bold tabular-nums text-ray-green">
                          {a.at}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.8rem] leading-snug text-ink-dim">{a.detail}</p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.08em] text-ink-faint">{a.timing}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {visible >= plan.actions.length && (
              <button
                onClick={() => {
                  setPlan(null);
                  setPhase("ready");
                }}
                className="press mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-ink-dim"
              >
                Reset the flight
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
