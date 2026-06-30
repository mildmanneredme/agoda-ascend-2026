# The Grand Neural — Agoda Ascend Sandbox

Master guide for this repository. The **app** lives in [`web/`](web/) (its own git repo +
[`web/CLAUDE.md`](web/CLAUDE.md) / [`web/AGENTS.md`](web/AGENTS.md)); this root holds the app
plus the media pipeline, docs and tooling.

> ⚠️ The app is **Next.js 16.2.9** — APIs differ from older Next. Read the relevant guide in
> `web/node_modules/next/dist/docs/` before non-trivial App Router / `next/image` / metadata /
> route-handler work. (See `web/AGENTS.md`.)

> 🤖 The inventory block at the bottom (between the AUTO markers) is **auto-generated** by
> `scripts/update-claude-md.mjs` via a **Stop hook** — don't hand-edit it.

---

## What this is

A mobile-first PWA demo for **Agoda Ascend 2026** (Part 2). A guest scans a QR code, picks a
**profile** (or creates one), and explores AI hotel-tech demos set in a fictional property,
**The Grand Neural** (riverside Bangkok). Every AI feature runs on **Gemini 3 Flash**, server-side.

## Stack

- **Next.js 16.2.9** App Router · **React 19** · **TypeScript** · **Tailwind CSS v4** · **Motion 12**
- **Gemini 3 Flash** (`@google/genai`, `gemini-3-flash-preview`) — key stays server-side in route handlers
- **Replicate** (`openai/gpt-image-2`, `bytedance/seedance-1.5-pro`) for **pre-rendered** media (build-time only, never at runtime)
- Path alias `@/*` → `web/src/*`

## Repo layout

```
ascend-sandbox/
├── web/                     # the Next.js app (git repo)
│   ├── src/app/             # routes + app/api/* route handlers
│   ├── src/components/      # shared UI
│   ├── src/lib/             # seed data, guest/persona state, gemini client, trace
│   └── public/              # pre-rendered media (property/, hero/, personas/, mobile-background.png, icons)
├── scripts/
│   ├── generate-media.mjs   # generate property imagery + hero videos + personas + favicons (Replicate)
│   └── update-claude-md.mjs # regenerates this file's AUTO inventory block (Stop hook)
├── docs/                    # design/ideation docs (e.g. intent-engine-alternatives.md)
├── reference-docs/          # source reference material (incl. Mobile-background.png)
├── .mcp.json                # Replicate MCP server registration
└── .env.local               # GEMINI_API_KEY + REPLICATE_API_TOKEN  (repo root)
```

## Commands

```bash
cd web
npm run dev      # local dev (the live server in this project runs on :3456)
npm run build    # production build (runs ESLint — see "Lint" below)
npm run lint
# media generation (from repo root):
node scripts/generate-media.mjs --all --personas        # full batch, both art styles
node scripts/generate-media.mjs --favicons              # brain favicon ideas
```

`.env.local` (repo root) needs `GEMINI_API_KEY` (app) and `REPLICATE_API_TOKEN` (media + MCP).
`web/.env.local` needs `GEMINI_API_KEY` for the dev server. Accessing the dev server from another
device (a phone on the LAN) requires that host in `allowedDevOrigins` in `web/next.config.ts`,
or Next 16 blocks the client JS and nothing is interactive.

---

## The experience (flow)

1. **Landing** (`/`) — hero video backdrop (no chrome graphics); single CTA **"Welcome to the Neural"** → the chooser. A `?choose=1` query opens the chooser directly.
2. **Profile chooser** (the `gallery` stage on `/`) — six persona cards (Elena first) with portraits, or "be yourself". Picking shows **"Loading {name}'s profile…"** (persona) or **"Creating {name} profile…"** (custom), then routes to the hub. The chosen profile is saved to `localStorage` and drives every app.
3. **Hub** (`/hub`) — top-left **agoda·ascend logo → home**; top-right **profile avatar → chooser** (`/?choose=1`). An "Explore the property" tile + the seven apps grouped by three pillars.
4. **Explore the Property** (`/property`) — a guided tour of the hotel (Riverside Luxe art direction).
5. **Micro-apps** (`/apps/*`) — each uses `AppHeader` (back to hub, title, pillar badge, **active-profile avatar** linking to the chooser).

### Navigation rules
- Logo (top-left, hub) → `/` home. Profile avatar (top-right, hub + every app) → `/?choose=1` chooser.

## The seven micro-apps (`web/src/app/apps/*` + `app/api/*`)

| App | Pillar | What it does |
|-----|--------|--------------|
| **Offer Builder** | Know Me | Conversational intake pre-filled from the guest's planned stay → **Agoda-style search results with The Grand Neural pinned #1** (fictional competitors below) → tap → Gemini composes a priced attribute bundle. |
| **Guest Memory** | Know Me | Infers preferences from behaviour signals with confidence + reasoning. |
| **AI Concierge** | Already Handled | Streaming chat, proactive nudges, bookable actions. |
| **Journey Assistant** | Already Handled | Delay **or flight-cancellation** scenario; cancellation centers on a **stay extension** (room re-opened for an extra night). |
| **Sentiment Lab** | Human Edge | Review → routed/prioritised tasks. Examples are colour-coded (2 red / 1 orange / 1 green); positive reviews fire a green **"Kudos sent to {team}"** staff notification. |
| **MICE Co-Pilot** | Human Edge | **Two-way conversation**: asks 1-2 clarifying questions → returns a primary recommendation **+ alternatives** + costed email. |
| **Intent Engine** | Human Edge | Multilingual intent detection + native reply. *(Flagged weak — see [`docs/intent-engine-alternatives.md`](docs/intent-engine-alternatives.md) for the "Care Radar" rethink.)* |

Each app records a **DevTrace** (prompt, response, agent map, latency) surfaced by the X-ray panel
(`DevTrace`/`PeelCorner`/`XrayPanel`) — the "show the AI's working" honesty layer.

## Data model (`web/src/lib`)

- **`hotel.ts`** — The Grand Neural seed data: rooms, attributes, and the showcase catalogues
  (`FACILITIES`, `SPA_PACKAGES`, `FITNESS`, `CLASSES`, `TRANSFERS`, `EVENTS`, tour `PARTNERS`,
  event spaces). `hotelBrief()` flattens it all into the prompt context every app feeds Gemini —
  **add an amenity here and the AI can immediately talk about it.**
- **`personas.ts`** — six preset travelers (Elena is the protagonist) + `STAYS` (each guest's
  planned trip: Bangkok, distinct dates/guests/occasion — drives the Offer Builder intake).
- **`guest.ts`** — `GuestProfile` type + `localStorage` persistence + travel styles.
- **`artStyle.ts`** — luxe-only asset-path helpers (`imgSrc`/`heroPoster`/`heroMaster`).
- **`gemini.ts`** — server client (model `gemini-3-flash-preview`, `FAST` = no extended thinking).
- **`trace.ts`** — DevTrace types + the logical-agent registry.

## Visuals & media

- **Art direction:** `luxe` (cinematic golden-hour riverside) — the single, app-wide look for the
  property showcase + landing hero video.
- **Pre-rendered static assets** under `web/public/` (Replicate is never called at runtime):
  - `property/luxe/<slug>.webp` — showcase imagery
  - `hero/landing-luxe.mp4` + `…-poster.webp` — landing ambient loop (plays at 0.8×)
  - `personas/<id>.webp` — persona portraits (emoji-glyph fallback)
  - `mobile-background.png` — app-wide backdrop (fixed, behind everything except the landing video)
  - `icon.png` / `apple-icon.png` / `icon-{192,512}.png` — brain favicon
- Regenerate with `scripts/generate-media.mjs` (flags: `--all`, `--subjects=`, `--styles=luxe`,
  `--poster`, `--video`, `--personas`, `--favicons`, `--force`). `replicate-mcp` is registered in
  `.mcp.json` for interactive use (needs `REPLICATE_API_TOKEN`).

## Conventions

- Brand tokens (`--abyss`, `--navy`, the Agoda rainbow `--ray-*`) and the `glass`/`glass-deep`,
  `press`, `rise`/`stagger`/`prism-text`/`foil` utilities live in `web/src/app/globals.css`. Reuse them.
- Mobile-first, dark theme, `pt-safe`/`pb-safe`, `prefers-reduced-motion` respected.
- Client app pages load the guest from `localStorage` and redirect to `/` if absent.
- New cross-component state that reads `localStorage` should use `useSyncExternalStore` (see `artStyle.ts`).

### Lint
Several **pre-existing** app pages trip React 19's `react-hooks/set-state-in-effect` rule (the
`loadGuest()`-in-effect pattern). `next build` runs ESLint and fails on errors, so a production
build is currently blocked by these. Fix option when needed: downgrade the rule to a warning in
`web/eslint.config.mjs`, or refactor those effects. New code should avoid the pattern.

## Deploy (Vercel)

Root directory = `web/`. Set `GEMINI_API_KEY`. Generated media is committed under `web/public/`.

---

<!-- AUTO:START -->
<!-- Generated by scripts/update-claude-md.mjs (Stop hook). Do not edit between the AUTO markers. -->

### Pages (10)
- `/`
- `/apps/care-radar`
- `/apps/concierge`
- `/apps/journey`
- `/apps/memory-engine`
- `/apps/mice`
- `/apps/offer-builder`
- `/apps/sentiment`
- `/hub`
- `/property`

### API endpoints (7)
- `/api/care-radar`
- `/api/concierge`
- `/api/journey`
- `/api/memory`
- `/api/mice`
- `/api/offer`
- `/api/sentiment`

### Components (11)
`AgentMap` · `AppHeader` · `DevTrace` · `HeroVideo` · `LiveReasoning` · `Media` · `PeelCorner` · `PersonaAvatar` · `RayBurst` · `Wordmark` · `XrayPanel`

### Library modules (`web/src/lib`)
`anim` · `artStyle` · `careRadar` · `gemini` · `guest` · `hotel` · `personas` · `rateLimit` · `trace`

### Hotel catalogues (`lib/hotel.ts` exports)
`HOTEL` · `FACILITIES` · `SPA_PACKAGES` · `FITNESS` · `CLASSES` · `TRANSFERS` · `EVENTS` · `ATTRIBUTES` · `PARTNERS` · `HOUSEKEEPING_SLOTS` · `EVENT_SPACES` · `DDR_PER_PERSON`

### Generated media (`web/public`)
- property/luxe: **25** · property/neon: **0** · personas: **6** · hero: **6**

### Docs (`docs/`)
- [`docs/care-radar-floorplan.md`](docs/care-radar-floorplan.md)
- [`docs/intent-engine-alternatives.md`](docs/intent-engine-alternatives.md)
- [`docs/keynote-outline.md`](docs/keynote-outline.md)
- [`docs/wow-recommendations.md`](docs/wow-recommendations.md)
<!-- AUTO:END -->
