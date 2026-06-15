/**
 * EQ Radar — the in-house roster the staff-facing board reads.
 *
 * Every checked-in guest carries a *seeded* emotional read (RAG status, emotion,
 * intensity, occasion) so the 3D board paints instantly and stays deterministic
 * for a live demo. Tapping a guest fires the live Gemini call (api/care-radar),
 * which interprets the `interactions` log into the staff care brief.
 *
 * Some guests link to a preset `personaId` so the AI can draw on that persona's
 * rich `brief` + behavioural `signals`; the rest are bespoke in-house scenarios.
 */

export type CareStatus = "red" | "amber" | "green";

export type Interaction = {
  channel: string; // "Check-in note" | "Concierge chat" | "Room service" | …
  time: string; // "21:14" | "Today 08:02"
  text: string;
};

export type InHouseGuest = {
  id: string;
  name: string;
  room: string; // display, e.g. "503"
  floor: number; // 1–5 (which plate)
  cell: number; // 0…13 — which room on the floorplan (0–6 north, 7–13 south)
  party: string; // "Solo" | "Couple" | "Family of 4"
  nights: string; // "Night 2 of 4"
  status: CareStatus; // seeded RAG
  emotion: string; // seeded label, e.g. "Grief"
  intensity: number; // 0–100, drives marker pulse amplitude
  occasion: string; // "Here for a parent's funeral"
  oneLine: string; // board summary
  personaId?: string; // links a preset persona (reuse brief/signals/portrait)
  glyph: string; // avatar fallback emoji
  color: string; // avatar fallback theming (ray hex)
  interactions: Interaction[]; // the evidence the AI reads
};

export const FLOORS = 5;
export const ROOMS_PER_FLOOR = 14; // perimeter floorplan: 7 north + 7 south

/** RAG hex — shared by CSS badges and the Three.js marker materials. */
export const CARE_COLOR: Record<CareStatus, string> = {
  red: "#ff2838", // --ray-red · needs care now
  amber: "#fdb812", // --ray-amber · needs a gentle touch
  green: "#00b057", // --ray-green · settled / delighted
};

export const STATUS_LABEL: Record<CareStatus, string> = {
  red: "Needs care now",
  amber: "Gentle touch",
  green: "Settled",
};

export const IN_HOUSE: InHouseGuest[] = [
  // ───────────────────────── RED ─────────────────────────
  {
    id: "okafor",
    name: "Mrs. Okafor",
    room: "502",
    floor: 5,
    cell: 0,
    party: "Solo",
    nights: "Night 1 of 3",
    status: "red",
    emotion: "Grief",
    intensity: 88,
    occasion: "In Bangkok for a parent's funeral",
    oneLine: "Bereaved · here for a funeral, travelling alone",
    glyph: "🕊️",
    color: "#4beaea",
    interactions: [
      { channel: "Check-in note", time: "Today 15:40", text: "Quiet, asked for a low floor away from the pool. Declined the welcome drink and the river-cruise flyer." },
      { channel: "Concierge chat", time: "21:14", text: "\"Is there a florist nearby that's open early? I need a white wreath for tomorrow morning.\"" },
      { channel: "Housekeeping", time: "21:50", text: "Declined turndown. Asked not to be disturbed before 10am." },
      { channel: "Room service", time: "22:30", text: "Ordered only a pot of tea. No reply to the 'anything else?' follow-up." },
    ],
  },
  {
    id: "castellanos",
    name: "Mr. Castellanos",
    room: "204",
    floor: 2,
    cell: 8,
    party: "Solo",
    nights: "Night 2 of 2",
    status: "red",
    emotion: "Anger",
    intensity: 82,
    occasion: "Business trip · second AC failure unresolved",
    oneLine: "Escalating · A/C failed twice, last reply was terse",
    glyph: "💼",
    color: "#ff2838",
    interactions: [
      { channel: "Concierge chat", time: "Yesterday 23:10", text: "\"The A/C is dead again. This is the second night. I have a 7am call.\"" },
      { channel: "Maintenance log", time: "Today 00:05", text: "Reset unit, logged as resolved. No follow-up confirmation requested from guest." },
      { channel: "Concierge chat", time: "Today 06:48", text: "\"Woke up sweating. Didn't sleep. Don't tell me it's fixed.\"" },
      { channel: "Front desk", time: "Today 07:30", text: "Asked, flatly, what compensation the hotel intends to offer. Clipped tone." },
    ],
  },
  {
    id: "aiko",
    name: "Aiko",
    room: "405",
    floor: 4,
    cell: 3,
    party: "Solo",
    nights: "Night 9 of 14",
    status: "red",
    emotion: "Overwhelm",
    intensity: 74,
    occasion: "Long-stay creator · deadline week, noise-sensitive",
    oneLine: "Overwhelmed · noise complaints, working through the night",
    personaId: "aiko",
    glyph: "🌙",
    color: "#af38b1",
    interactions: [
      { channel: "Concierge chat", time: "02:40", text: "\"There's drilling somewhere on this floor in the mornings. I work nights. It's the third day.\"" },
      { channel: "Room service", time: "03:10", text: "Late-night coffee, fourth night running." },
      { channel: "Housekeeping", time: "Today 11:00", text: "\"Please skip the room, I can't lose the focus today.\" Door sign left on Do Not Disturb." },
      { channel: "Front desk", time: "Today 13:25", text: "Asked, quietly, whether a higher quiet-wing room is free. Didn't push when told she'd be moved tomorrow." },
    ],
  },

  // ───────────────────────── AMBER ─────────────────────────
  {
    id: "vance",
    name: "The Vance family",
    room: "301",
    floor: 3,
    cell: 13,
    party: "Family of 4",
    nights: "Night 3 of 5",
    status: "amber",
    emotion: "Anxiety",
    intensity: 64,
    occasion: "Family holiday · child spiked a fever overnight",
    oneLine: "Anxious · sick child, cancelled today's plans",
    glyph: "👨‍👩‍👧",
    color: "#fdb812",
    interactions: [
      { channel: "Concierge chat", time: "Today 04:20", text: "\"Our daughter has a high fever. Is there a doctor we can call? And a pharmacy?\"" },
      { channel: "Concierge chat", time: "Today 04:35", text: "\"Can we get plain rice or soft food sent up whenever the kitchen opens?\"" },
      { channel: "Front desk", time: "Today 09:10", text: "Cancelled the booked longtail-boat tour for today. Asked about late checkout 'in case she's not better.'" },
      { channel: "Housekeeping", time: "Today 10:00", text: "Requested extra towels and a thermometer if one's available." },
    ],
  },
  {
    id: "elena",
    name: "Elena",
    room: "506",
    floor: 5,
    cell: 9,
    party: "Solo",
    nights: "Night 1 of 2",
    status: "amber",
    emotion: "Exhaustion",
    intensity: 58,
    occasion: "Executive · jet-lagged into a back-to-back sprint",
    oneLine: "Running on empty · clipped replies, no time for extras",
    personaId: "elena",
    glyph: "💼",
    color: "#00aae0",
    interactions: [
      { channel: "Concierge chat", time: "Today 01:12", text: "\"Late check-in. Just need the room quiet and an espresso machine that works. Thanks.\" — clipped, one line." },
      { channel: "Room service", time: "Today 06:02", text: "Single-origin espresso to the room before 7am." },
      { channel: "Front desk", time: "Today 07:40", text: "Asked for late checkout. To the offer of a spa slot: \"No time, but thank you.\"" },
      { channel: "Concierge chat", time: "Today 08:15", text: "\"Where's the quietest place to take a 90-minute call?\"" },
    ],
  },
  {
    id: "haddad",
    name: "Mr. Haddad",
    room: "202",
    floor: 2,
    cell: 1,
    party: "Couple",
    nights: "Night 1 of 4",
    status: "amber",
    emotion: "Nervousness",
    intensity: 52,
    occasion: "First international trip · unsure how things work",
    oneLine: "Nervous · first time abroad, asking lots of small questions",
    glyph: "🧭",
    color: "#fdb812",
    interactions: [
      { channel: "Front desk", time: "Today 14:30", text: "First time abroad. Asked twice to confirm checkout time and whether breakfast is 'included or extra'." },
      { channel: "Concierge chat", time: "Today 15:10", text: "\"Is it safe to walk to the night market? And do taxis here take cards?\"" },
      { channel: "Concierge chat", time: "Today 16:00", text: "\"Sorry to ask again — how do we get the wifi to work on a second phone?\"" },
    ],
  },
  {
    id: "marcus",
    name: "Marcus",
    room: "207",
    floor: 2,
    cell: 12,
    party: "Family of 4",
    nights: "Night 2 of 5",
    status: "amber",
    emotion: "Frazzle",
    intensity: 48,
    occasion: "Family architect · two jet-lagged kids, long day",
    oneLine: "A little frazzled · juggling tired kids, wants smooth days",
    personaId: "marcus",
    glyph: "👨‍👩‍👧",
    color: "#af38b1",
    interactions: [
      { channel: "Front desk", time: "Today 06:30", text: "Asked about early breakfast — \"the kids are up at 5 on Sydney time.\"" },
      { channel: "Concierge chat", time: "Today 12:20", text: "\"Pool hours? And is there anywhere indoors if it rains this afternoon?\"" },
      { channel: "Housekeeping", time: "Today 13:00", text: "Requested the connecting door be checked — wants both rooms openable for the kids." },
    ],
  },

  // ───────────────────────── GREEN ─────────────────────────
  {
    id: "okonkwo",
    name: "Daniel & Sofia",
    room: "407",
    floor: 4,
    cell: 11,
    party: "Couple",
    nights: "Night 2 of 3",
    status: "green",
    emotion: "Joy",
    intensity: 70,
    occasion: "Celebrating their 25th wedding anniversary",
    oneLine: "Celebrating · 25th anniversary, last full day",
    glyph: "🥂",
    color: "#00b057",
    interactions: [
      { channel: "Concierge chat", time: "Yesterday 18:00", text: "\"It's our 25th anniversary tonight 🥹 any chance of a river-view table?\"" },
      { channel: "Restaurant", time: "Yesterday 21:30", text: "Riverside table, stayed late. Left a note thanking the team." },
      { channel: "Concierge chat", time: "Today 10:15", text: "\"Last full day — what's the most beautiful thing we shouldn't miss?\"" },
    ],
  },
  {
    id: "reyes-hm",
    name: "The Reyeses",
    room: "508",
    floor: 5,
    cell: 6,
    party: "Couple",
    nights: "Night 1 of 5",
    status: "green",
    emotion: "Delight",
    intensity: 66,
    occasion: "Honeymoon · just arrived, everything is new",
    oneLine: "Delighted · honeymooners on their first night",
    glyph: "💞",
    color: "#af38b1",
    interactions: [
      { channel: "Check-in note", time: "Today 14:00", text: "Honeymoon. Beaming. Asked for a photo by the river at sunset." },
      { channel: "Concierge chat", time: "Today 16:20", text: "\"What's the most romantic dinner you'd book for a first night here?\"" },
      { channel: "Room service", time: "Today 17:00", text: "Ordered the welcome sparkling and asked how late the rooftop stays open." },
    ],
  },
  {
    id: "priya",
    name: "Priya",
    room: "305",
    floor: 3,
    cell: 5,
    party: "Solo",
    nights: "Night 3 of 4",
    status: "green",
    emotion: "Calm",
    intensity: 30,
    occasion: "Wellness reset · slow mornings, fully unplugged",
    oneLine: "Calm · settled into the spa rhythm, wants quiet",
    personaId: "priya",
    glyph: "🧘",
    color: "#00b057",
    interactions: [
      { channel: "Spa", time: "Today 09:00", text: "Took the Jet-Lag Reset, rebooked the Thai Recovery for tomorrow." },
      { channel: "Room service", time: "Today 10:30", text: "Slow breakfast on the balcony, river-view room." },
      { channel: "Concierge chat", time: "Today 11:00", text: "\"No notifications please — just keep the wellness reminders. This is exactly what I needed.\"" },
    ],
  },
  {
    id: "jordan",
    name: "Jordan",
    room: "103",
    floor: 1,
    cell: 2,
    party: "Couple",
    nights: "Night 2 of 4",
    status: "green",
    emotion: "Exhilaration",
    intensity: 62,
    occasion: "Experience chaser · packing the days full, loving it",
    oneLine: "Exhilarated · loving every activity, hungry for more",
    personaId: "jordan",
    glyph: "🛶",
    color: "#00b057",
    interactions: [
      { channel: "Concierge chat", time: "Today 05:30", text: "Up for the sunrise paddle. \"Best thing we've done — what's next?\"" },
      { channel: "Activities", time: "Today 13:00", text: "Booked the Muay Thai class and asked about a night-market food crawl." },
      { channel: "Concierge chat", time: "Today 18:40", text: "\"Give us the route only locals know.\"" },
    ],
  },
  {
    id: "lucas",
    name: "Lucas",
    room: "106",
    floor: 1,
    cell: 10,
    party: "Couple",
    nights: "Night 2 of 3",
    status: "green",
    emotion: "Contentment",
    intensity: 34,
    occasion: "Culinary explorer · happily eating his way across the city",
    oneLine: "Content · happily fed, chasing the next great meal",
    personaId: "lucas",
    glyph: "🍜",
    color: "#fdb812",
    interactions: [
      { channel: "Concierge chat", time: "Yesterday 21:30", text: "\"Where do the staff actually eat? That's where we want to go.\"" },
      { channel: "Restaurant", time: "Today 13:00", text: "Rated the riverside Thai-Isan lunch 5★, asked for the recipe." },
      { channel: "Concierge chat", time: "Today 19:00", text: "\"Book us the 21:30 chef's table if there's a seat.\"" },
    ],
  },
];

export function guestById(id: string): InHouseGuest | undefined {
  return IN_HOUSE.find((g) => g.id === id);
}

export const CARE_COUNTS = {
  total: IN_HOUSE.length,
  red: IN_HOUSE.filter((g) => g.status === "red").length,
  amber: IN_HOUSE.filter((g) => g.status === "amber").length,
  green: IN_HOUSE.filter((g) => g.status === "green").length,
};

/** Board ordering: most-in-need first (used by the static fallback roster). */
const STATUS_RANK: Record<CareStatus, number> = { red: 0, amber: 1, green: 2 };
export function byUrgency(a: InHouseGuest, b: InHouseGuest): number {
  return STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.intensity - a.intensity;
}
