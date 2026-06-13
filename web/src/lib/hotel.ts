/**
 * The Grand Neural — seeded mock property shared by every sandbox app.
 * Riverside Bangkok, 214 rooms, opened 2024. All data fictional.
 */

export const HOTEL = {
  name: "The Grand Neural",
  city: "Bangkok",
  setting: "riverside, Charoen Krung creative district",
  rooms: 214,
  facts: [
    "Rooftop infinity pool, level 32 — open 6:00–22:00",
    "Gym and recovery studio, level 5 — open 24 hours",
    "SAEN, the riverside Thai-Isan restaurant — breakfast 6:30–10:30, dinner 18:00–23:00",
    "Neural Lounge, level 31 — guests with lounge access, 7:00–21:00",
    "Minibar restocked daily by 15:00, personalised to guest preferences",
    "EV shuttle to Saphan Taksin BTS every 20 minutes",
    "Late checkout subject to availability, bookable in-app",
  ],
  baseRoom: {
    name: "Neural King",
    price: 200,
    currency: "USD",
    image: "room",
  },
  /** Cinematic establishing shot, used on the property hero band + landing loop. */
  heroImage: "hero",
  tagline: "A riverside hotel that learns you by heart.",
};

/**
 * Showcase catalogues below power the "Explore the Property" tour and feed the AI
 * brief. Every `image` is a slug resolved to `/property/{style}/{slug}.webp`
 * (style ∈ "luxe" | "neon") — see lib/artStyle.ts.
 */

export type Facility = {
  id: string;
  name: string;
  location: string;
  hours: string;
  blurb: string;
  image: string;
};

/** Always-on amenities — the property's "hardware". */
export const FACILITIES: Facility[] = [
  { id: "pool", name: "Rooftop Infinity Pool", location: "Level 32", hours: "6:00–22:00", image: "pool", blurb: "A mirror-edge pool that spills toward the Chao Phraya, with cabanas and a sunset bar." },
  { id: "gym", name: "Gym & Recovery Studio", location: "Level 5", hours: "24 hours", image: "gym", blurb: "Technogym floor, free weights, and a recovery suite with cryo, sauna and compression boots." },
  { id: "spa", name: "Sala Day Spa", location: "Level 6", hours: "10:00–22:00", image: "spa", blurb: "Eight treatment rooms plus sauna, steam, cold plunge, vitality pool and a candlelit relaxation lounge." },
  { id: "lounge", name: "Neural Lounge", location: "Level 31", hours: "7:00–21:00", image: "lounge", blurb: "All-day refreshments, evening canapés and skyline views for guests with lounge access." },
  { id: "saen", name: "SAEN Restaurant", location: "Riverside, Ground", hours: "Breakfast 6:30–10:30 · Dinner 18:00–23:00", image: "restaurant", blurb: "Riverside Thai-Isan kitchen — charcoal grills, regional sharing plates and a riverside terrace." },
  { id: "bar", name: "The Riverside Bar", location: "Level 32", hours: "16:00–01:00", image: "bar", blurb: "Botanical cocktails and Thai-spirit flights as the longtails slip past below." },
];

export type SpaPackage = {
  id: string;
  name: string;
  duration: string;
  price: number;
  blurb: string;
};

/** Sala Day Spa — massage & relaxation packages, bookable in-app. */
export const SPA_PACKAGES: SpaPackage[] = [
  { id: "thai-recovery", name: "Thai Recovery Massage", duration: "90 min", price: 95, blurb: "Deep traditional Thai stretch-and-press to undo long-haul stiffness." },
  { id: "jet-lag-reset", name: "Jet-Lag Reset Ritual", duration: "60 min", price: 80, blurb: "Lymphatic massage, cold plunge and a magnesium soak to reset your clock." },
  { id: "couples-ritual", name: "Riverside Couples Ritual", duration: "120 min", price: 240, blurb: "Side-by-side aromatherapy massage, private vitality pool and sparkling tea." },
  { id: "half-day-journey", name: "Half-Day Spa Journey", duration: "3.5 hrs", price: 310, blurb: "Scrub, signature massage, facial and full run of the thermal facilities with lunch." },
];

export type FitnessOption = {
  id: string;
  name: string;
  price: number;
  basis: string;
  blurb: string;
};

/** Gym add-ons — the optional personal-trainer service and recovery sessions. */
export const FITNESS: FitnessOption[] = [
  { id: "personal-trainer", name: "Personal Trainer", price: 60, basis: "60-min session", blurb: "One-to-one strength, mobility or conditioning with a certified coach in the studio." },
  { id: "mobility-assessment", name: "Mobility Assessment", price: 45, basis: "45 min", blurb: "Movement screen and a tailored routine you can keep for the rest of your stay." },
  { id: "cryo", name: "Cryo Recovery", price: 38, basis: "per session", blurb: "Whole-body cryotherapy for faster recovery after travel or training." },
  { id: "recovery-boots", name: "Compression Recovery", price: 25, basis: "30 min", blurb: "Pneumatic recovery boots and a quiet chair — flush the long flight out of your legs." },
];

export type WellnessClass = {
  id: string;
  name: string;
  schedule: string;
  price: number;
  blurb: string;
};

/** Scheduled wellness — yoga and movement on the property. */
export const CLASSES: WellnessClass[] = [
  { id: "sunrise-yoga", name: "Sunrise Rooftop Yoga", schedule: "Daily · 6:30", price: 20, blurb: "Vinyasa flow on the pool deck as the river wakes up. Mats provided." },
  { id: "sound-bath", name: "Riverside Sound Bath", schedule: "Wed & Sun · 19:00", price: 30, blurb: "Tibetan bowls and gong in the relaxation lounge — deep nervous-system reset." },
  { id: "run-club", name: "Riverside Run Club", schedule: "Tue & Thu · 6:00", price: 0, blurb: "Complimentary guided 5k along Charoen Krung with a hotel pacer." },
  { id: "muay-thai", name: "Muay Thai Foundations", schedule: "By request", price: 30, blurb: "Private ring session with a local coach — beginner friendly (see partner experiences)." },
];

export type Transfer = {
  id: string;
  name: string;
  price: number;
  basis: string;
  blurb: string;
};

/** Concierge driving & transfer services — the chauffeur desk. */
export const TRANSFERS: Transfer[] = [
  { id: "airport-ev", name: "Airport Transfer (EV)", price: 32, basis: "per trip", blurb: "Driver tracks your flight and meets you at the gate — zero-emission and air-conditioned." },
  { id: "city-chauffeur", name: "City Chauffeur", price: 28, basis: "per hour", blurb: "A car and driver on call to weave you through the city, wait included." },
  { id: "river-boat", name: "Longtail River Transfer", price: 40, basis: "per trip", blurb: "Skip the traffic — a private longtail to the old town, temples or the night markets." },
  { id: "city-lights", name: "City Lights Evening Drive", price: 75, basis: "2 hrs", blurb: "A curated after-dark loop past the lit temples and rooftops, chilled water and playlist aboard." },
];

export type PropertyEvent = {
  id: string;
  name: string;
  cadence: string;
  blurb: string;
  image: string;
};

/** Curated property events calendar — "what's on" while you stay. */
export const EVENTS: PropertyEvent[] = [
  { id: "chefs-table", name: "SAEN Chef's Table", cadence: "Fri & Sat · 19:30", image: "chefs-table", blurb: "Eight seats at the pass for a regional Thai-Isan tasting menu with the head chef." },
  { id: "sunset-sessions", name: "Rooftop Sunset Sessions", cadence: "Thu–Sun · 18:00", image: "sunset-sessions", blurb: "A resident DJ and golden-hour cocktails as the river turns gold on Level 32." },
  { id: "art-walk", name: "Charoen Krung Art Walk", cadence: "Last Saturday monthly", image: "art-walk", blurb: "A hosted gallery crawl through the creative district with the hotel's art curator." },
  { id: "full-moon-cruise", name: "Full-Moon River Cruise", cadence: "Monthly · full moon", image: "full-moon-cruise", blurb: "A private evening cruise with canapés as the temples glow along the water." },
];

export type RoomAttribute = {
  id: string;
  label: string;
  price: number;
  blurb: string;
};

/** Attribute-Based Booking catalogue: unbundled room features the AI composes into offers. */
export const ATTRIBUTES: RoomAttribute[] = [
  { id: "high-floor", label: "High floor (28+)", price: 18, blurb: "Skyline quiet, above the city hum" },
  { id: "river-view", label: "River view", price: 22, blurb: "Floor-to-ceiling Chao Phraya panorama" },
  { id: "quiet-wing", label: "Quiet wing", price: 15, blurb: "Away from lifts and pool deck" },
  { id: "late-checkout", label: "Late checkout (4pm)", price: 25, blurb: "Your morning back" },
  { id: "early-checkin", label: "Guaranteed early check-in", price: 20, blurb: "Room ready from 9am" },
  { id: "workspace", label: "Ergonomic workspace", price: 12, blurb: "Herman Miller chair, 27\" display, ring light" },
  { id: "espresso", label: "In-room espresso setup", price: 8, blurb: "Local roaster beans, fresh daily" },
  { id: "breakfast", label: "SAEN breakfast for two", price: 24, blurb: "Riverside Thai-Isan morning table" },
  { id: "lounge", label: "Neural Lounge access", price: 30, blurb: "All-day refreshments, level 31" },
  { id: "spa-credit", label: "Recovery studio credit", price: 28, blurb: "60-min massage or cryo session" },
  { id: "kids-setup", label: "Family setup", price: 16, blurb: "Sofa bed made up, child amenities, pool wristbands" },
  { id: "connecting", label: "Connecting room hold", price: 35, blurb: "Adjacent room held for your party" },
  { id: "airport-transfer", label: "Airport transfer (EV)", price: 32, blurb: "Driver tracks your flight, meets you at gate 4" },
  { id: "esim", label: "Local eSIM, pre-provisioned", price: 6, blurb: "Activated before you land" },
];

export type ActivityPartner = {
  id: string;
  name: string;
  price: number;
  discountPct: number;
  duration: string;
  blurb: string;
  image: string;
};

/** Pre-vetted local tour partners; guest discount already negotiated. */
export const PARTNERS: ActivityPartner[] = [
  { id: "kayak", name: "Sunset kayaking, Bang Krachao", price: 45, discountPct: 10, duration: "2.5 hrs", image: "kayak", blurb: "Paddle the green lung at golden hour" },
  { id: "food-tour", name: "Charoen Krung street-food walk", price: 38, discountPct: 10, duration: "3 hrs", image: "food-tour", blurb: "Seven stops, one Michelin Bib Gourmand" },
  { id: "muay-thai", name: "Muay Thai foundations class", price: 30, discountPct: 10, duration: "1.5 hrs", image: "muay-thai", blurb: "Private ring, beginner friendly" },
  { id: "dinner-cruise", name: "Chao Phraya dinner cruise", price: 75, discountPct: 10, duration: "2 hrs", image: "dinner-cruise", blurb: "Temples by night from the water" },
  { id: "market-dawn", name: "Dawn flower-market photo walk", price: 25, discountPct: 10, duration: "2 hrs", image: "market-dawn", blurb: "Pak Khlong Talat before the city wakes" },
  { id: "temple-tuk", name: "Grand Palace & temples by tuk-tuk", price: 55, discountPct: 10, duration: "4 hrs", image: "temple-tuk", blurb: "Wat Pho and Wat Arun with a local historian" },
  { id: "cooking-class", name: "Riverside Thai cooking class", price: 60, discountPct: 10, duration: "3.5 hrs", image: "cooking-class", blurb: "Market shop then cook four dishes by the water" },
  { id: "jim-thompson", name: "Jim Thompson & textile quarter", price: 35, discountPct: 10, duration: "3 hrs", image: "jim-thompson", blurb: "Silk, design and a hidden-house lunch" },
];

/** Housekeeping team availability (mock) — the concierge checks these before confirming. */
export const HOUSEKEEPING_SLOTS = ["11:00", "13:00", "14:00", "16:00"];

export type EventSpace = {
  id: string;
  name: string;
  theatre: number;
  banquet: number;
  reception: number;
  dayRate: number;
  blurb: string;
};

/** Meetings & events inventory for the MICE Co-Pilot. */
export const EVENT_SPACES: EventSpace[] = [
  { id: "ballroom", name: "Riverside Ballroom", theatre: 400, banquet: 280, reception: 500, dayRate: 4500, blurb: "Column-free, 6m ceilings, river-facing pre-function foyer" },
  { id: "forum", name: "The Neural Forum", theatre: 120, banquet: 80, reception: 150, dayRate: 1800, blurb: "Tiered auto-cam room, built for hybrid keynotes" },
  { id: "skyline", name: "Skyline Studio (L31)", theatre: 60, banquet: 40, reception: 90, dayRate: 1200, blurb: "Floor-to-ceiling skyline glass, golden-hour receptions" },
  { id: "atelier", name: "The Atelier", theatre: 40, banquet: 24, reception: 50, dayRate: 800, blurb: "Natural-light workshop space with writable walls" },
  { id: "breakout", name: "Breakout Pods (×3)", theatre: 20, banquet: 12, reception: 25, dayRate: 400, blurb: "Bookable singly or as a cluster for syndicate work" },
];

/** Day-delegate rate: per person, includes room hire share, AV, 2 breaks + lunch. */
export const DDR_PER_PERSON = 85;

export function miceBrief(): string {
  return [
    `Venue: ${HOTEL.name}, ${HOTEL.setting}, ${HOTEL.city}.`,
    `Event spaces (id | name | theatre | banquet | reception | USD/day | note):\n${EVENT_SPACES.map((s) => `- ${s.id} | ${s.name} | ${s.theatre} | ${s.banquet} | ${s.reception} | $${s.dayRate} | ${s.blurb}`).join("\n")}`,
    `Day-delegate rate (DDR): $${DDR_PER_PERSON}/person/day — includes room hire share, AV package, two networking breaks and a working lunch.`,
    `Catering: SAEN riverside Thai-Isan banquets, plus international and dietary menus. Onsite AV and a dedicated event producer included on bookings over 50 delegates.`,
  ].join("\n\n");
}

export function hotelBrief(): string {
  return [
    `Property: ${HOTEL.name}, ${HOTEL.setting}, ${HOTEL.city}. ${HOTEL.rooms} rooms.`,
    `Base room: ${HOTEL.baseRoom.name} at $${HOTEL.baseRoom.price}/night.`,
    `Facts:\n- ${HOTEL.facts.join("\n- ")}`,
    `Facilities (name | location | hours):\n${FACILITIES.map((f) => `- ${f.name} | ${f.location} | ${f.hours} — ${f.blurb}`).join("\n")}`,
    `Sala Day Spa packages (name | duration | USD):\n${SPA_PACKAGES.map((s) => `- ${s.name} | ${s.duration} | $${s.price} — ${s.blurb}`).join("\n")}`,
    `Fitness & recovery, incl. personal trainer (name | USD | basis):\n${FITNESS.map((f) => `- ${f.name} | $${f.price} | ${f.basis} — ${f.blurb}`).join("\n")}`,
    `Wellness classes (name | schedule | USD):\n${CLASSES.map((c) => `- ${c.name} | ${c.schedule} | ${c.price === 0 ? "complimentary" : `$${c.price}`} — ${c.blurb}`).join("\n")}`,
    `Transfers & chauffeur desk (name | USD | basis):\n${TRANSFERS.map((t) => `- ${t.name} | $${t.price} | ${t.basis} — ${t.blurb}`).join("\n")}`,
    `What's on — curated events (name | when):\n${EVENTS.map((e) => `- ${e.name} | ${e.cadence} — ${e.blurb}`).join("\n")}`,
    `Attribute catalogue (id | label | USD/night | note):\n${ATTRIBUTES.map((a) => `- ${a.id} | ${a.label} | $${a.price} | ${a.blurb}`).join("\n")}`,
    `Local tour partners (id | name | USD | guest discount | duration):\n${PARTNERS.map((p) => `- ${p.id} | ${p.name} | $${p.price} | ${p.discountPct}% | ${p.duration} — ${p.blurb}`).join("\n")}`,
    `Housekeeping slots today: ${HOUSEKEEPING_SLOTS.join(", ")}.`,
  ].join("\n\n");
}
