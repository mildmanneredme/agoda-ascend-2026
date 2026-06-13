"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
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

type JourneyAction = { kind: string; title: string; detail: string; timing: string };
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

  async function simulate() {
    const isCancel = scenario === "cancel";
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
          scenario,
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

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AppHeader title="Journey Assistant" pillar="already-handled" />

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
            {/* scenario toggle */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["delay", "cancel"] as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={`press rounded-xl px-3 py-2.5 text-[0.8rem] font-semibold ${
                    scenario === s ? "glass-deep text-ink" : "glass text-ink-dim"
                  }`}
                  style={scenario === s ? { borderColor: "color-mix(in srgb, var(--ray-amber) 45%, transparent)" } : undefined}
                >
                  {s === "delay" ? "3-hour delay" : "Flight cancelled"}
                </button>
              ))}
            </div>

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
          <button
            onClick={simulate}
            className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss shadow-[0_0_40px_rgba(253,184,18,0.2)]"
          >
            {isCancel ? "Simulate a flight cancellation" : "Simulate a 3-hour delay"}
          </button>
        )}

        {phase === "thinking" && (
          <div className="flex flex-col items-start pt-4">
            <p className="rise font-display text-lg font-medium text-ink">The hotel is reacting…</p>
            <div className="thinking-dots mt-3 flex gap-1.5">
              <span /><span /><span />
            </div>
          </div>
        )}

        {phase === "handled" && plan && (
          <div>
            <div className="bloom mb-4">
              <h3 className="display text-xl font-bold text-ray-amber">{plan.headline}</h3>
              <p className="mt-1 text-sm text-ink-dim">{plan.summary}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {plan.actions.slice(0, visible).map((a, i) => (
                <div key={i} className="bloom glass flex items-start gap-3 rounded-2xl p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ray-amber/12 text-lg">
                    {KIND_ICON[a.kind] ?? "✓"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9rem] font-semibold text-ink">{a.title}</p>
                    <p className="mt-0.5 text-[0.8rem] leading-snug text-ink-dim">{a.detail}</p>
                    <p className="mt-1 text-[0.68rem] uppercase tracking-[0.08em] text-ink-faint">{a.timing}</p>
                  </div>
                  <span className="mt-0.5 shrink-0 text-ray-green">✓</span>
                </div>
              ))}
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
