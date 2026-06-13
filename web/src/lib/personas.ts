import { TRAVEL_STYLES, type GuestProfile, type TravelStyle } from "./guest";

export type Persona = {
  id: string;
  name: string;
  role: string; // short title, e.g. "Executive Strategist"
  home: string;
  glyph: string;
  styleId: string; // maps to a TRAVEL_STYLES id for theming
  tagline: string; // one line, shown on the gallery card
  brief: string; // rich context fed to the AI prompts
  signals: string[]; // simulated past-behaviour signals (memory realism + X-ray)
};

/**
 * Preset travelers for demonstration. Elena is the protagonist of the Part 1
 * showcase story, so the sandbox ties straight back to the presentation.
 * Each maps to one of the six TRAVEL_STYLES for consistent accent theming.
 */
export const PERSONAS: Persona[] = [
  {
    id: "elena",
    name: "Elena",
    role: "Executive Strategist",
    home: "Madrid",
    glyph: "💼",
    styleId: "business",
    tagline: "Consultant, 3 weeks a month on the road. Sleep and focus are non-negotiable.",
    brief:
      "Elena Vasquez, 41, management consultant based in Madrid, travels roughly three weeks a month. Declared style: business. Behaviour on file: books high quiet floors, always takes late checkout, needs a reliable in-room workspace and strong coffee, dines light and late, prizes efficiency over indulgence. Platinum tier across two sister properties.",
    signals: [
      "Selected a high floor on 9 of her last 10 stays",
      "Took late checkout every stay this year",
      "Ordered single-origin espresso to the room before 7am in Lisbon",
      "Declined turndown but always requested a second desk lamp",
    ],
  },
  {
    id: "marcus",
    name: "Marcus",
    role: "Family Architect",
    home: "Sydney",
    glyph: "👨‍👩‍👧",
    styleId: "family",
    tagline: "Two kids, one mission: zero friction and a pool they won't leave.",
    brief:
      "Marcus Bennett, 38, travels with his partner and two children (6 and 9) from Sydney. Declared style: family. Behaviour on file: books connecting rooms, needs early check-in after long flights, asks about pool hours and kids' menus first, values predictability and safety over novelty.",
    signals: [
      "Booked connecting rooms on every leisure stay",
      "Requested early check-in 4 of 5 times, citing kids' jet lag",
      "Asked about pool opening hours within an hour of arrival in Singapore",
      "Pre-ordered a child's cot and high chair in Tokyo",
    ],
  },
  {
    id: "aiko",
    name: "Aiko",
    role: "Long-Stay Creator",
    home: "Kyoto",
    glyph: "🌙",
    styleId: "quiet",
    tagline: "Writer and designer. Stays for weeks. Needs deep quiet and fast wifi.",
    brief:
      "Aiko Tanaka, 33, a writer and product designer from Kyoto who works remotely on long stays of 2–3 weeks. Declared style: quiet rooms. Behaviour on file: requests rooms away from lifts, works late into the night, orders late room service, treats the room as a studio. Sensitive to noise and light.",
    signals: [
      "Requested a room away from the lift and ice machine every stay",
      "Ordered room service after 22:00 on 3 of 4 nights in Tokyo",
      "Extended her stay twice mid-visit",
      "Asked for blackout curtains and a second monitor in Lisbon",
    ],
  },
  {
    id: "priya",
    name: "Priya",
    role: "Wellness Seeker",
    home: "Mumbai",
    glyph: "🧘",
    styleId: "wellness",
    tagline: "Here to recharge. Spa, river light, slow mornings, no notifications.",
    brief:
      "Priya Anand, 45, a founder from Mumbai who travels to disconnect and recover. Declared style: here to recharge. Behaviour on file: books spa and recovery sessions, prefers river or garden views, takes slow late breakfasts, avoids back-to-back scheduling, values calm and discretion.",
    signals: [
      "Booked a spa or recovery session on every stay this year",
      "Chose a river-view room when offered, 5 of 6 times",
      "Took breakfast after 09:30 consistently",
      "Opted out of all marketing notifications but kept wellness reminders",
    ],
  },
  {
    id: "lucas",
    name: "Lucas",
    role: "Culinary Explorer",
    home: "Lyon",
    glyph: "🍜",
    styleId: "dining",
    tagline: "Travels for the table. Wants the dish only locals know about.",
    brief:
      "Lucas Moreau, 36, a chef and food writer from Lyon who travels for the local table. Declared style: values local dining. Behaviour on file: asks concierge for off-menu and local-only recommendations, books food tours and market walks, dines late, willing to travel across town for one dish.",
    signals: [
      "Asked concierge for 'where the staff eat' at three properties",
      "Booked a food tour or market walk on most leisure stays",
      "Rated the riverside Thai-Isan dinner 5★ and rebooked it",
      "Requested a 21:30 dinner reservation in Bangkok",
    ],
  },
  {
    id: "jordan",
    name: "Jordan",
    role: "Experience Chaser",
    home: "Austin",
    glyph: "🛶",
    styleId: "adventure",
    tagline: "Sleeps to do more. Sunrise paddle, night market, repeat.",
    brief:
      "Jordan Reyes, 29, from Austin, travels to pack in experiences. Declared style: chases experiences. Behaviour on file: books active partner activities (kayaking, classes, tours), starts early, wants insider routes, treats the hotel as a basecamp rather than a destination.",
    signals: [
      "Booked two or more partner activities on every leisure stay",
      "Requested a 05:30 wake-up for a sunrise tour in Bali",
      "Asked for bike and kayak storage in Lisbon",
      "Opted into every 'local experiences' nudge sent",
    ],
  },
];

/** The trip each guest is planning to book — drives the Offer Builder intake. */
export type PlannedStay = {
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  occasion: string;
};

// All stays land in Bangkok (where The Grand Neural is), so the search results
// stay coherent; dates, guests and occasion differ per traveler.
export const STAYS: Record<string, PlannedStay> = {
  elena: { city: "Bangkok", checkIn: "Thu 18 Jun", checkOut: "Sat 20 Jun", nights: 2, guests: 1, occasion: "Client strategy sprint" },
  marcus: { city: "Bangkok", checkIn: "Thu 25 Jun", checkOut: "Tue 30 Jun", nights: 5, guests: 4, occasion: "Family half-term escape" },
  aiko: { city: "Bangkok", checkIn: "Mon 22 Jun", checkOut: "Mon 6 Jul", nights: 14, guests: 1, occasion: "Remote-work residency" },
  priya: { city: "Bangkok", checkIn: "Fri 19 Jun", checkOut: "Tue 23 Jun", nights: 4, guests: 1, occasion: "Wellness reset" },
  lucas: { city: "Bangkok", checkIn: "Fri 26 Jun", checkOut: "Mon 29 Jun", nights: 3, guests: 2, occasion: "Culinary city break" },
  jordan: { city: "Bangkok", checkIn: "Sat 20 Jun", checkOut: "Wed 24 Jun", nights: 4, guests: 2, occasion: "Experiences trip" },
};

export const DEFAULT_STAY: PlannedStay = {
  city: "Bangkok", checkIn: "Fri 19 Jun", checkOut: "Sun 21 Jun", nights: 2, guests: 1, occasion: "City stay",
};

export function stayOf(guest: GuestProfile | null): PlannedStay {
  return STAYS[guest?.personaId ?? ""] ?? DEFAULT_STAY;
}

export function personaById(id?: string | null): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

export function personaOf(guest: GuestProfile | null): Persona | undefined {
  return personaById(guest?.personaId);
}

export function styleForPersona(p: Persona): TravelStyle {
  return TRAVEL_STYLES.find((s) => s.id === p.styleId) ?? TRAVEL_STYLES[0];
}

/** The context string the AI uses for a guest — rich for presets, derived for custom. */
export function briefOf(guest: GuestProfile, styleLabel: string): string {
  const persona = personaOf(guest);
  if (persona) return persona.brief;
  return `${guest.name}, a guest whose one declared travel preference is "${styleLabel}". Treat them personally based on that.`;
}

export function signalsOf(guest: GuestProfile): string[] {
  return personaOf(guest)?.signals ?? [];
}
