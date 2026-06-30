@AGENTS.md

# The Grand Neural — Agoda Ascend Sandbox

Mobile-first PWA for the Agoda Ascend 2026 GenAI showcase (Part 2). Attendees scan a QR
code, complete a 30-second "Be the Guest" onboarding, then explore AI hotel-tech demos —
all set in a fictional property, **The Grand Neural** (riverside Bangkok).

> ⚠️ This is **Next.js 16.2.9** with breaking changes from older Next. Read the relevant
> guide under `node_modules/next/dist/docs/` before writing non-trivial App Router,
> `next/image`, metadata, or route-handler code. (See `AGENTS.md`.)

## Stack
- **Next.js 16.2.9** App Router · **React 19** · **TypeScript** · **Tailwind CSS v4** · **Motion 12**
- **Gemini 3 Flash** (`@google/genai`, model `gemini-3-flash-preview`) for all AI features — key stays server-side
- Path alias: `@/*` → `src/*`

## Commands
```bash
npm run dev      # local dev (default :3000)
npm run build    # production build (runs ESLint; see note below)
npm run lint
```
Requires `.env.local` with `GEMINI_API_KEY`. Media generation also needs
`REPLICATE_API_TOKEN` (kept in the **repo-root** `.env.local`, one level up).

## Structure
- `src/app/page.tsx` — onboarding (personas + custom guest), seeds a localStorage profile
- `src/app/hub/page.tsx` — the seven app demos grouped by three pillars + the property tile
- `src/app/property/page.tsx` — **Explore the Property** showcase (amenities/experiences)
- `src/app/apps/*` — the seven feature demos (offer-builder, memory-engine, concierge, …)
- `src/app/api/*` — server route handlers; the Gemini key never leaves the server
- `src/components/*` — `AppHeader`, `RayBurst`, `Wordmark`, `Media`, `HeroVideo`,
  `PersonaAvatar`, and the DevTrace/X-ray "honesty" panel (`DevTrace`/`DevCog`/`XrayPanel`)
- `src/lib/hotel.ts` — The Grand Neural seed data: rooms, attributes, `FACILITIES`,
  `SPA_PACKAGES`, `FITNESS`, `CLASSES`, `TRANSFERS`, `EVENTS`, tour `PARTNERS`, event spaces.
  `hotelBrief()` flattens it all into the prompt context every app feeds Gemini — **add new
  amenities here and they automatically become things the AI can talk about.**
- `src/lib/guest.ts` / `personas.ts` — guest profile + the six preset travelers
- `src/lib/artStyle.ts` — luxe-only asset-path helpers (`imgSrc`/`heroPoster`/`heroMaster`)
- `src/lib/trace.ts` — X-ray trace types + the logical-agent registry

## Conventions
- **Brand tokens** (navy/violet + the Agoda rainbow `--ray-*`) and the `glass`/`glass-deep`,
  `press`, `rise`/`stagger`/`prism-text`/`foil` utilities live in `src/app/globals.css`.
  Reuse them; don't hand-roll new colors.
- Mobile-first, dark theme, `pt-safe`/`pb-safe` safe-area helpers, `prefers-reduced-motion` respected.
- Client pages load the guest from localStorage and redirect to `/` if absent.

## Visuals & media
- Imagery is **pre-rendered static assets** under `public/` — Replicate is never called at
  runtime (keeps the PWA fast and Vercel-friendly):
  - `public/property/luxe/<slug>.webp` — Riverside Luxe showcase imagery
  - `public/hero/landing-luxe.mp4` + `…-poster.webp` — landing ambient loop
  - `public/personas/<id>.webp` — persona portraits (emoji-glyph fallback)
- Regenerate via `node scripts/generate-media.mjs` (repo root). Models: `openai/gpt-image-2`
  (quality `medium`) for stills, `bytedance/seedance-1.5-pro` (9:16) for the hero loop.
  Flags: `--all`, `--subjects=…`, `--styles=luxe`, `--poster`, `--video`, `--personas`, `--force`.
- The `replicate-mcp` server is registered in the repo-root `.mcp.json` for interactive use
  (needs `REPLICATE_API_TOKEN` in the environment).

## Deploy (Vercel)
Root directory = `web/`. Set `GEMINI_API_KEY`. Generated media is committed under `public/`.

## Note on lint
Several pre-existing app pages trip React 19's `react-hooks/set-state-in-effect` rule
(the localStorage-hydration pattern). New code uses `useSyncExternalStore` to avoid it.
