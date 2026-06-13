"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { AgodaDots } from "@/components/Wordmark";
import { loadGuest, styleOf, type GuestProfile } from "@/lib/guest";
import { personaOf, signalsOf } from "@/lib/personas";
import { useDevTrace } from "@/components/DevTrace";
import { prettyJson } from "@/lib/trace";

type Memory = {
  greeting: string;
  tier: string;
  preferences: Array<{
    label: string;
    confidence: number;
    signal: string;
    reasoning: string;
    action: string;
  }>;
  _debug?: { prompt: string; rawResponse: string; model: string; latencyMs: number };
};

export default function MemoryEngine() {
  const router = useRouter();
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const { record } = useDevTrace();

  const fetchMemory = useCallback(
    async (g: GuestProfile) => {
      setError(null);
      setMemory(null);
      const persona = personaOf(g);
      const signals = signalsOf(g);
      try {
        const res = await fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: g.name,
            travelStyle: styleOf(g).label,
            brief: persona?.brief,
            signals,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as Memory;
        setMemory(data);
        record({
          appKey: "memory-engine",
          title: `Recalled and reasoned over ${g.name}'s history`,
          model: data._debug?.model,
          latencyMs: data._debug?.latencyMs,
          steps: [
            { agentId: "memory", note: `Pulled ${signals.length || "0"} behaviour signals across 3 properties` },
            { agentId: "reasoning", note: `Inferred ${data.preferences?.length ?? 0} preferences with confidence scores` },
            { agentId: "personalization", note: "Pre-staged the room and services to match" },
          ],
          sections: [
            { label: "Signals on file (input)", body: signals.length ? signals.map((s) => `• ${s}`).join("\n") : "(new guest — no prior signals)", mono: false },
            { label: "Prompt → Gemini", body: data._debug?.prompt ?? "(unavailable)", mono: true },
            { label: "Structured response", body: prettyJson(data._debug?.rawResponse ?? "{}"), mono: true },
          ],
        });
      } catch {
        setError("The memory engine hiccuped.");
      }
    },
    [record]
  );

  useEffect(() => {
    const g = loadGuest();
    if (!g) {
      router.replace("/");
      return;
    }
    setGuest(g);
    fetchMemory(g);
  }, [router, fetchMemory]);

  if (!guest) return null;
  const style = styleOf(guest);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AppHeader title="Guest Memory" pillar="know-me" />

      <div className="relative z-10 px-5 pb-safe">
        {!memory && !error && (
          <div className="flex flex-col items-center pt-[20vh] text-center">
            <p className="rise display mb-2 text-lg font-medium text-ink">
              Recalling everything we know about you…
            </p>
            <p className="rise text-sm text-ink-dim">across every stay, every property</p>
            <div className="thinking-dots mt-5 flex gap-1.5">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && (
          <div className="pt-10 text-center">
            <p className="mb-4 text-sm text-ink-dim">{error}</p>
            <button
              onClick={() => fetchMemory(guest)}
              className="press glass rounded-2xl px-6 py-3 text-sm font-semibold text-ink"
            >
              Try again
            </button>
          </div>
        )}

        {memory && (
          <>
            {/* holographic membership card */}
            <div className="bloom foil glass-deep relative mb-6 overflow-hidden rounded-3xl p-5">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  background:
                    "radial-gradient(80% 60% at 85% 0%, rgba(68,0,198,0.45), transparent 60%)",
                }}
              />
              <div className="relative">
                <div className="mb-8 flex items-start justify-between">
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-ink-faint">
                      The Grand Neural · Guest Memory
                    </p>
                    <p className="display mt-1 text-[1.65rem] font-bold leading-tight">
                      {guest.name}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-ray-aqua">
                      {memory.tier}
                    </p>
                  </div>
                  <span className="text-2xl">{style.emoji}</span>
                </div>
                <p className="mb-4 text-[0.9rem] italic leading-relaxed text-ink-dim">
                  “{memory.greeting}”
                </p>
                <div className="flex items-center justify-between border-t border-hairline pt-3">
                  <AgodaDots size={4} />
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint">
                    Memory synced · 3 properties
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.18em] text-ray-aqua">
                What we&apos;ve learned
              </h2>
              <span className="text-[0.68rem] text-ink-faint">tap to see the AI&apos;s reasoning</span>
            </div>

            <div className="stagger flex flex-col gap-3">
              {memory.preferences.map((pref, i) => {
                const expanded = open === i;
                return (
                  <button
                    key={pref.label}
                    onClick={() => setOpen(expanded ? null : i)}
                    className={`press rounded-2xl p-4 text-left transition-all ${
                      expanded ? "glass-deep" : "glass"
                    }`}
                    style={expanded ? { borderColor: "rgba(75,234,234,0.4)" } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.92rem] font-semibold text-ink">{pref.label}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pref.confidence}%`,
                                background:
                                  "linear-gradient(90deg, var(--ray-cyan), var(--ray-aqua))",
                              }}
                            />
                          </div>
                          <span className="text-[0.68rem] font-semibold tabular-nums text-ray-aqua">
                            {pref.confidence}%
                          </span>
                        </div>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        className={`shrink-0 text-ink-faint transition-transform ${expanded ? "rotate-180" : ""}`}
                      >
                        <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {expanded && (
                      <div className="rise mt-4 flex flex-col gap-3 border-t border-hairline pt-4">
                        <div>
                          <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-amber">
                            Signal observed
                          </p>
                          <p className="text-[0.82rem] leading-relaxed text-ink-dim">{pref.signal}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-cyan">
                            How the AI reasons
                          </p>
                          <p className="text-[0.82rem] leading-relaxed text-ink-dim">{pref.reasoning}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-green">
                            Already done
                          </p>
                          <p className="text-[0.82rem] leading-relaxed text-ink">{pref.action}</p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-6 pb-4 text-center text-[0.7rem] leading-relaxed text-ink-faint">
              Every inference is explainable, correctable, and yours to delete.
              <br />
              That&apos;s memory with consent — not surveillance.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
