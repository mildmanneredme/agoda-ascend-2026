"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import HeroVideo from "@/components/HeroVideo";
import PersonaAvatar from "@/components/PersonaAvatar";
import { AscendLogo, GrandNeuralMark } from "@/components/Wordmark";
import { TRAVEL_STYLES, saveGuest, type GuestProfile } from "@/lib/guest";
import { PERSONAS, styleForPersona, type Persona } from "@/lib/personas";
import { useDevTrace } from "@/components/DevTrace";

type Stage = "welcome" | "gallery" | "name" | "style" | "sync";

function syncLines(name: string, kind: "loading" | "creating") {
  const lead = kind === "loading"
    ? `Loading ${name || "your"}'s profile…`
    : `Creating ${name || "your"} profile…`;
  return [
    lead,
    "Seeding preferences across the property…",
    `The Grand Neural now knows ${name || "you"} is coming.`,
  ];
}
const SYNC_COUNT = 3;

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { record } = useDevTrace();
  // The hub's profile button deep-links here with ?choose to open the chooser directly.
  const [stage, setStage] = useState<Stage>(searchParams.get("choose") !== null ? "gallery" : "welcome");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [name, setName] = useState("");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [syncName, setSyncName] = useState("");
  const [syncKind, setSyncKind] = useState<"loading" | "creating">("loading");
  const [syncStep, setSyncStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "name") inputRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (stage !== "sync") return;
    if (syncStep < SYNC_COUNT) {
      const t = setTimeout(() => setSyncStep((s) => s + 1), 850);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => router.push("/hub"), 900);
    return () => clearTimeout(t);
  }, [stage, syncStep, router]);

  function seedTrace(guest: GuestProfile, persona: Persona | null) {
    const styleLabel = persona
      ? styleForPersona(persona).label
      : TRAVEL_STYLES.find((s) => s.id === guest.styleId)?.label ?? "";
    record({
      appKey: "onboarding",
      title: `Seeded ${guest.name}'s profile across the property`,
      model: "rules engine",
      steps: [
        { agentId: "memory", note: persona ? `Loaded ${guest.name}'s history from 3 sister properties` : `Created a fresh profile for ${guest.name}` },
        { agentId: "personalization", note: `Primed preferences for this stay · declared "${styleLabel}"` },
      ],
      sections: [
        {
          label: "Profile seed",
          body: persona
            ? persona.brief
            : `${guest.name} — declared travel preference: "${styleLabel}". No prior stay history; the hotel will learn from behaviour during this visit.`,
        },
        {
          label: "Signals on file",
          body: persona ? persona.signals.map((s) => `• ${s}`).join("\n") : "• (none yet — new guest)",
        },
      ],
    });
  }

  function pickPersona(p: Persona) {
    const guest: GuestProfile = {
      name: p.name,
      styleId: p.styleId,
      personaId: p.id,
      createdAt: new Date().toISOString(),
    };
    saveGuest(guest);
    seedTrace(guest, p);
    setSyncName(p.name);
    setSyncKind("loading");
    setStage("sync");
  }

  function beginCustom() {
    const guest: GuestProfile = {
      name: name.trim(),
      styleId: styleId!,
      createdAt: new Date().toISOString(),
    };
    saveGuest(guest);
    seedTrace(guest, null);
    setSyncName(guest.name);
    setSyncKind("creating");
    setStage("sync");
  }

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <HeroVideo />

      <div className="pt-safe relative z-10 flex items-center justify-between px-6 pt-4">
        <button onClick={() => setStage("welcome")} className="press" aria-label="Back to home">
          <AscendLogo height={26} />
        </button>
        <Link
          href="/property"
          className="press glass flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.7rem] font-semibold text-ink-dim"
        >
          Explore the hotel
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-ink-faint">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <div key={stage} className="phase-in pb-safe relative z-10 flex flex-1 flex-col justify-end px-6">
        {stage === "welcome" && (
          <div className="stagger mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-ray-aqua">
              Agoda Ascend 2026 presents
            </p>
            <h1 className="display mb-4 text-[2.6rem] font-bold leading-[1.04]">
              <span className="block">Welcome to</span>
              <GrandNeuralMark className="block" />
              <span className="prism-text block">the hotel of tomorrow.</span>
            </h1>
            <p className="mb-8 max-w-[34ch] text-[0.95rem] leading-relaxed text-ink-dim">
              Welcome to our AI Sandbox — see how AI is reshaping hotels. Choose a guest and
              experience the journey.
            </p>
            <button
              onClick={() => setShowDisclaimer(true)}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss shadow-[0_0_40px_rgba(75,234,234,0.25)]"
            >
              Welcome to the Neural
            </button>
          </div>
        )}

        {stage === "gallery" && (
          <div className="mb-4 flex max-h-[82dvh] flex-col">
            <p className="rise mb-1 text-xs font-semibold uppercase tracking-[0.28em] text-ray-aqua">
              Be the guest
            </p>
            <h2 className="rise display mb-1 text-3xl font-bold leading-tight">
              Who are you today?
            </h2>
            <p className="rise mb-5 text-sm text-ink-dim">
              Each traveler arrives with their own history. Pick one to step into their stay.
            </p>
            <div className="stagger -mx-1 flex flex-col gap-2.5 overflow-y-auto px-1 pb-2">
              {PERSONAS.map((p) => {
                const c = styleForPersona(p).color;
                return (
                  <button
                    key={p.id}
                    onClick={() => pickPersona(p)}
                    className="press glass-deep flex items-center gap-4 rounded-2xl p-4 text-left"
                    style={{ boxShadow: `inset 2px 0 0 ${c}` }}
                  >
                    <PersonaAvatar id={p.id} glyph={p.glyph} color={c} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="display text-lg font-semibold text-ink">{p.name}</span>
                        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em]" style={{ color: c }}>
                          {p.role}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-dim">
                        {p.tagline}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStage("name")}
              className="press mt-2 shrink-0 py-2 text-center text-sm font-semibold text-ink-dim"
            >
              … or be yourself →
            </button>
          </div>
        )}

        {stage === "name" && (
          <div className="stagger mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-ray-aqua">
              Be yourself · Step 1 of 2
            </p>
            <h2 className="display mb-6 text-3xl font-bold leading-tight">
              What should the hotel<br />call you?
            </h2>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStage("style")}
              placeholder="Your first name"
              autoComplete="given-name"
              maxLength={24}
              className="glass-deep mb-4 w-full rounded-2xl px-5 py-4 font-display text-xl font-semibold text-ink caret-ray-aqua outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink-faint focus:border-ray-aqua/50 focus:shadow-[0_0_30px_rgba(75,234,234,0.15)]"
            />
            <button
              onClick={() => setStage("style")}
              disabled={!name.trim()}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss transition-opacity disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}

        {stage === "style" && (
          <div className="mb-6">
            <p className="rise mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-ray-aqua">
              Be yourself · Step 2 of 2
            </p>
            <h2 className="rise display mb-6 text-3xl font-bold leading-tight">
              {name.trim()}, how do you travel?
            </h2>
            <div className="stagger mb-5 grid grid-cols-2 gap-3">
              {TRAVEL_STYLES.map((s) => {
                const selected = styleId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    className={`press rounded-2xl border p-4 text-left transition-all ${
                      selected ? "glass-deep" : "glass"
                    }`}
                    style={
                      selected
                        ? { borderColor: s.color, boxShadow: `0 0 24px color-mix(in srgb, ${s.color} 30%, transparent)` }
                        : undefined
                    }
                  >
                    <span className="mb-2 block text-2xl">{s.emoji}</span>
                    <span className="block text-[0.83rem] font-semibold leading-snug text-ink">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={beginCustom}
              disabled={!styleId}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss transition-opacity disabled:opacity-30"
            >
              Check me in
            </button>
          </div>
        )}

        {stage === "sync" && (
          <div className="mb-10">
            {syncLines(syncName, syncKind).slice(0, syncStep + 1).map((line, i) => (
              <p
                key={line}
                className={`rise mb-3 font-display text-lg font-medium ${
                  i === SYNC_COUNT - 1 ? "prism-text font-semibold" : "text-ink-dim"
                }`}
              >
                {line}
              </p>
            ))}
            <div className="thinking-dots mt-4 flex gap-1.5">
              <span /><span /><span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {showDisclaimer && (
        <div className="pb-safe pt-safe fixed inset-0 z-[80] flex items-center justify-center px-6">
          <button
            aria-label="Dismiss"
            onClick={() => setShowDisclaimer(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="disclaimer-title"
            className="glass-deep rise relative z-10 w-full max-w-md rounded-3xl p-6"
          >
            <button
              onClick={() => setShowDisclaimer(false)}
              aria-label="Close"
              className="press absolute right-4 top-4 text-ink-faint hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-ray-aqua">
              Demonstration only
            </p>
            <h2 id="disclaimer-title" className="display mb-4 text-2xl font-bold leading-tight">
              Before you step in
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-ink-dim">
              This is a demonstration sandbox. It is <span className="font-semibold text-ink">not a real
              application</span> and <span className="font-semibold text-ink">The Grand Neural is not a real
              hotel</span>. No information shown is real customer data — every guest, booking and AI response
              is fictional and for demonstration purposes only. Agoda accepts no liability for any information
              presented within this experience.
            </p>
            <p className="mb-6 text-xs leading-relaxed text-ink-faint">
              By proceeding you agree to our{" "}
              <a
                href="https://www.agoda.com/info/termsofuse.html?ds=MS2LSmQq%2B14uv29B"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink underline underline-offset-2"
              >
                Terms of Use
              </a>
              .
            </p>
            <button
              onClick={() => {
                setShowDisclaimer(false);
                setStage("gallery");
              }}
              className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss shadow-[0_0_40px_rgba(75,234,234,0.25)]"
            >
              Proceed
            </button>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="press mt-1 w-full py-3 text-center text-sm font-semibold text-ink-dim"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Onboarding() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
