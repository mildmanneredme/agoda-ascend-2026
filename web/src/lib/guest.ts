export type TravelStyle = {
  id: string;
  label: string;
  emoji: string;
  color: string;
};

export const TRAVEL_STYLES: TravelStyle[] = [
  { id: "business", label: "I travel for business", emoji: "💼", color: "var(--ray-cyan)" },
  { id: "quiet", label: "I prefer quiet rooms", emoji: "🌙", color: "var(--ray-aqua)" },
  { id: "dining", label: "I value local dining", emoji: "🍜", color: "var(--ray-amber)" },
  { id: "wellness", label: "I'm here to recharge", emoji: "🧘", color: "var(--ray-green)" },
  { id: "family", label: "I travel with family", emoji: "👨‍👩‍👧", color: "var(--ray-magenta)" },
  { id: "adventure", label: "I chase experiences", emoji: "🛶", color: "var(--ray-red)" },
];

export type GuestProfile = {
  name: string;
  styleId: string;
  personaId?: string; // set when a preset traveler was chosen; absent for custom
  createdAt: string;
};

const KEY = "gn.guest";

export function loadGuest(): GuestProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuestProfile) : null;
  } catch {
    return null;
  }
}

export function saveGuest(profile: GuestProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearGuest() {
  localStorage.removeItem(KEY);
}

export function styleOf(profile: GuestProfile | null): TravelStyle {
  return TRAVEL_STYLES.find((s) => s.id === profile?.styleId) ?? TRAVEL_STYLES[0];
}
