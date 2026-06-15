"use client";

import { useEffect, useState } from "react";
import AgentMap from "./AgentMap";
import { MODULES } from "@/lib/trace";

/**
 * The reasoning chain, surfaced INLINE while an app is thinking (rec #1).
 *
 * The X-ray panel already replays the orchestration after the fact; this shows
 * the same agent flow *live* during the wait, so the loading moment becomes the
 * show ("the AI doesn't chat, it orchestrates"). Pulls the canonical
 * `previewSteps` for the module from the trace registry, and loops the AgentMap
 * replay for as long as `active` is true.
 */
export default function LiveReasoning({
  appKey,
  active,
  className = "",
}: {
  appKey: string;
  active: boolean;
  className?: string;
}) {
  const meta = MODULES[appKey];
  const [runKey, setRunKey] = useState(0);

  // one full replay takes ~(260 + steps*620)ms; loop it while still thinking so
  // the chain keeps animating even if the request runs long.
  useEffect(() => {
    if (!active || !meta) return;
    const cycle = 260 + meta.previewSteps.length * 620 + 500;
    const id = setInterval(() => setRunKey((k) => k + 1), cycle);
    return () => clearInterval(id);
  }, [active, meta]);

  if (!active || !meta) return null;

  return (
    <div
      className={`glass-deep rounded-2xl p-4 ${className}`}
      style={{ animation: "bloom 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      <p
        className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.18em]"
        style={{ color: meta.accent }}
      >
        Live orchestration
      </p>
      <AgentMap
        steps={meta.previewSteps}
        runKey={runKey}
        accent={meta.accent}
        signatureId={meta.signature}
      />
    </div>
  );
}
