"use client";

import { useEffect, useState } from "react";
import { useDevTrace } from "./DevTrace";
import { AGENTS, MODULES } from "@/lib/trace";
import AgentMap from "./AgentMap";

function RawSection({ label, body, mono }: { label: string; body: string; mono?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass overflow-hidden rounded-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {label}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <pre
          className={`max-h-64 overflow-auto border-t border-hairline px-4 py-3 text-[0.72rem] leading-relaxed text-ink-dim ${
            mono ? "font-mono" : "whitespace-pre-wrap font-sans"
          }`}
          style={mono ? { whiteSpace: "pre-wrap", wordBreak: "break-word" } : undefined}
        >
          {body}
        </pre>
      )}
    </div>
  );
}

export default function XrayPanel() {
  const { open, setOpen, trace, seq } = useDevTrace();
  const meta = trace ? MODULES[trace.appKey] : null;
  const accent = meta?.accent ?? "var(--ray-aqua)";

  // lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <button
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/60"
        style={{ animation: "fade-in 0.25s ease both" }}
      />

      <div
        className="glass-deep pb-safe relative max-h-[88dvh] overflow-y-auto rounded-t-3xl border-b-0"
        style={{ animation: "sheet-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* grabber + header */}
        <div className="sticky top-0 z-10 px-5 pt-3 backdrop-blur-xl">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-start justify-between gap-3 pb-3">
            <div className="min-w-0">
              <p
                className="flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.22em]"
                style={{ color: accent }}
              >
                <span aria-hidden>{meta?.glyph ?? "✦"}</span>
                <span>Under the hood{meta ? ` · ${meta.name}` : ""}</span>
                {meta && (
                  <span
                    className="ml-1 rounded-full border px-1.5 py-px text-[0.5rem] tracking-[0.16em]"
                    style={{ borderColor: `color-mix(in srgb, ${accent} 40%, transparent)` }}
                  >
                    {meta.pillarLabel}
                  </span>
                )}
              </p>
              <h2 className="display text-lg font-semibold leading-tight">
                {trace ? trace.title : "The machinery behind the magic"}
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="press glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-dim"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 pb-8">
          {trace ? (
            <>
              {meta && (
                <div
                  className="mb-4 rounded-xl border border-hairline bg-white/[0.02] px-3.5 py-3"
                  style={{ borderLeft: `2px solid ${accent}` }}
                >
                  <p
                    className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.18em]"
                    style={{ color: accent }}
                  >
                    How this works
                  </p>
                  <p className="text-[0.78rem] leading-relaxed text-ink-dim">
                    {meta.architecture}
                  </p>
                </div>
              )}

              <div className="mb-2 flex items-center gap-2">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink-faint">
                  Logical agents in this request
                </span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
              <AgentMap steps={trace.steps} runKey={seq} accent={accent} signatureId={meta?.signature} />

              <div className="my-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-[0.7rem] text-ink-dim" style={{ borderColor: `color-mix(in srgb, ${accent} 30%, var(--hairline))` }}>
                <span className="thinking-dots flex gap-1">
                  <span /><span /><span />
                </span>
                <span>
                  One real call ·{" "}
                  <span className="font-mono text-ink">{trace.model ?? "gemini-2.5-flash"}</span>
                  {trace.latencyMs ? (
                    <>
                      {" "}· <span className="font-mono text-ray-green">{(trace.latencyMs / 1000).toFixed(2)}s</span>
                    </>
                  ) : null}
                </span>
              </div>

              <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink-faint">
                The raw exchange
              </p>
              <div className="flex flex-col gap-2">
                {trace.sections.map((s, i) => (
                  <RawSection key={i} label={s.label} body={s.body} mono={s.mono} />
                ))}
              </div>

              <p className="mt-5 text-center text-[0.68rem] leading-relaxed text-ink-faint">
                {meta?.footer ??
                  "This is the same surface the guest never sees. The experience above is effortless because the orchestration below is not."}
              </p>
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-ink-dim">
        Every effortless moment in this sandbox is the visible tip of a coordinated AI
        system. Open any app and act — book a room, ask the concierge, view your memory —
        then return here to watch the agents that made it happen.
      </p>
      <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink-faint">
        The agents on call
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {Object.values(AGENTS).map((a) => (
          <div key={a.id} className="glass flex items-center gap-2.5 rounded-xl px-3 py-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ color: a.color, background: `color-mix(in srgb, ${a.color} 14%, transparent)` }}
            >
              {a.glyph}
            </span>
            <span className="text-[0.76rem] font-semibold leading-tight text-ink">{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
