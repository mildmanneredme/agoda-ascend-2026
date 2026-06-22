"use client";

import { useRouter } from "next/navigation";
import Media from "@/components/Media";
import {
  HOTEL,
  FACILITIES,
  SPA_PACKAGES,
  FITNESS,
  CLASSES,
  TRANSFERS,
  EVENTS,
  PARTNERS,
} from "@/lib/hotel";

function facility(id: string) {
  return FACILITIES.find((f) => f.id === id)!;
}

type Lead = { image: string; title: string; detail: string; blurb: string };
type Row = { title: string; detail: string; blurb: string };

type Section = {
  key: string;
  eyebrow: string;
  title: string;
  color: string;
  leads: Lead[];
  rows?: Row[];
  rowsLabel?: string;
};

const SECTIONS: Section[] = [
  {
    key: "stay",
    eyebrow: "The Stay",
    title: "Rooms that learn you",
    color: "var(--ray-aqua)",
    leads: [
      {
        image: HOTEL.baseRoom.image,
        title: HOTEL.baseRoom.name,
        detail: `from $${HOTEL.baseRoom.price}/night`,
        blurb:
          "Floor-to-ceiling river glass, a Herman Miller workspace, in-room espresso and a minibar restocked to your taste. Compose it your way in the Offer Builder.",
      },
    ],
  },
  {
    key: "pool-fitness",
    eyebrow: "Pool & Fitness",
    title: "Rise, swim, recover",
    color: "var(--ray-cyan)",
    leads: [
      { image: facility("pool").image, title: facility("pool").name, detail: `${facility("pool").location} · ${facility("pool").hours}`, blurb: facility("pool").blurb },
      { image: facility("gym").image, title: facility("gym").name, detail: `${facility("gym").location} · ${facility("gym").hours}`, blurb: facility("gym").blurb },
    ],
    rowsLabel: "Train & recover",
    rows: FITNESS.map((f) => ({ title: f.name, detail: `$${f.price} · ${f.basis}`, blurb: f.blurb })),
  },
  {
    key: "spa",
    eyebrow: "Sala Day Spa",
    title: "A day to come undone",
    color: "var(--ray-magenta)",
    leads: [
      { image: facility("spa").image, title: facility("spa").name, detail: `${facility("spa").location} · ${facility("spa").hours}`, blurb: facility("spa").blurb },
    ],
    rowsLabel: "Massage & relaxation packages",
    rows: SPA_PACKAGES.map((s) => ({ title: s.name, detail: `$${s.price} · ${s.duration}`, blurb: s.blurb })),
  },
  {
    key: "classes",
    eyebrow: "Yoga & Movement",
    title: "Move with the river",
    color: "var(--ray-green)",
    leads: [
      { image: "yoga", title: "Sunrise Rooftop Yoga", detail: "Daily · 6:30 · pool deck", blurb: "Greet the day with a vinyasa flow above the Chao Phraya, then slip straight into the pool." },
    ],
    rowsLabel: "On the schedule",
    rows: CLASSES.map((c) => ({ title: c.name, detail: `${c.schedule} · ${c.price === 0 ? "complimentary" : `$${c.price}`}`, blurb: c.blurb })),
  },
  {
    key: "dining",
    eyebrow: "Dining & Bars",
    title: "The riverside table",
    color: "var(--ray-amber)",
    leads: [
      { image: facility("saen").image, title: facility("saen").name, detail: facility("saen").hours, blurb: facility("saen").blurb },
      { image: facility("bar").image, title: facility("bar").name, detail: `${facility("bar").location} · ${facility("bar").hours}`, blurb: facility("bar").blurb },
      { image: facility("lounge").image, title: facility("lounge").name, detail: `${facility("lounge").location} · ${facility("lounge").hours}`, blurb: facility("lounge").blurb },
    ],
  },
  {
    key: "tours",
    eyebrow: "Experiences & Tours",
    title: "The city, curated",
    color: "var(--ray-aqua)",
    leads: PARTNERS.map((p) => ({ image: p.image, title: p.name, detail: `$${p.price} · ${p.duration} · ${p.discountPct}% guest discount`, blurb: p.blurb })),
  },
  {
    key: "transfers",
    eyebrow: "Getting Around",
    title: "A driver on call",
    color: "var(--ray-cyan)",
    leads: [
      { image: "chauffeur", title: "The Chauffeur Desk", detail: "Concierge driving · 24 hours", blurb: "From the airport to after-dark city loops — a car, a boat and a driver, whenever you need to move." },
    ],
    rowsLabel: "Transfers & chauffeur",
    rows: TRANSFERS.map((t) => ({ title: t.name, detail: `$${t.price} · ${t.basis}`, blurb: t.blurb })),
  },
  {
    key: "events",
    eyebrow: "What's On",
    title: "While you stay",
    color: "var(--ray-red)",
    leads: EVENTS.map((e) => ({ image: e.image, title: e.name, detail: e.cadence, blurb: e.blurb })),
  },
];

export default function Property() {
  const router = useRouter();

  return (
    <main className="relative min-h-dvh overflow-hidden pb-16">

      {/* sticky header: back */}
      <header className="pt-safe sticky top-0 z-40 flex items-center px-5 pb-3 backdrop-blur-xl">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="press glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-dim"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* hero band */}
      <section className="relative z-10 px-5">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl sm:aspect-[16/10]">
          <Media slug={HOTEL.heroImage} alt={HOTEL.name} priority sizes="(max-width: 768px) 100vw, 768px" />
          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ray-aqua">
              {HOTEL.city} · {HOTEL.setting.split(",")[0]}
            </p>
            <h1 className="display text-[2.3rem] font-bold leading-[1.04]">{HOTEL.name}</h1>
            <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-ink-dim">{HOTEL.tagline}</p>
          </div>
        </div>
      </section>

      <div className="relative z-10 mt-10 flex flex-col gap-12 px-5">
        {SECTIONS.map((s) => (
          <section key={s.key}>
            <div className="mb-4">
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em]" style={{ color: s.color }}>
                {s.eyebrow}
              </p>
              <h2 className="display text-2xl font-bold leading-tight">{s.title}</h2>
            </div>

            <div className="stagger flex flex-col gap-3">
              {s.leads.map((lead) => (
                <LeadCard key={lead.title} lead={lead} color={s.color} />
              ))}
            </div>

            {s.rows && (
              <div className="mt-4">
                {s.rowsLabel && (
                  <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    {s.rowsLabel}
                  </p>
                )}
                <div className="stagger flex flex-col gap-2">
                  {s.rows.map((row) => (
                    <div key={row.title} className="glass flex items-baseline justify-between gap-4 rounded-2xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{row.title}</p>
                        <p className="mt-0.5 text-[0.78rem] leading-snug text-ink-dim">{row.blurb}</p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[0.72rem] font-semibold" style={{ color: s.color }}>
                        {row.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}

        <footer className="mt-4 rounded-3xl glass-deep p-6 text-center">
          <p className="display text-lg font-semibold">Now — meet the guest.</p>
          <p className="mx-auto mt-1 max-w-[32ch] text-sm text-ink-dim">
            Every space above quietly adapts to who&apos;s staying. Step into a guest to see how.
          </p>
          <button
            onClick={() => router.push("/")}
            className="press mt-4 rounded-2xl bg-ink px-6 py-3 font-display text-sm font-semibold text-abyss"
          >
            Choose your guest →
          </button>
        </footer>
      </div>
    </main>
  );
}

function LeadCard({ lead, color }: { lead: Lead; color: string }) {
  return (
    <div className="press glass-deep overflow-hidden rounded-3xl" style={{ boxShadow: `inset 2px 0 0 ${color}` }}>
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Media slug={lead.image} alt={lead.title} sizes="(max-width: 768px) 100vw, 768px" />
        <div className="absolute inset-0 bg-gradient-to-t from-abyss/85 via-abyss/10 to-transparent" />
        <span
          className="absolute left-4 top-4 rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] backdrop-blur-md"
          style={{ color, borderColor: `color-mix(in srgb, ${color} 38%, transparent)` }}
        >
          {lead.detail}
        </span>
      </div>
      <div className="p-4">
        <h3 className="display text-lg font-semibold text-ink">{lead.title}</h3>
        <p className="mt-1 text-[0.84rem] leading-snug text-ink-dim">{lead.blurb}</p>
      </div>
    </div>
  );
}
