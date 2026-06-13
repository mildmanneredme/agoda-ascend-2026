"use client";

import { useEffect, useState } from "react";
import { AGENTS, type TraceStep } from "@/lib/trace";

/**
 * The orchestration map. Replays the agent sequence as a vertical flow:
 * each node activates in turn (pulse), then settles to done (check), with a
 * pulse travelling down the rail between them. Re-runs whenever `runKey` changes.
 */
export default function AgentMap({
  steps,
  runKey,
  accent,
  signatureId,
}: {
  steps: TraceStep[];
  runKey: number;
  accent?: string;
  signatureId?: TraceStep["agentId"];
}) {
  const [active, setActive] = useState(-1);

  // the module's defining agent (first occurrence) gets lead emphasis; a trailing
  // generic concierge "draft/reply" step is muted so the reused agent stops making
  // every map look identical.
  const sigIndex = signatureId ? steps.findIndex((s) => s.agentId === signatureId) : -1;

  useEffect(() => {
    setActive(-1);
    if (!steps.length) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActive(i), 260 + i * 620));
    });
    // settle past the end so the last node reads "done"
    timers.push(setTimeout(() => setActive(steps.length), 260 + steps.length * 620));
    return () => timers.forEach(clearTimeout);
  }, [steps, runKey]);

  if (!steps.length) return null;

  return (
    <div className="relative pl-1">
      {steps.map((step, i) => {
        const agent = AGENTS[step.agentId];
        const state = i < active ? "done" : i === active ? "live" : "idle";
        const isLast = i === steps.length - 1;
        const isSignature = i === sigIndex;
        const nodeColor = isSignature && accent ? accent : agent.color;
        const muted = !isSignature && isLast && step.agentId === "concierge";
        return (
          <div
            key={`${step.agentId}-${i}`}
            className={`relative flex gap-3 pb-3 last:pb-0 ${muted ? "opacity-55" : ""}`}
          >
            {/* rail */}
            {!isLast && (
              <span
                className="absolute left-[19px] top-10 bottom-0 w-px"
                style={{ background: "var(--hairline)" }}
              >
                {state === "done" && (
                  <span
                    className="absolute inset-0 w-px"
                    style={{ background: `linear-gradient(${nodeColor}, transparent)` }}
                  />
                )}
              </span>
            )}
            {/* node */}
            <span
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base transition-all duration-300"
              style={{
                color: state === "idle" ? "var(--ink-faint)" : nodeColor,
                background:
                  state === "idle"
                    ? "rgba(255,255,255,0.03)"
                    : `color-mix(in srgb, ${nodeColor} 16%, transparent)`,
                boxShadow:
                  state === "live"
                    ? `0 0 22px color-mix(in srgb, ${nodeColor} 55%, transparent)`
                    : isSignature
                    ? `0 0 0 1.5px color-mix(in srgb, ${nodeColor} 55%, transparent)`
                    : "none",
                border: `1px solid ${state === "idle" && !isSignature ? "var(--hairline)" : `color-mix(in srgb, ${nodeColor} 45%, transparent)`}`,
              }}
            >
              {state === "done" ? "✓" : agent.glyph}
              {state === "live" && (
                <span
                  className="absolute inset-0 rounded-xl"
                  style={{ animation: "breathe 1.2s ease-in-out infinite", border: `1px solid ${nodeColor}`, ["--ray-min" as string]: 0.2, ["--ray-max" as string]: 0.9 }}
                />
              )}
            </span>
            {/* label */}
            <div className={`min-w-0 flex-1 pt-0.5 transition-opacity duration-300 ${state === "idle" ? "opacity-45" : "opacity-100"}`}>
              <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-ink" style={{ color: state === "idle" ? "var(--ink-dim)" : undefined }}>
                {agent.label}
                {isSignature && (
                  <span
                    className="rounded-full px-1.5 py-px text-[0.5rem] font-bold uppercase tracking-[0.14em]"
                    style={{ color: nodeColor, background: `color-mix(in srgb, ${nodeColor} 14%, transparent)` }}
                  >
                    entry point
                  </span>
                )}
              </p>
              <p className="text-[0.74rem] leading-snug text-ink-dim">{step.note}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
