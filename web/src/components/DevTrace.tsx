"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Trace } from "@/lib/trace";

type DevTraceValue = {
  trace: Trace | null;
  seq: number; // increments each record — lets the cog pulse on fresh data
  record: (trace: Trace) => void;
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

  const value = useMemo(
    () => ({ trace, seq, record, open, setOpen }),
    [trace, seq, open]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDevTrace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDevTrace must be used within DevTraceProvider");
  return ctx;
}
