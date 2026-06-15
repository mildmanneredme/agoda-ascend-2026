"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AscendLogo } from "@/components/Wordmark";
import { PILLARS, type PillarKey } from "@/components/AppHeader";
import PersonaAvatar from "@/components/PersonaAvatar";
import { loadGuest, styleOf, type GuestProfile } from "@/lib/guest";
import { personaOf, stayOf } from "@/lib/personas";

type SandboxApp = {
  href?: string;
  name: string;
  hook: string;
  emoji: string;
  pillar: PillarKey;
};

const APPS: SandboxApp[] = [
  {
    href: "/apps/offer-builder",
    name: "Offer Builder",
    hook: "Watch AI turn a $200 room into your room",
    emoji: "◈",
    pillar: "know-me",
  },
  {
    href: "/apps/memory-engine",
    name: "Guest Memory",
    hook: "See what the hotel already knows about you — and why",
    emoji: "◉",
    pillar: "know-me",
  },
  {
    href: "/apps/concierge",
    name: "AI Concierge",
    hook: "Chat with staff that never sleeps and never forgets",
    emoji: "✦",
    pillar: "already-handled",
  },
  {
    href: "/apps/journey",
    name: "Journey Assistant",
    hook: "Your flight is delayed. The hotel already acted.",
    emoji: "✈",
    pillar: "already-handled",
  },
  {
    href: "/apps/sentiment",
    name: "Sentiment Lab",
    hook: "A guest review becomes a task list in seconds",
    emoji: "❋",
    pillar: "human-edge",
  },
  {
    href: "/apps/mice",
    name: "MICE Co-Pilot",
    hook: "A full event proposal in 30 seconds",
    emoji: "▣",
    pillar: "human-edge",
  },
  {
    href: "/apps/care-radar",
    name: "EQ Radar",
    hook: "See how every in-house guest is really feeling",
    emoji: "◎",
    pillar: "human-edge",
  },
];

const PILLAR_ORDER: PillarKey[] = ["know-me", "already-handled", "human-edge"];

// Per-persona "we already prepared for you" payoff line — proves the hotel knew them.
const PERSONA_DETAIL: Record<string, string> = {
  elena: "Your high-floor neural king is ready — late checkout approved.",
  marcus: "Connecting rooms held, kids' breakfast set for 7am, pool's open.",
  aiko: "A quiet room away from the lift is held — blackout curtains, fast wifi.",
  priya: "River-view room, a spa slot pencilled in, breakfast left open and slow.",
  lucas: "The riverside Thai-Isan table you loved is rebooked for 21:30.",
  jordan: "Sunrise paddle and a night-market route are queued with our partners.",
};

/** One personalized detail line for the hub greeting cascade. */
function greetingDetail(guest: GuestProfile): string {
  const persona = personaOf(guest);
  if (persona) {
    return PERSONA_DETAIL[persona.id] ?? persona.tagline;
  }
  const style = styleOf(guest);
  const stay = stayOf(guest);
  return `We've primed The Grand Neural around how you travel — ${style.label.toLowerCase()} — for your ${stay.nights}-night stay.`;
}

export default function Hub() {
  const router = useRouter();
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = loadGuest();
    if (!g) {
      router.replace("/");
      return;
    }
    setGuest(g);
    setReady(true);
  }, [router]);

  // Close the identity card on outside tap / Escape.
  useEffect(() => {
    if (!cardOpen) return;
    function onDown(e: PointerEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setCardOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCardOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [cardOpen]);

  if (!ready || !guest) return null;
  const style = styleOf(guest);
  const persona = personaOf(guest);
  const signal = persona?.signals[0];
  const roleLabel = persona?.role ?? style.label;

  return (
    <main className="relative min-h-dvh overflow-hidden pb-12">

      <div className="pt-safe relative z-10 px-6 pt-4">
        <div className="mb-8 flex items-start justify-between">
          <Link href="/" aria-label="Back to home" className="press">
            <AscendLogo height={28} />
          </Link>
          <div ref={cardRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCardOpen((o) => !o)}
              aria-haspopup="dialog"
              aria-expanded={cardOpen}
              aria-label="Your profile"
              className="press glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[0.7rem] font-semibold text-ink-dim"
            >
              <PersonaAvatar
                id={guest.personaId ?? ""}
                glyph={style.emoji}
                color={style.color}
                size="h-8 w-8"
                rounded="rounded-full"
              />
              {guest.name}
            </button>

            {cardOpen && (
              <div
                role="dialog"
                aria-label={`${guest.name}'s profile`}
                className="bloom glass-deep absolute right-0 top-[calc(100%+0.6rem)] z-50 w-72 rounded-2xl p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
                style={{ boxShadow: `inset 2px 0 0 ${style.color}` }}
              >
                <div className="flex items-center gap-3">
                  <PersonaAvatar
                    id={guest.personaId ?? ""}
                    glyph={style.emoji}
                    color={style.color}
                    size="h-12 w-12"
                    rounded="rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="display truncate text-base font-semibold text-ink">{guest.name}</p>
                    <p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: style.color }}>
                      {roleLabel}
                    </p>
                  </div>
                </div>

                {signal && (
                  <div className="mt-3 rounded-xl border border-hairline p-3">
                    <p className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-ink-faint">
                      On file
                    </p>
                    <p className="text-[0.78rem] leading-snug text-ink-dim">{signal}</p>
                  </div>
                )}

                <Link
                  href="/?choose=1"
                  className="press mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 font-display text-[0.82rem] font-semibold text-abyss"
                >
                  Be someone else
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>

        <header className="stagger mb-9">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-ray-aqua">
            The Grand Neural · Bangkok
          </p>
          <h1 className="display text-[2.1rem] font-bold leading-[1.08]">
            Good to see you,{" "}
            <span className="prism-text">{guest.name}</span>.
          </h1>
          <p
            className="mt-3 max-w-[36ch] font-display text-[0.95rem] font-medium leading-relaxed text-ink"
            style={{ animationDelay: "0.42s" }}
          >
            {greetingDetail(guest)}
          </p>
          <p
            className="mt-3 max-w-[36ch] text-sm leading-relaxed text-ink-dim"
            style={{ animationDelay: "0.62s" }}
          >
            Seven ways this hotel thinks ahead of you. All live — start anywhere.
          </p>
        </header>

        <Link href="/property" className="press mb-8 block overflow-hidden rounded-2xl">
          <div className="glass-deep flex items-center gap-4 rounded-2xl p-4" style={{ boxShadow: "inset 2px 0 0 var(--ray-aqua)" }}>
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ color: "var(--ray-aqua)", background: "color-mix(in srgb, var(--ray-aqua) 12%, transparent)" }}
            >
              ⌖
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="display text-base font-semibold text-ink">Explore the property</h3>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-ink-dim">
                Pool, spa, gym, dining, chauffeur, events — meet The Grand Neural.
              </p>
            </div>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0 text-ink-faint">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>

        {PILLAR_ORDER.map((pillarKey) => {
          const pillar = PILLARS[pillarKey];
          const apps = APPS.filter((a) => a.pillar === pillarKey);
          return (
            <section key={pillarKey} className="mb-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2
                  className="display text-sm font-semibold uppercase tracking-[0.18em]"
                  style={{ color: pillar.color }}
                >
                  {pillar.label}
                </h2>
                <span className="text-[0.7rem] italic text-ink-faint">“{pillar.feeling}”</span>
              </div>
              <div className="stagger flex flex-col gap-3">
                {apps.map((app) => {
                  const card = (
                    <div
                      className={`press relative flex items-center gap-4 overflow-hidden rounded-2xl p-4 ${
                        app.href ? "glass-deep" : "glass opacity-55"
                      }`}
                      style={
                        app.href
                          ? { boxShadow: `inset 2px 0 0 ${pillar.color}` }
                          : undefined
                      }
                    >
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
                        style={{
                          color: pillar.color,
                          background: `color-mix(in srgb, ${pillar.color} 12%, transparent)`,
                        }}
                      >
                        {app.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="display text-base font-semibold text-ink">{app.name}</h3>
                        <p className="mt-0.5 text-[0.8rem] leading-snug text-ink-dim">{app.hook}</p>
                      </div>
                      {app.href ? (
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0 text-ink-faint">
                          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                          Soon
                        </span>
                      )}
                    </div>
                  );
                  return app.href ? (
                    <Link key={app.name} href={app.href}>
                      {card}
                    </Link>
                  ) : (
                    <div key={app.name}>{card}</div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <footer className="mt-12 flex flex-col items-center gap-2 pb-6 text-center">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-faint">
            A sandbox by
          </p>
          <AscendLogo height={24} />
        </footer>
      </div>
    </main>
  );
}
