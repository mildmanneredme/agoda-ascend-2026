"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AscendMark } from "@/components/Wordmark";
import { PILLARS, type PillarKey } from "@/components/AppHeader";
import PersonaAvatar from "@/components/PersonaAvatar";
import { loadGuest, styleOf, type GuestProfile } from "@/lib/guest";

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
    href: "/apps/intent",
    name: "Intent Engine",
    hook: "Type in any language. Be perfectly understood.",
    emoji: "⟡",
    pillar: "human-edge",
  },
];

const PILLAR_ORDER: PillarKey[] = ["know-me", "already-handled", "human-edge"];

export default function Hub() {
  const router = useRouter();
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const g = loadGuest();
    if (!g) {
      router.replace("/");
      return;
    }
    setGuest(g);
    setReady(true);
  }, [router]);

  if (!ready || !guest) return null;
  const style = styleOf(guest);

  return (
    <main className="relative min-h-dvh overflow-hidden pb-12">

      <div className="pt-safe relative z-10 px-6 pt-4">
        <div className="mb-8 flex items-start justify-between">
          <Link href="/" aria-label="Back to home" className="press">
            <AscendMark />
          </Link>
          <Link
            href="/?choose=1"
            aria-label="Change guest"
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
          </Link>
        </div>

        <header className="rise mb-9">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-ray-aqua">
            The Grand Neural · Bangkok
          </p>
          <h1 className="display text-[2.1rem] font-bold leading-[1.08]">
            Good to see you,{" "}
            <span className="prism-text">{guest.name}</span>.
          </h1>
          <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-ink-dim">
            Seven ways this hotel thinks ahead of you. All live — start anywhere.
          </p>
        </header>

        <Link href="/property" className="press foil mb-8 block overflow-hidden rounded-2xl">
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

        <footer className="mt-12 flex flex-col items-center gap-1 pb-6 text-center">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-faint">
            A sandbox by
          </p>
          <AscendMark />
        </footer>
      </div>
    </main>
  );
}
