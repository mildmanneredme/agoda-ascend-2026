"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Media from "@/components/Media";
import { useArtStyle } from "@/lib/artStyle";
import { HOTEL } from "@/lib/hotel";
import { loadGuest, styleOf, type GuestProfile } from "@/lib/guest";
import { personaOf, stayOf } from "@/lib/personas";
import { useDevTrace } from "@/components/DevTrace";
import { prettyJson } from "@/lib/trace";
import LiveReasoning from "@/components/LiveReasoning";

type Offer = {
  bundleName: string;
  tagline: string;
  base: number;
  items: Array<{ id: string; label: string; price: number; why: string }>;
  total: number;
  liftPct: number;
  _debug?: { prompt: string; rawResponse: string; model: string; latencyMs: number };
};

type Phase = "intake" | "searching" | "results" | "thinking" | "reveal" | "booked";

const THINK_LINES = [
  "Reading guest signals…",
  "Pricing what matters to you…",
];

// Fictional Bangkok hotels so the result list reads like a real search
// (invented names — not real properties).
const COMPETITORS = [
  { name: "Baan Saen Riverside", stars: 5, area: "Riverside", score: 8.9, reviews: 2140, price: 240 },
  { name: "Sukhumvit Orchid Suites", stars: 4, area: "Sukhumvit", score: 8.4, reviews: 3890, price: 165 },
  { name: "Phra Nakhon Heritage House", stars: 4, area: "Old Town", score: 8.7, reviews: 1205, price: 132 },
  { name: "Sathorn Pearl Tower", stars: 5, area: "Sathorn", score: 8.6, reviews: 980, price: 210 },
];

function usePriceTicker(target: number, start: number, run: boolean) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (!run) return;
    const t0 = performance.now();
    const dur = 1400;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, run]);
  return value;
}

export default function OfferBuilder() {
  const router = useRouter();
  const { record } = useDevTrace();
  const [style] = useArtStyle();
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [phase, setPhase] = useState<Phase>("intake");
  const [trip, setTrip] = useState<{ city: string; checkIn: string; checkOut: string; guests: number } | null>(null);
  const [thinkStep, setThinkStep] = useState(0);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Progressive reveal: step 1 = bundle name, 2 = tagline, 3.. = one item each.
  const [revealStep, setRevealStep] = useState(0);
  const showName = revealStep >= 1;
  const showTagline = revealStep >= 2;
  const visibleItems = Math.max(0, revealStep - 2);
  const tickerRun = offer !== null && visibleItems >= offer.items.length;
  const price = usePriceTicker(offer?.total ?? 0, offer?.base ?? 0, tickerRun);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const g = loadGuest();
    if (!g) {
      router.replace("/");
      return;
    }
    setGuest(g);
    const s = stayOf(g);
    setTrip({ city: s.city, checkIn: s.checkIn, checkOut: s.checkOut, guests: s.guests });
  }, [router]);

  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setInterval(() => setThinkStep((s) => Math.min(s + 1, THINK_LINES.length - 1)), 900);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "reveal" || !offer) return;
    // total steps: 1 (name) + 1 (tagline) + one per item
    const lastStep = 2 + offer.items.length;
    if (revealStep >= lastStep) return;
    // name lands quickly; tagline a beat later; items pace ~360ms apart.
    const delay = revealStep === 0 ? 220 : revealStep === 1 ? 380 : 360;
    const t = setTimeout(() => setRevealStep((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [phase, offer, revealStep]);

  function search() {
    setPhase("searching");
    setTimeout(() => setPhase("results"), 1100);
  }

  async function build() {
    if (!guest) return;
    const s = styleOf(guest);
    const current = personaOf(guest);
    const meBrief = current
      ? current.brief
      : `${guest.name}, a real guest whose declared travel style is "${s.label}". Build the bundle for them personally.`;
    setPhase("thinking");
    setThinkStep(0);
    setError(null);
    setRevealStep(0);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName: guest.name, persona: meBrief }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Offer;
      setOffer(data);
      setPhase("reveal");

      const pricing = [
        `base ${data.base}`,
        ...data.items.map((it) => `+ ${it.price}  (${it.label})`),
        `= ${data.total}  → +${data.liftPct}% RevPAR`,
      ].join("\n");
      record({
        appKey: "offer-builder",
        title: `Composed the ${data.bundleName} for ${guest.name}`,
        model: data._debug?.model,
        latencyMs: data._debug?.latencyMs,
        steps: [
          { agentId: "memory", note: `Read ${guest.name}'s preference signals` },
          { agentId: "booking", note: `Unbundled the room into ${data.items.length} attributes` },
          { agentId: "revenue", note: `Priced the bundle at $${data.total} (+${data.liftPct}% RevPAR)` },
        ],
        sections: [
          { label: "Prompt → Gemini", body: data._debug?.prompt ?? "(unavailable)", mono: true },
          { label: "Structured response", body: prettyJson(data._debug?.rawResponse ?? "{}"), mono: true },
          { label: "Pricing (computed server-side)", body: pricing, mono: true },
        ],
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("The booking engine hiccuped — try again.");
      setPhase("results");
    }
  }

  if (!guest || !trip) return null;
  const stay = stayOf(guest);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AppHeader title="Offer Builder" pillar="know-me" />

      <div className="relative z-10 px-5 pb-safe">
        {/* ---------- INTAKE: chat with the booking agent ---------- */}
        {phase === "intake" && (
          <div className="pt-2">
            <p className="rise mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-ray-aqua">
              Plan your stay
            </p>
            <h2 className="rise display mb-5 text-2xl font-bold leading-tight">
              Let&apos;s find <span className="prism-text">{guest.name}&apos;s</span> room.
            </h2>

            <div className="stagger flex flex-col gap-3">
              <div className="glass flex items-start gap-3 rounded-2xl rounded-tl-sm p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ray-aqua/15 text-sm">✦</span>
                <p className="text-[0.88rem] leading-relaxed text-ink">
                  Hi {guest.name} — I&apos;m your booking agent. Here&apos;s the trip I have for your{" "}
                  <span className="text-ray-aqua">{stay.occasion.toLowerCase()}</span>. Tweak anything, then I&apos;ll search.
                </p>
              </div>

              <div className="glass-deep rounded-2xl p-4">
                <Field label="Destination">
                  <input
                    value={trip.city}
                    onChange={(e) => setTrip({ ...trip, city: e.target.value })}
                    className="w-full bg-transparent font-display text-lg font-semibold text-ink outline-none"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
                  <Field label="Check-in">
                    <input
                      value={trip.checkIn}
                      onChange={(e) => setTrip({ ...trip, checkIn: e.target.value })}
                      className="w-full bg-transparent font-display text-base font-semibold text-ink outline-none"
                    />
                  </Field>
                  <Field label="Check-out">
                    <input
                      value={trip.checkOut}
                      onChange={(e) => setTrip({ ...trip, checkOut: e.target.value })}
                      className="w-full bg-transparent font-display text-base font-semibold text-ink outline-none"
                    />
                  </Field>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                  <span className="text-[0.6rem] uppercase tracking-[0.16em] text-ink-faint">Guests</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTrip({ ...trip, guests: Math.max(1, trip.guests - 1) })}
                      className="press glass flex h-8 w-8 items-center justify-center rounded-full text-lg text-ink"
                    >
                      −
                    </button>
                    <span className="display w-6 text-center text-lg font-bold tabular-nums">{trip.guests}</span>
                    <button
                      onClick={() => setTrip({ ...trip, guests: Math.min(9, trip.guests + 1) })}
                      className="press glass flex h-8 w-8 items-center justify-center rounded-full text-lg text-ink"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={search}
                className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss shadow-[0_0_40px_rgba(75,234,234,0.25)]"
              >
                Search hotels →
              </button>
            </div>
          </div>
        )}

        {/* ---------- SEARCHING ---------- */}
        {phase === "searching" && (
          <div className="flex flex-col items-start pt-[26vh]">
            <p className="rise font-display text-lg font-medium text-ink">
              Searching {trip.city} · {trip.guests} {trip.guests === 1 ? "guest" : "guests"}…
            </p>
            <div className="thinking-dots mt-3 flex gap-1.5">
              <span /><span /><span /><span /><span />
            </div>
          </div>
        )}

        {/* ---------- RESULTS: Agoda-style list, Grand Neural #1 ---------- */}
        {phase === "results" && (
          <div className="pt-2">
            <div className="rise mb-4 flex items-center justify-between">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">
                  {trip.city} · {trip.checkIn}–{trip.checkOut}
                </p>
                <p className="display text-lg font-bold">{COMPETITORS.length + 1} stays found</p>
              </div>
              <button onClick={() => setPhase("intake")} className="press glass rounded-full px-3 py-1.5 text-[0.7rem] font-semibold text-ink-dim">
                Edit
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-xl border border-ray-red/40 bg-ray-red/10 px-4 py-3 text-sm text-ink">{error}</p>
            )}

            {/* The Grand Neural — pinned, highlighted, actionable */}
            <button
              onClick={build}
              className="press bloom relative mb-3 block w-full overflow-hidden rounded-2xl text-left glass-deep"
              style={{ boxShadow: "inset 0 0 0 1.5px var(--ray-aqua), 0 0 34px rgba(75,234,234,0.18)" }}
            >
              <span className="absolute left-3 top-3 z-10 rounded-full bg-ray-aqua px-2.5 py-1 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-abyss">
                AI-matched · #1 for you
              </span>
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Media slug={HOTEL.heroImage} style={style} alt={HOTEL.name} sizes="(max-width: 768px) 100vw, 768px" />
                <div className="absolute inset-0 bg-gradient-to-t from-abyss/70 to-transparent" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="display text-lg font-semibold text-ink">{HOTEL.name}</h3>
                    <p className="mt-0.5 text-[0.74rem] text-ink-dim">★★★★★ · Riverside, {HOTEL.city}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-ray-aqua px-2 py-1 text-xs font-bold text-abyss">9.4</span>
                </div>
                <p className="mt-2 text-[0.78rem] leading-snug text-ray-aqua">
                  Perfect for your {stay.occasion.toLowerCase()} — the AI can tailor this room to you.
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                  <span className="text-sm text-ink-dim">
                    from <span className="display text-lg font-bold text-ink">${HOTEL.baseRoom.price}</span> / night
                  </span>
                  <span className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-abyss">
                    Build my offer →
                  </span>
                </div>
              </div>
            </button>

            <p className="mb-2 mt-4 px-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Other stays in {trip.city}
            </p>
            <div className="flex flex-col gap-2.5">
              {COMPETITORS.map((c) => (
                <div key={c.name} className="glass flex gap-3 rounded-2xl p-3 opacity-70">
                  <div className="h-16 w-20 shrink-0 rounded-xl bg-gradient-to-br from-navy-raise to-abyss" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[0.92rem] font-semibold text-ink">{c.name}</h4>
                    <p className="mt-0.5 text-[0.72rem] text-ink-faint">
                      {"★".repeat(c.stars)} · {c.area}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[0.72rem] text-ink-dim">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold text-ink">{c.score}</span>
                        {c.reviews.toLocaleString()} reviews
                      </span>
                      <span className="text-[0.8rem] text-ink-dim">
                        <span className="font-semibold text-ink">${c.price}</span>/night
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- THINKING ---------- */}
        {phase === "thinking" && (
          <div className="flex flex-col items-stretch pt-[12vh]">
            <p className="rise mb-4 font-display text-lg font-medium text-ink">
              {THINK_LINES[Math.min(thinkStep, THINK_LINES.length - 1)]}
            </p>
            <LiveReasoning appKey="offer-builder" active={phase === "thinking"} />
            <div className="thinking-dots mt-4 flex gap-1.5">
              <span /><span /><span /><span /><span />
            </div>
          </div>
        )}

        {/* ---------- REVEAL / BOOKED ---------- */}
        {(phase === "reveal" || phase === "booked") && offer && (
          <div className="pt-2">
            <div className="bloom glass-deep foil mb-4 rounded-3xl p-5">
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ray-aqua">
                Composed for {guest.name}
              </p>
              <h2 className="display min-h-[2rem] text-2xl font-bold">
                {showName && <span className="phase-in inline-block">{offer.bundleName}</span>}
              </h2>
              <p className="mt-1 min-h-[1.25rem] text-[0.85rem] italic text-ink-dim">
                {showTagline && <span className="phase-in inline-block">“{offer.tagline}”</span>}
              </p>

              <div className="mt-5 flex items-end justify-between border-t border-hairline pt-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.16em] text-ink-faint">Neural King · per night</p>
                  <p
                    key={tickerRun ? "total" : "base"}
                    className={`display mt-1 text-4xl font-bold tabular-nums ${tickerRun ? "scale-pop" : ""}`}
                  >
                    ${tickerRun ? price : offer.base}
                  </p>
                </div>
                {tickerRun && (
                  <span className="scale-pop mb-1 rounded-full bg-ray-green/15 px-3 py-1.5 text-xs font-bold text-ray-green">
                    +{offer.liftPct}% RevPAR
                  </span>
                )}
              </div>

              {tickerRun && (
                <p className="phase-in mt-3 border-t border-hairline pt-3 text-[0.74rem] leading-snug text-ink-dim">
                  Where the value went: a ${offer.base} base room became a ${offer.total} stay —
                  every extra dollar maps to something {guest.name} actually wanted.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {offer.items.slice(0, visibleItems).map((item) => (
                <div key={item.id} className="slide-in-left glass flex items-center gap-3 rounded-xl px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.88rem] font-semibold text-ink">{item.label}</p>
                    <p className="text-[0.74rem] leading-snug text-ink-dim">
                      <span className="font-semibold text-ray-aqua">+${item.price}</span>
                      <span className="text-ink-faint"> · {item.why}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {tickerRun && phase === "reveal" && (
              <div className="rise mt-5 flex flex-col gap-3">
                <button
                  onClick={() => setPhase("booked")}
                  className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss shadow-[0_0_40px_rgba(75,234,234,0.25)]"
                >
                  Book the {offer.bundleName} — ${offer.total}
                </button>
                <button
                  onClick={() => {
                    setOffer(null);
                    setPhase("results");
                  }}
                  className="press w-full rounded-2xl py-3 text-sm font-semibold text-ink-dim"
                >
                  Back to results
                </button>
              </div>
            )}

            {phase === "booked" && (
              <div className="bloom mt-5 rounded-2xl border border-ray-green/30 bg-ray-green/10 p-5 text-center">
                <p className="display mb-1 text-lg font-semibold text-ray-green">Booked ✓</p>
                <p className="text-sm text-ink-dim">
                  A $200 room just became a ${offer.total} stay — and {guest.name} got exactly what they
                  wanted. That&apos;s attribute-based booking.
                </p>
                <button
                  onClick={() => {
                    setOffer(null);
                    setPhase("intake");
                  }}
                  className="press mt-4 text-sm font-semibold text-ink"
                >
                  Plan another stay →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.6rem] uppercase tracking-[0.16em] text-ink-faint">{label}</span>
      {children}
    </label>
  );
}
