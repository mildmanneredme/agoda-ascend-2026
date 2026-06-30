"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PersonaAvatar from "@/components/PersonaAvatar";
import { loadGuest, styleOf, type GuestProfile } from "@/lib/guest";

export const PILLARS = {
  "know-me": { label: "Know Me", color: "var(--ray-aqua)", feeling: "I am known" },
  "already-handled": { label: "Already Handled", color: "var(--ray-amber)", feeling: "I am safe" },
  "human-edge": { label: "Human Edge", color: "var(--ray-magenta)", feeling: "I am cared for" },
} as const;

export type PillarKey = keyof typeof PILLARS;

export function PillarBadge({ pillar }: { pillar: PillarKey }) {
  const p = PILLARS[pillar];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em]"
      style={{ color: p.color, borderColor: "color-mix(in srgb, " + p.color + " 35%, transparent)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
      {p.label}
    </span>
  );
}

export type Perspective = "guest" | "hotel";

const PERSPECTIVES = {
  guest: { label: "Guest view", color: "var(--ray-aqua)" },
  hotel: { label: "Hotel staff view", color: "var(--ray-amber)" },
} as const;

/** Who is the intended user of this feature — the guest, or hotel staff. */
export function PerspectiveBadge({ perspective }: { perspective: Perspective }) {
  const p = PERSPECTIVES[perspective];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
      {p.label}
    </span>
  );
}

/** App-wide handling marker. */
export function ConfidentialTag() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-ink-faint"
      style={{ borderColor: "color-mix(in srgb, var(--ray-amber) 30%, transparent)" }}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Private &amp; Confidential
    </span>
  );
}

export default function AppHeader({
  title,
  pillar,
  perspective,
}: {
  title: string;
  pillar: PillarKey;
  perspective: Perspective;
}) {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  useEffect(() => {
    setGuest(loadGuest());
  }, []);
  const style = guest ? styleOf(guest) : null;

  return (
    <header className="pt-safe sticky top-0 z-40 px-5 pb-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/hub"
          className="press glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-dim"
          aria-label="Back to hub"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="display min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
        <PillarBadge pillar={pillar} />
        {guest && style && (
          <Link
            href="/?choose=1"
            aria-label={`${guest.name} · change guest`}
            title={`${guest.name} · tap to switch`}
            className="press glass flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5"
          >
            <PersonaAvatar
              id={guest.personaId ?? ""}
              glyph={style.emoji}
              color={style.color}
              size="h-9 w-9"
              rounded="rounded-full"
            />
            <span className="max-w-[5.5rem] truncate text-[0.7rem] font-semibold text-ink-dim">
              {guest.name}
            </span>
          </Link>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <PerspectiveBadge perspective={perspective} />
        <ConfidentialTag />
      </div>
    </header>
  );
}
