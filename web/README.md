# The Grand Neural — Agoda Ascend Sandbox

Mobile-first PWA for the Agoda Ascend 2026 GenAI showcase (Part 2). Attendees scan a QR
code, complete a 30-second "Be the Guest" onboarding, and explore AI hotel-tech demos
powered by Gemini — all set in a fictional property, The Grand Neural.

## Run locally
```bash
npm install
# .env.local must contain GEMINI_API_KEY=...
npm run dev      # http://localhost:3000
```

## What's built
- **Onboarding** (`/`) — name + travel style, seeds a localStorage guest profile
- **Hub** (`/hub`) — seven apps grouped by the three pillars; three are live
- **Offer Builder** (`/apps/offer-builder`) — Gemini composes a priced attribute bundle
- **Memory Engine** (`/apps/memory-engine`) — inferred guest profile with AI reasoning
- **Concierge** (`/apps/concierge`) — streaming chat, proactive nudges, bookable actions

Remaining 4 apps are teased as "Soon" on the hub.

## Architecture
- Next.js App Router. Gemini key stays server-side in `src/app/api/*` route handlers.
- `src/lib/hotel.ts` — The Grand Neural seed data (rooms, attributes, partners, schedules)
- `src/lib/gemini.ts` — server client wrapper (model: gemini-2.5-flash)
- `src/lib/guest.ts` — guest profile type + localStorage persistence
- Brand system (navy/violet + agoda rainbow, light-burst motif) in `src/app/globals.css`

## Deploy (Vercel)
Set `GEMINI_API_KEY` env var in the Vercel project. Root directory = `web/`.
