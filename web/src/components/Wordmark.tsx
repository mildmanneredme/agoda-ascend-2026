const DOTS = ["#ff2838", "#fdb812", "#00b057", "#af38b1", "#00aae0", "#4beaea"];

export function AgodaDots({ size = 5 }: { size?: number }) {
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.7 }}>
      {DOTS.map((c) => (
        <span
          key={c}
          className="rounded-full"
          style={{ width: size, height: size, background: c }}
        />
      ))}
    </span>
  );
}

export function AscendMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span className="flex items-center gap-1.5 text-[0.6rem] font-medium tracking-wide text-ink-dim">
        agoda <AgodaDots size={3} />
      </span>
      <span className="display text-lg font-semibold tracking-[0.08em] text-ink">
        asc<span className="text-ink-dim">≡</span>nd
      </span>
    </span>
  );
}

export function GrandNeuralMark({ className = "" }: { className?: string }) {
  return (
    <span className={`display font-semibold tracking-tight text-ink ${className}`}>
      The Grand Neural
    </span>
  );
}
