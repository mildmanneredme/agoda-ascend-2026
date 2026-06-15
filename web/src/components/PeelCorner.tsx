"use client";

import { useEffect, useRef, useState } from "react";
import { useDevTrace } from "./DevTrace";
import { MODULES } from "@/lib/trace";

/**
 * The peel corner: the page's own bottom-right corner appears lifted, revealing a
 * sliver of the "machine layer" (ray-coloured glow + a faint glyph) underneath.
 * Subtle when idle so it never interrupts the experience; it peels open on a fresh
 * trace, and gives a one-time discoverability nudge on a guest's first visit.
 * Tapping it opens the X-ray panel.
 */
const HINT_KEY = "peel-hinted";

export default function PeelCorner() {
  const { open, setOpen, seq, trace } = useDevTrace();
  const [fresh, setFresh] = useState(false);
  const [hint, setHint] = useState(false);
  const lastSeq = useRef(0);

  // tint the revealed underside with the current module's accent
  const accent = (trace && MODULES[trace.appKey]?.accent) || "var(--ray-aqua)";

  // peel open briefly when a fresh trace lands (panel closed)
  useEffect(() => {
    if (seq > lastSeq.current) {
      lastSeq.current = seq;
      if (seq > 0 && !open) {
        setFresh(true);
        const t = setTimeout(() => setFresh(false), 1900);
        return () => clearTimeout(t);
      }
    }
  }, [seq, open]);

  // one-time discoverability hint on a guest's first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch {
      return;
    }
    const start = setTimeout(() => setHint(true), 1000);
    const end = setTimeout(() => {
      setHint(false);
      try {
        localStorage.setItem(HINT_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 6500);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, []);

  // presenter aid: press "x" to toggle the X-ray panel (ignore while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "x" && e.key !== "X") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      setFresh(false);
      setHint(false);
      setOpen(!open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen, open]);

  if (open) return null;

  // a fresh result invites the reveal explicitly; the first-visit hint teaches it
  const label = fresh ? "See how the AI decided that →" : "Peek under the hood";

  const anim = fresh
    ? "peel-lift 1.9s cubic-bezier(0.22,1,0.36,1) both"
    : hint
    ? "peel-hint 2.4s ease-in-out both"
    : undefined;

  return (
    <div
      className="fixed right-0 z-[60] flex flex-col items-end"
      style={{ bottom: "env(safe-area-inset-bottom)" }}
    >
      {(hint || fresh) && (
        <span
          className="mb-1.5 mr-3 rounded-full border px-2.5 py-1 text-[0.64rem] font-semibold"
          style={{
            animation: "fade-in 0.45s ease both",
            background: "rgba(13,17,44,0.92)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            color: fresh ? `color-mix(in srgb, ${accent} 78%, white)` : "var(--ink-dim)",
            borderColor: fresh ? `color-mix(in srgb, ${accent} 45%, transparent)` : "var(--hairline)",
          }}
        >
          {label}
        </span>
      )}

      <button
        onClick={() => {
          setFresh(false);
          setHint(false);
          setOpen(true);
        }}
        aria-label="Peel back the UI — see how the AI works"
        className="group relative block h-[68px] w-[68px] cursor-pointer"
      >
        <span
          className="absolute inset-0 block transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-105"
          style={{ transformOrigin: "100% 100%", animation: anim }}
        >
          {/* underside — the machine layer revealed beneath the lifted corner */}
          <span
            className="absolute inset-0 block"
            style={{
              clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
              background: `radial-gradient(125% 125% at 100% 100%, color-mix(in srgb, ${accent} 60%, transparent), color-mix(in srgb, ${accent} 14%, transparent) 52%, transparent 74%)`,
            }}
          >
            <span
              className="absolute bottom-[5px] right-[7px] text-[0.72rem] font-bold leading-none"
              style={{ color: `color-mix(in srgb, ${accent} 70%, white)`, opacity: 0.78 }}
              aria-hidden
            >
              ✦
            </span>
          </span>

          {/* the folded-back page flap (back of the page) */}
          <span
            className="absolute inset-0 block"
            style={{
              clipPath: "polygon(0 0, 100% 0, 0 100%)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--abyss) 86%, white 14%), var(--abyss) 58%)",
              filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.55))",
            }}
          />

          {/* crease highlight along the fold */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[96px] -translate-x-1/2 -translate-y-1/2 -rotate-45"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--ray-aqua) 50%, white) 50%, transparent)",
              opacity: 0.55,
            }}
            aria-hidden
          />

          {/* pulsing tip when a fresh trace is waiting */}
          {fresh && (
            <span
              className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full"
              style={{
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
                animation: "pulse-dot 1.1s ease-in-out infinite",
              }}
              aria-hidden
            />
          )}
        </span>
      </button>
    </div>
  );
}
