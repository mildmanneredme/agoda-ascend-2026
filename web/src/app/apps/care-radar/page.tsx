"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import PersonaAvatar from "@/components/PersonaAvatar";
import LiveReasoning from "@/components/LiveReasoning";
import { useDevTrace } from "@/components/DevTrace";
import { prettyJson } from "@/lib/trace";
import {
  IN_HOUSE,
  CARE_COLOR,
  CARE_COUNTS,
  STATUS_LABEL,
  byUrgency,
  guestById,
  type InHouseGuest,
  type CareStatus,
} from "@/lib/careRadar";

const HotelScene = dynamic(() => import("./HotelScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="thinking-dots flex gap-1.5"><span /><span /><span /><span /><span /></span>
    </div>
  ),
});

type Read = {
  emotion: string;
  intensity: number;
  occasion: string;
  unspokenNeed: string;
  evidence: Array<{ signal: string; reads: string }>;
  careBrief: string;
  doNow: string[];
  restraint: string[];
  guestReply: string;
  language?: string;
  flag?: string;
  sensitivityFlag: boolean;
  _debug?: { prompt: string; rawResponse: string; model: string; latencyMs: number };
};

// Can we run the WebGL scene? (false on the server + when reduced-motion is set,
// so the static roster is rendered instead.) Computed once, lint-safe via
// useSyncExternalStore rather than a state-setting effect.
let _can3d: boolean | null = null;
function canRender3D(): boolean {
  if (_can3d !== null) return _can3d;
  if (typeof window === "undefined") return false;
  try {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = document.createElement("canvas");
    const gl = window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"));
    _can3d = !!gl && !reduce;
  } catch {
    _can3d = false;
  }
  return _can3d;
}
const noop = () => () => {};
function useCanRender3D() {
  return useSyncExternalStore(noop, canRender3D, () => false);
}

export default function CareRadar() {
  const { record } = useDevTrace();
  const can3d = useCanRender3D();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cache = useRef<Map<string, Read>>(new Map());

  const selected = selectedId ? guestById(selectedId) : undefined;

  function close() {
    abortRef.current?.abort();
    setSelectedId(null);
    setRead(null);
    setError(null);
    setBusy(false);
  }

  async function select(id: string) {
    const guest = guestById(id);
    if (!guest) return;
    setSelectedId(id);
    setError(null);

    const cached = cache.current.get(id);
    if (cached) {
      setRead(cached);
      setBusy(false);
      recordTrace(guest, cached);
      return;
    }

    setRead(null);
    setBusy(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/care-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: id }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Read;
      cache.current.set(id, data);
      setRead(data);
      recordTrace(guest, data);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("EQ Radar hiccuped — try again.");
    } finally {
      setBusy(false);
    }
  }

  function recordTrace(guest: InHouseGuest, data: Read) {
    record({
      appKey: "care-radar",
      title: `Read ${guest.name}'s state: ${data.emotion}`,
      model: data._debug?.model,
      latencyMs: data._debug?.latencyMs,
      steps: [
        { agentId: "care", note: `Read emotional state: ${data.emotion} · ${data.intensity}/100` },
        { agentId: "memory", note: `Pulled ${guest.interactions.length} interaction signals for room ${guest.room}` },
        { agentId: "reasoning", note: `Inferred the unspoken need behind "${guest.occasion}"` },
        { agentId: "dispatch", note: `Composed a care brief: ${data.doNow.length} gestures, ${data.restraint.length} to hold back` },
      ],
      sections: [
        { label: "Interaction history (input)", body: guest.interactions.map((i) => `[${i.channel} · ${i.time}] ${i.text}`).join("\n"), mono: false },
        { label: "Prompt → Gemini", body: data._debug?.prompt ?? "(unavailable)", mono: true },
        { label: "Structured response", body: prettyJson(data._debug?.rawResponse ?? "{}"), mono: true },
      ],
    });
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <AppHeader title="EQ Radar" pillar="human-edge" />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6">
        <p className="rise mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-ray-magenta">
          Every guest, in-house
        </p>
        <h2 className="rise display mb-2 text-2xl font-bold leading-tight">
          It reads how each guest <span className="prism-text">really feels.</span>
        </h2>
        <p className="rise mb-3 text-sm leading-relaxed text-ink-dim">
          The whole house at a glance — colour-coded by emotional state. Tap a room to see the
          evidence, what it means, and exactly how to show up.
        </p>

        {/* status bar */}
        <StatusBar />

        {/* board */}
        <div className="rise relative flex-1 overflow-hidden rounded-3xl border border-hairline" style={{ minHeight: "60vh" }}>
          {can3d ? (
            <HotelScene guests={IN_HOUSE} selectedId={selectedId} onSelect={select} />
          ) : (
            <Roster onSelect={select} />
          )}
          {can3d && <GestureHint />}
          {can3d && (
            <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[0.64rem] uppercase tracking-[0.18em] text-ink-faint">
              drag to rotate · up/down to climb · two fingers to zoom
            </p>
          )}
        </div>
      </div>

      {selected && (
        <Profile
          guest={selected}
          read={read}
          busy={busy}
          error={error}
          onClose={close}
          onRetry={() => select(selected.id)}
        />
      )}
    </main>
  );
}

const SEGMENTS: { status: CareStatus; label: string }[] = [
  { status: "red", label: "need care" },
  { status: "amber", label: "gentle touch" },
  { status: "green", label: "settled" },
];

function StatusBar() {
  const [active, setActive] = useState<CareStatus | null>(null);
  const total = CARE_COUNTS.total;
  const counts: Record<CareStatus, number> = { red: CARE_COUNTS.red, amber: CARE_COUNTS.amber, green: CARE_COUNTS.green };
  const activeSeg = SEGMENTS.find((s) => s.status === active);

  return (
    <div className="rise mb-3">
      <div className="mb-1.5 flex items-baseline justify-between text-[0.72rem]">
        <span className="font-semibold text-ink-dim">{total} guests in-house</span>
        {activeSeg ? (
          <span className="font-semibold" style={{ color: CARE_COLOR[activeSeg.status] }}>
            {counts[activeSeg.status]} {activeSeg.label}
          </span>
        ) : (
          <span className="text-ink-faint">tap a band for detail</span>
        )}
      </div>
      <div className="flex h-3.5 w-full gap-1">
        {SEGMENTS.map((s) => {
          const c = CARE_COLOR[s.status];
          const dim = active !== null && active !== s.status;
          const isActive = active === s.status;
          return (
            <button
              key={s.status}
              onClick={() => setActive(isActive ? null : s.status)}
              aria-label={`${counts[s.status]} ${s.label}`}
              className="press group relative h-full rounded-full transition-all"
              style={{
                flex: `${counts[s.status]} 0 0%`,
                background: c,
                opacity: dim ? 0.32 : 1,
                boxShadow: isActive ? `0 0 12px ${c}` : "none",
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[0.62rem] font-bold text-abyss/80">
                {counts[s.status]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const GESTURE_FLAG = "care-radar-gestures-seen";

/**
 * First-visit gesture coaching over the 3D board. Shows an animated hint that
 * fades out after ~3s or on the first pointer interaction, then never returns
 * (a flag is persisted to localStorage). Skipped if already seen.
 */
function GestureHint() {
  // read the persisted flag once, lazily (render-safe — read only).
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(GESTURE_FLAG) !== "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!show) return;
    try {
      localStorage.setItem(GESTURE_FLAG, "1");
    } catch {
      /* ignore */
    }
    const dismiss = () => setShow(false);
    const timer = window.setTimeout(dismiss, 3000);
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, [show]);

  if (!show) return null;

  const moves: { glyph: string; label: string }[] = [
    { glyph: "↻", label: "drag to rotate" },
    { glyph: "↕", label: "up / down to climb floors" },
    { glyph: "⤢", label: "pinch to zoom" },
  ];
  return (
    <div
      className="bloom pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      style={{ background: "color-mix(in srgb, var(--abyss) 38%, transparent)" }}
    >
      <div className="glass-deep flex flex-col gap-3 rounded-3xl px-6 py-5">
        {moves.map((m, i) => (
          <div
            key={m.label}
            className="slide-in-left flex items-center gap-3"
            style={{ animationDelay: `${0.1 + i * 0.12}s` }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold"
              style={{ background: "color-mix(in srgb, var(--ray-magenta) 22%, transparent)", color: "var(--ray-magenta)" }}
            >
              {m.glyph}
            </span>
            <span className="text-[0.82rem] font-semibold text-ink">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Static fallback when WebGL is unavailable or reduced-motion is set.
function Roster({ onSelect }: { onSelect: (id: string) => void }) {
  const sorted = [...IN_HOUSE].sort(byUrgency);
  return (
    <div className="stagger absolute inset-0 flex flex-col gap-2.5 overflow-y-auto p-3">
      {sorted.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className="press glass-deep flex items-center gap-3 rounded-2xl p-3 text-left"
          style={{ boxShadow: `inset 3px 0 0 ${CARE_COLOR[g.status]}` }}
        >
          <PersonaAvatar id={g.personaId ?? ""} glyph={g.glyph} color={g.color} size="h-10 w-10" rounded="rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="display truncate text-[0.92rem] font-semibold text-ink">{g.name}</span>
              <span className="shrink-0 text-[0.66rem] text-ink-faint">· {g.room}</span>
            </div>
            <p className="truncate text-[0.76rem] text-ink-dim">{g.oneLine}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.1em]"
            style={{ background: `color-mix(in srgb, ${CARE_COLOR[g.status]} 18%, transparent)`, color: CARE_COLOR[g.status] }}
          >
            {g.emotion}
          </span>
        </button>
      ))}
    </div>
  );
}

function Profile({
  guest,
  read,
  busy,
  error,
  onClose,
  onRetry,
}: {
  guest: InHouseGuest;
  read: Read | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const c = CARE_COLOR[guest.status];
  const intensity = read?.intensity ?? guest.intensity;
  // Robust multilingual "tell": only when a non-English language is detected.
  const lang = read?.language?.trim();
  const speaksOther = !!lang && lang.toLowerCase() !== "english";
  return (
    <div className="bloom fixed inset-0 z-50 overflow-y-auto bg-abyss/92 backdrop-blur-xl">
      <div className="pt-safe sticky top-0 z-10 flex items-center gap-3 px-5 pb-3 pt-3 backdrop-blur-xl">
        <button
          onClick={onClose}
          className="press glass flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3.5 text-[0.74rem] font-semibold text-ink-dim"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All guests
        </button>
      </div>

      <div className="px-5 pb-24">
        {/* identity */}
        <div className="mb-5 flex items-center gap-3" style={{ paddingLeft: 2 }}>
          <PersonaAvatar id={guest.personaId ?? ""} glyph={guest.glyph} color={guest.color} size="h-14 w-14" rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h2 className="display truncate text-xl font-bold text-ink">{guest.name}</h2>
            <p className="text-[0.78rem] text-ink-dim">Room {guest.room} · {guest.party} · {guest.nights}</p>
            {speaksOther && (
              <span className="scale-pop mt-1 inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[0.62rem] font-semibold text-ink-dim">
                {read?.flag ? <span aria-hidden>{read.flag}</span> : null}
                <span>Replies in {lang}</span>
              </span>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em]"
            style={{ background: `color-mix(in srgb, ${c} 18%, transparent)`, color: c }}
          >
            {STATUS_LABEL[guest.status]}
          </span>
        </div>

        {busy && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-ink-dim">
              <span className="thinking-dots flex gap-1.5"><span /><span /><span /><span /><span /></span>
              <span className="text-sm">Reading the room…</span>
            </div>
            <LiveReasoning appKey="care-radar" active={busy} />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-ray-red/40 bg-ray-red/10 px-4 py-3 text-sm text-ink">
            {error}{" "}
            <button onClick={onRetry} className="press ml-1 font-semibold text-ray-red underline">retry</button>
          </div>
        )}

        {read && !busy && (
          <div className="flex flex-col gap-5">
            {read.sensitivityFlag && (
              <div className="flex items-center gap-2 rounded-2xl border border-ray-red/40 bg-ray-red/10 px-4 py-2.5">
                <span className="text-base">⚠️</span>
                <p className="text-[0.78rem] font-semibold text-ink">Sensitive situation — brief all staff before approaching.</p>
              </div>
            )}

            {/* IMPACT — how they feel */}
            <section>
              <SectionLabel>The read · how they feel</SectionLabel>
              <div className="glass-deep rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">Emotional state</p>
                    <p className="display text-xl font-bold" style={{ color: c }}>{read.emotion}</p>
                  </div>
                  <p className="display text-3xl font-bold tabular-nums" style={{ color: c }}>{intensity}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${intensity}%`, background: c }} />
                </div>
                <p className="mt-3 text-[0.85rem] italic text-ink-dim">{read.occasion}</p>
              </div>
              <div className="glass mt-2.5 rounded-2xl p-4">
                <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-magenta">The unspoken need</p>
                <p className="text-[0.9rem] leading-relaxed text-ink">{read.unspokenNeed}</p>
              </div>
            </section>

            {/* EVIDENCE — what we saw + what it reveals */}
            <section>
              <SectionLabel>The evidence · what we saw</SectionLabel>
              <div className="flex flex-col gap-2">
                {guest.interactions.map((i, idx) => (
                  <div key={idx} className="glass rounded-xl px-3.5 py-2.5">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-ink-faint">{i.channel}</span>
                      <span className="text-[0.62rem] text-ink-faint">{i.time}</span>
                    </div>
                    <p className="text-[0.82rem] leading-snug text-ink-dim">{i.text}</p>
                  </div>
                ))}
              </div>
              {read.evidence?.length > 0 && (
                <div className="glass-deep mt-2.5 rounded-2xl p-4">
                  <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-aqua">What the AI reads in them</p>
                  <ul className="flex flex-col gap-2">
                    {read.evidence.map((e, idx) => (
                      <li key={idx} className="text-[0.82rem] leading-snug">
                        <span className="text-ink">{e.signal}</span>
                        <span className="text-ink-faint"> → </span>
                        <span className="text-ink-dim">{e.reads}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* CLUES — how to handle them */}
            <section>
              <SectionLabel>The clues · how to show up</SectionLabel>
              <div className="glass-deep rounded-2xl p-4" style={{ boxShadow: `inset 3px 0 0 ${c}` }}>
                <p className="text-[0.9rem] leading-relaxed text-ink">{read.careBrief}</p>
              </div>

              <div className="mt-2.5 grid grid-cols-1 gap-2.5">
                <CueList title="Do now" items={read.doNow} color="var(--ray-green)" mark="✓" />
                <CueList title="Hold back" items={read.restraint} color="var(--ray-red)" mark="✕" />
              </div>

              <div className="glass mt-2.5 rounded-2xl p-4">
                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-magenta">Say it like this</p>
                <p className="text-[0.9rem] leading-relaxed text-ink">“{read.guestReply}”</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ray-magenta">{children}</p>
  );
}

function CueList({ title, items, color, mark }: { title: string; items: string[]; color: string; mark: string }) {
  if (!items?.length) return null;
  return (
    <div className="glass rounded-2xl p-4">
      <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.18em]" style={{ color }}>{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[0.85rem] leading-snug text-ink">
            <span className="shrink-0 font-bold" style={{ color }}>{mark}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
