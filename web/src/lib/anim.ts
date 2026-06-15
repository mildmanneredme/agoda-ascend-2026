"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 (or `from`) up to `target` over `durationMs`.
 * Used for confidence scores, sentiment scores, and priced totals so figures
 * *land* rather than just appearing. Respects prefers-reduced-motion (jumps to
 * the target instantly). Re-runs whenever `target` changes.
 */
export function useCountUp(
  target: number,
  { durationMs = 900, from = 0, decimals = 0, active = true }: {
    durationMs?: number;
    from?: number;
    decimals?: number;
    active?: boolean;
  } = {},
): number {
  const [value, setValue] = useState(active ? from : target);
  const raf = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }

    const round = (n: number) => {
      const f = 10 ** decimals;
      return Math.round(n * f) / f;
    };

    startRef.current = null;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs, from, decimals, active]);

  return value;
}
