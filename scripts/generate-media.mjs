#!/usr/bin/env node
/**
 * Generate property imagery + hero video loops on Replicate and download them
 * into web/public. Same models the MCP exposes (openai/gpt-image-2 medium,
 * bytedance/seedance-1.5-pro), driven directly so assets are pre-rendered and
 * committed static files — Replicate is never called at app runtime.
 *
 * Usage:
 *   node scripts/generate-media.mjs --subjects=hero,pool,spa,room --styles=luxe,neon --poster --video
 *   node scripts/generate-media.mjs --all                # full batch, both styles, posters + videos
 *   node scripts/generate-media.mjs --personas           # persona portraits
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = resolve(ROOT, "web/public");

// ---- token ----
function token() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  const env = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  const m = env.match(/^REPLICATE_API_TOKEN=(.+)$/m);
  if (!m) throw new Error("REPLICATE_API_TOKEN not found");
  return m[1].trim();
}
const TOKEN = token();

// ---- shared photographic subjects (style-agnostic content) ----
const SUBJECTS = {
  hero: "establishing exterior view of a sleek 32-storey riverside luxury hotel tower on the Chao Phraya river in Bangkok at dusk, glowing glass facade, longtail boats trailing on the water, distant temples and city skyline",
  pool: "a rooftop infinity pool on the 32nd floor of a luxury Bangkok hotel, water merging with the river horizon, sun loungers and cabanas, glowing skyline beyond, early evening",
  gym: "a high-end hotel gym and recovery studio with floor-to-ceiling windows over the city skyline, premium equipment and free weights, warm wood and dark tones",
  spa: "a serene luxury day spa relaxation lounge, candlelight, a steaming vitality pool, stone and teak, folded towels, deeply tranquil",
  room: "a luxury hotel king bedroom with floor-to-ceiling windows overlooking the Chao Phraya river in Bangkok, river view, a desk workspace and espresso setup, elegant minimal interior, soft evening light",
  restaurant: "an upscale riverside Thai-Isan restaurant interior with an open charcoal grill, a river terrace, beautifully plated regional Thai dishes, warm pendant lighting, evening",
  bar: "a sophisticated rooftop bar on the 32nd floor overlooking the Bangkok river at night, botanical cocktails on the counter, glittering city lights, intimate mood",
  lounge: "an elegant executive hotel lounge on a high floor with panoramic skyline views, refreshments laid out, soft designer seating, golden hour",
  yoga: "a sunrise rooftop yoga session on a hotel pool deck above the Chao Phraya river in Bangkok, a few people holding poses on mats, soft dawn light, mist on the water",
  chauffeur: "a sleek black electric luxury car with a uniformed chauffeur waiting under the porte-cochere of a grand Bangkok hotel at night, warm entrance lighting",
  boat: "a private wooden longtail boat on the Chao Phraya river at dusk gliding past illuminated temples, guests aboard, golden reflections on the water",
  tour: "a vibrant Bangkok street-food night market, hanging lights and steaming stalls, a small group exploring, rich atmosphere",
  event: "a chic rooftop sunset DJ session and cocktail event at a luxury Bangkok hotel, golden hour, well-dressed guests mingling, river and skyline backdrop",

  // ---- per-experience subjects (tour partners) — each unique to its blurb ----
  kayak: "two people sea-kayaking through the lush mangrove canals of Bang Krachao, Bangkok's green lung, at golden hour, paddling sit-on-top kayaks under dense overhanging jungle foliage, warm low sunlight filtering through the trees, calm reflective water",
  "food-tour": "a small group on a Charoen Krung street-food walking tour in Bangkok at night, gathered at a bustling roadside stall sampling noodles and grilled skewers, hanging festoon lights, steam rising from woks, vibrant lively atmosphere",
  "muay-thai": "a private Muay Thai foundations class in a traditional boxing ring, a beginner in red gloves practising strikes against pads held by a Thai coach, heavy bags hanging behind, dramatic side lighting, focused and athletic",
  "dinner-cruise": "an elegant Chao Phraya river dinner cruise at night, a candlelit table set with fine Thai dishes on the open upper deck, the illuminated spires of Wat Arun temple glowing along the riverbank, city lights shimmering on the dark water",
  "market-dawn": "the Pak Khlong Talat flower market in Bangkok at dawn, vendors arranging garlands of orange marigolds, orchids and roses, baskets overflowing with colourful blooms, soft misty early-morning light, a visitor with a camera exploring",
  "temple-tuk": "a colourful three-wheeled tuk-tuk parked before the ornate golden spires of Bangkok's Grand Palace and Wat Pho, gleaming temple rooftops and intricate Thai architecture, bright clear daylight, a guide and travellers nearby",
  "cooking-class": "a riverside Thai cooking class, hands chopping fresh lemongrass, chillies and limes at a teak prep station beside the water, a wok flaming on a burner, herbs and ingredients laid out, a chef instructor guiding, bright daylight",
  "jim-thompson": "the Jim Thompson House, a traditional teak Thai house framed by lush tropical garden, bolts of vibrant jewel-toned Thai silk on display in an elegant heritage interior, dappled sunlight through wooden shutters",

  // ---- per-event subjects (what's on) — each unique to its blurb ----
  "chefs-table": "an intimate chef's table at the pass of an open kitchen, eight seats facing a chef plating a refined regional Thai-Isan tasting menu, glow from a charcoal grill, warm focused fine-dining lighting, exclusive and atmospheric",
  "sunset-sessions": "a rooftop sunset DJ session on the 32nd floor of a luxury Bangkok hotel, a DJ at the decks and well-dressed guests with golden-hour cocktails, the Chao Phraya river and skyline turning gold behind, glamorous celebratory mood",
  "art-walk": "a contemporary art gallery crawl in Bangkok's Charoen Krung creative district, a small group with a curator viewing large paintings on white gallery walls inside a converted industrial-chic shophouse, evening",
  "full-moon-cruise": "a private evening river cruise under a large luminous full moon, canapés and champagne flutes on the deck, the glowing temples of the Chao Phraya reflected on serene moonlit water, intimate and tranquil",
};

// ---- art-direction wrappers ----
const NO_TEXT = ". No visible text, signage, logos, brand names or watermarks anywhere in the image.";
const STYLE = {
  luxe: ", cinematic editorial hospitality photography, golden-hour light, warm amber and teal palette, deep navy shadows, moody atmospheric lighting, anamorphic, ultra-detailed, photorealistic, luxury travel magazine quality" + NO_TEXT,
  neon: ", futuristic spaceport and starship aesthetic, white minimalist Scandinavian design, clean matte-white surfaces and seamless curved architecture, soft white and electric-blue neon light strips, glowing blue accent lighting, bright airy high-tech sci-fi ambience, pristine and luminous, ultra-detailed photoreal render" + NO_TEXT,
};

const VIDEO_PROMPT = {
  luxe: "Slow cinematic aerial push toward a glowing riverside luxury hotel tower on the Chao Phraya river in Bangkok at dusk, longtail boats leaving soft trails on the water, warm amber light, drifting clouds, shimmering reflections, premium travel film",
  neon: "Slow cinematic drift through a futuristic white minimalist spaceport-style luxury hotel beside a calm river at night, clean Scandinavian architecture with seamless matte-white surfaces, glowing white and electric-blue neon light strips reflecting softly on the water, bright airy luminous high-tech atmosphere",
};

// favicon / app-icon ideas — flat, bold, transparent, legible at small size
const ICON_BG = " App icon on a deep navy (#0a0e24) background filling the whole square, soft rounded-square composition, centered, bold and legible at small sizes, high contrast, no text.";
const FAVICONS = {
  "brain-nodes": "A stylized brain merged with neural-network nodes and connecting lines, glowing aqua-cyan, clean geometric flat vector style, bold simple shapes." + ICON_BG,
  "brain-circuit": "A brain formed from circuit-like neural pathways, smooth gradient from aqua to electric blue, modern flat tech logo mark, simple and bold." + ICON_BG,
  "brain-lineart": "A minimal line-art brain glyph with a few glowing neural connection dots, white and electric-blue strokes, sleek futuristic mark, simple." + ICON_BG,
  "brain-orb": "A glowing brain-shaped neural network orb, electric blue and aqua filaments radiating light, futuristic and luminous, bold high-contrast." + ICON_BG,
};

// persona portraits (single cinematic set, not style-keyed)
const PERSONAS = {
  elena: "a confident 41-year-old Spanish businesswoman, management consultant, sharp tailored blazer, warm intelligent expression, soft studio portrait lighting, dark teal background",
  marcus: "a friendly 38-year-old Australian father, relaxed smart-casual, warm approachable smile, soft studio portrait lighting, dark teal background",
  aiko: "a thoughtful 33-year-old Japanese woman, writer and designer, minimalist style, calm creative expression, soft studio portrait lighting, dark teal background",
  priya: "a serene 45-year-old Indian woman founder, elegant and composed, wellness glow, soft studio portrait lighting, dark teal background",
  lucas: "a 36-year-old French chef and food writer, warm curious expression, casual refined style, soft studio portrait lighting, dark teal background",
  jordan: "an energetic 29-year-old American adventurer, sun-kissed, easy grin, outdoorsy casual style, soft studio portrait lighting, dark teal background",
};
const PORTRAIT_SUFFIX = ", photorealistic headshot, shallow depth of field, premium magazine portrait, ultra detailed";

// ---- args ----
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : d; };
const ALL = flag("all");
const styles = (val("styles", "luxe,neon")).split(",");
const subjects = ALL ? Object.keys(SUBJECTS) : (val("subjects", "") ? val("subjects", "").split(",") : []);
const doPoster = ALL || flag("poster");
const doVideo = ALL || flag("video");
const doPersonas = flag("personas");

// ---- replicate ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(model, input, label) {
  process.stdout.write(`  → ${label} … `);
  let res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input }),
  });
  let pred = await res.json();
  if (pred.error) throw new Error(`${label}: ${pred.error}`);
  let tries = 0;
  while (pred.status && !["succeeded", "failed", "canceled"].includes(pred.status) && tries < 120) {
    await sleep(2500);
    const p = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${TOKEN}` } });
    pred = await p.json();
    tries++;
  }
  if (pred.status !== "succeeded") throw new Error(`${label}: status ${pred.status} ${JSON.stringify(pred.error || "")}`);
  const out = pred.output;
  const url = Array.isArray(out) ? out[0] : (typeof out === "string" ? out : out?.url || out?.[0]);
  if (!url) throw new Error(`${label}: no output url in ${JSON.stringify(out).slice(0, 200)}`);
  return url;
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`saved ${dest.replace(PUBLIC, "public")} (${(buf.length / 1024).toFixed(0)} kb)`);
}

const failures = [];

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { return await fn(); }
    catch (e) {
      if (attempt === 2) { console.log(`  ✗ ${label}: ${e.message}`); failures.push(label); return; }
      console.log(`  ↻ ${label}: ${e.message} — retrying`);
      await sleep(3000);
    }
  }
}

async function image(prompt, aspect, dest, label) {
  if (existsSync(dest) && !flag("force")) { console.log(`  • skip ${dest.replace(PUBLIC, "public")} (exists)`); return; }
  await withRetry(async () => {
    const url = await run("openai/gpt-image-2", { prompt, quality: "medium", aspect_ratio: aspect, output_format: "webp" }, label);
    await download(url, dest);
  }, label);
}

async function icon(prompt, dest, label) {
  if (existsSync(dest) && !flag("force")) { console.log(`  • skip ${dest.replace(PUBLIC, "public")} (exists)`); return; }
  await withRetry(async () => {
    const url = await run("openai/gpt-image-2", { prompt, quality: "medium", aspect_ratio: "1024x1024", output_format: "png" }, label);
    await download(url, dest);
  }, label);
}

async function video(prompt, dest, label) {
  if (existsSync(dest) && !flag("force")) { console.log(`  • skip ${dest.replace(PUBLIC, "public")} (exists)`); return; }
  await withRetry(async () => {
    const url = await run("bytedance/seedance-1.5-pro", { prompt, aspect_ratio: "9:16", duration: 5, generate_audio: false }, label);
    await download(url, dest);
  }, label);
}

// ---- plan ----
async function main() {
  console.log(`Replicate media gen — styles=[${styles}] subjects=[${subjects.join(",") || "none"}] poster=${doPoster} video=${doVideo} personas=${doPersonas}`);

  for (const style of styles) {
    for (const slug of subjects) {
      if (!SUBJECTS[slug]) { console.log(`  ! unknown subject ${slug}`); continue; }
      await image(SUBJECTS[slug] + STYLE[style], "1536x1024", `${PUBLIC}/property/${style}/${slug}.webp`, `still ${style}/${slug}`);
    }
    if (doPoster) {
      await image(SUBJECTS.hero + STYLE[style], "1024x1536", `${PUBLIC}/hero/landing-${style}-poster.webp`, `poster ${style}`);
    }
    if (doVideo) {
      await video(VIDEO_PROMPT[style], `${PUBLIC}/hero/landing-${style}.mp4`, `video ${style}`);
    }
  }

  if (doPersonas) {
    for (const [id, desc] of Object.entries(PERSONAS)) {
      await image(desc + PORTRAIT_SUFFIX, "1024x1536", `${PUBLIC}/personas/${id}.webp`, `persona ${id}`);
    }
  }

  if (flag("favicons")) {
    for (const [id, prompt] of Object.entries(FAVICONS)) {
      await icon(prompt, `${PUBLIC}/favicon-ideas/${id}.png`, `favicon ${id}`);
    }
  }

  if (failures.length) {
    console.log(`Done with ${failures.length} failure(s): ${failures.join(", ")}`);
    process.exit(2);
  }
  console.log("Done.");
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
