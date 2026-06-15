"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Trace } from "@/lib/trace";

type DevTraceValue = {
  trace: Trace | null;
  seq: number; // increments each record — lets the cog pulse on fresh data
  record: (trace: Trace) => void;
  clear: () => void; // drop the per-app trace so the X-ray reverts to the sandbox-wide overview
  open: boolean;
  setOpen: (open: boolean) => void;
};

const Ctx = createContext<DevTraceValue | null>(null);

export function DevTraceProvider({ children }: { children: React.ReactNode }) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [seq, setSeq] = useState(0);
  const [open, setOpen] = useState(false);

  const record = useCallback((t: Trace) => {
    setTrace(t);
    setSeq((s) => s + 1);
  }, []);

  // revert to the sandbox-wide overview (no per-app trace). Doesn't bump seq, so
  // it never fires the peel-corner "fresh result" pulse — it's a quiet reset.
  const clear = useCallback(() => setTrace(null), []);

  const value = useMemo(
    () => ({ trace, seq, record, clear, open, setOpen }),
    [trace, seq, record, clear, open]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDevTrace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDevTrace must be used within DevTraceProvider");
  return ctx;
}
