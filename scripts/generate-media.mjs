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
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = resolve(ROOT, "web/public");
// Hero first/last frame stills land here for review (verify before generating video).
const ASSETS_IMAGES = resolve(ROOT, "assets/images");
// Hero clips are written here for review, then copied into web/public/hero/clips.
const ASSETS_VIDEOS = resolve(ROOT, "assets/videos");

// ---- token ----
function token() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  const env = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  const m = env.match(/^REPLICATE_API_TOKEN=(.+)$/m);
  if (!m) throw new Error("REPLICATE_API_TOKEN not found");
  return m[1].trim();
}
const TOKEN = token();

// ---- gemini key (QA reviewer) ----
function geminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const env = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    const m = env.match(/^GEMINI_API_KEY=(.+)$/m);
    return m ? m[1].trim() : null;
  } catch { return null; }
}
const GEMINI = geminiKey();

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

// ---- hero landing sequence (anchored seedance clips) ----
// New still source frames (gpt-image-2). Existing property stills are reused as
// first/last frames where noted in HERO_CLIPS, so they aren't listed here.
//   land → 1536x1024, port → 1024x1536.
// A frame with `ref` is generated img2img FROM that reference still, so the
// subject (the hotel building) stays identical to the canonical property image.
const heroFramePath = (slug, orient, style) => `${PUBLIC}/hero/frames/${slug}-${orient}-${style}.webp`;
const propPath = (slug, style) => `${PUBLIC}/property/${style}/${slug}.webp`;
const heroPosterPath = (style) => `${PUBLIC}/hero/landing-${style}-poster.webp`;

const HERO_FRAMES = {
  // Establishing FAR frame — derived img2img from the canonical hotel still so the
  // BUILDING is identical to the last frame; camera pulled back across the river
  // with a boat in the foreground (the push-in then closes the distance).
  "hero-far": {
    prompt:
      "Recompose this exact same riverside hotel tower viewed from much further away across the wide Chao Phraya river: the tower noticeably smaller and set back across a broad expanse of open water, a single wooden longtail boat prominent in the foreground gliding down the river, lots of sky and water around the tower, keep the identical building design, shape and details, same golden-hour dusk lighting, photorealistic",
    orients: ["land", "port"],
    ref: (style, orient) => (orient === "land" ? propPath("hero", style) : heroPosterPath(style)),
  },
  lobby: {
    prompt:
      "the grand double-height riverside arrival lobby of a luxury Bangkok hotel, a sweeping reception with tall glass overlooking the Chao Phraya river, polished stone floors with soft reflections, lush greenery and elegant lounge seating, warm welcoming light",
    orients: ["land", "port"],
  },
  garden: {
    prompt:
      "a lush riverside tropical garden walkway at a luxury Bangkok hotel, a stone path winding through palms and flowering plants, dappled golden morning light, the river glinting just beyond the foliage",
    orients: ["land", "port"],
  },
  // Valet POV — first-person view from the passenger seat as they step out.
  "valet-pov": {
    prompt:
      "first-person point-of-view from a passenger stepping out of the back seat of a sleek black luxury car at a grand hotel entrance, looking out through the open car door, a smiling white-gloved doorman holding the door open in welcome, the warm-lit porte-cochère and glowing lobby entrance ahead, evening, shallow depth of field, photorealistic",
    orients: ["land", "port"],
  },
  pool: { prompt: SUBJECTS.pool, orients: ["port"] },
};

// Natural, real-time motion (not slow-mo, not time-lapse). Forbid on-screen text.
const CLIP_TAG = ". Cinematic, smooth natural real-time motion at normal speed, gentle restrained camera movement, no on-screen text, captions or subtitles.";

// Each clip: a motion prompt + the local first/last frame sources per orientation.
// `image` = first frame, `last` = last frame (establishing only — push-in lands on it).
const HERO_CLIPS = [
  {
    scene: "establishing",
    prompt:
      "Very slow cinematic push-in across the wide Chao Phraya river toward a glowing riverside luxury hotel tower at dusk, a wooden longtail boat drifting gently down the river through the foreground, soft shimmering reflections on the water, warm amber light, drifting clouds, premium travel film",
    frames: (style) => ({
      land: { image: heroFramePath("hero-far", "land", style), last: propPath("hero", style) },
      port: { image: heroFramePath("hero-far", "port", style), last: heroPosterPath(style) },
    }),
  },
  {
    scene: "valet",
    prompt:
      "Slow first-person point-of-view of a passenger stepping out of a luxury car at the grand hotel entrance, the open car door framing a white-gloved doorman welcoming with a smile, the warm-lit porte-cochère ahead, gentle subtle motion, evening, premium travel film",
    frames: (style) => ({
      land: { image: heroFramePath("valet-pov", "land", style) },
      port: { image: heroFramePath("valet-pov", "port", style) },
    }),
  },
  {
    scene: "lobby",
    prompt:
      "A very slow, smooth steadicam glide through the grand riverside arrival lobby of a luxury Bangkok hotel, staff warmly greeting arriving guests, golden light pouring through tall glass, soft reflections on polished floors",
    frames: (style) => ({
      land: { image: heroFramePath("lobby", "land", style) },
      port: { image: heroFramePath("lobby", "port", style) },
    }),
  },
  {
    scene: "garden",
    prompt:
      "A guest in elegant resortwear strolls slowly through lush riverside tropical gardens holding a cup of morning coffee, dappled golden light through the palms, very slow gentle tracking shot",
    frames: (style) => ({
      land: { image: heroFramePath("garden", "land", style) },
      port: { image: heroFramePath("garden", "port", style) },
    }),
  },
  {
    scene: "pool",
    prompt:
      "A guest relaxes on a sun lounger reading a book beside a rooftop infinity pool, water shimmering toward the city skyline, a gentle breeze, very slow barely-drifting camera, golden evening light",
    frames: (style) => ({
      land: { image: propPath("pool", style) },
      port: { image: heroFramePath("pool", "port", style) },
    }),
  },
];

// ---- hero first/last frame pairs (verify-images-first workflow) ----
// Each scene defines an explicit FIRST and LAST frame image. Generating both
// endpoints (instead of one frame + a long text prompt) lets seedance interpolate
// a controlled, natural motion. `ref` (when set) derives the frame img2img from
// the canonical hotel still so the building stays identical across the pair.
// Frames are written to assets/images/<scene>-<first|last>-<orient>-<style>.webp
// for review BEFORE any video is generated.
const HERO_PAIRS = {
  establishing: {
    // FIRST frame derives from the ONE canonical hotel still → identical building.
    ref: (style) => propPath("hero", style),
    // Calibrated for NORMAL speed at 6s: tower at a comfortable mid-distance, only a
    // GENTLE push-in. Boat is in the FIRST frame only (drifts out of view by the LAST).
    first:
      "Recompose this exact same riverside hotel tower at golden-hour dusk, viewed from across the wide Chao Phraya river: the tower at a comfortable mid-distance across the calm open water, clearly visible and occupying a moderate part of the frame, a single wooden longtail boat on the river in the foreground at lower-left, generous sky and water — keep the identical building design, silhouette and details, photorealistic",
    lastRefFirst: true,
    last:
      "the same scene with only a gentle, restrained push-in — the camera has eased a little closer so the hotel tower is just modestly larger in the frame; the wooden longtail boat has drifted out of view and is no longer in the frame; identical building, composition and golden-hour lighting, photorealistic",
    motion:
      "A gentle, restrained, slow cinematic push-in across the Chao Phraya river toward the glowing riverside hotel tower at golden-hour dusk, the tower easing only slightly closer, calm shimmering reflections, natural real-time pace",
  },

  // The remaining scenes have no recurring building to lock, so the FIRST frame is
  // a fresh still and the LAST frame is a controlled progression of it (lastRefFirst).
  // All calibrated for NORMAL speed at 6s: closer starting points + only GENTLE moves,
  // so the depicted change ≈ ~6s of real motion (no timelapse).
  // Lively entrance: many guests milling/walking by, a gentle push-in toward the doors.
  valet: {
    first:
      "a lively view of the grand entrance of a luxury riverside hotel at dusk, several well-dressed guests walking by and arriving across the warm-lit porte-cochère, the tall glowing glass lobby entrance doors ahead at a comfortable distance, doormen attending, lush potted greenery, polished stone, warm entrance lighting, evening, photorealistic",
    lastRefFirst: true,
    last:
      "the same lively entrance scene with a gentle push-in so the glowing glass lobby entrance doors are a little larger and more central in the frame, well-dressed guests still walking by, identical setting, people, greenery and warm lighting, photorealistic",
    motion:
      "A gentle, slow push-in toward the hotel's glowing glass lobby entrance doors while several well-dressed guests walk by across the warm-lit porte-cochère, natural real-time pace",
  },
  lobby: {
    first:
      "a view of the grand double-height riverside arrival lobby of a luxury Bangkok hotel from a few steps inside the entrance, the tall river-view windows and reception ahead at a comfortable distance, polished stone floors with soft reflections, lush greenery, elegant seating, warm golden light",
    lastRefFirst: true,
    last:
      "the same arrival lobby, the camera eased gently forward so the river-view windows and reception are only a little closer, identical décor, materials, greenery and warm lighting, photorealistic",
    motion:
      "A slow, gentle steadicam glide a little way forward through the arrival lobby toward the river-view windows",
  },
  garden: {
    first:
      "a guest in elegant resortwear walking away along a lush riverside tropical garden path at a luxury Bangkok hotel holding a morning coffee, seen from a moderate distance behind, palms and flowering plants framing the path, the river glinting beyond, dappled golden morning light",
    lastRefFirst: true,
    last:
      "the same guest a little closer, the camera having gently followed a few steps up the garden path, identical setting, guest, plants and golden light, photorealistic",
    motion:
      "A slow, gentle tracking shot easing along a little way behind the guest strolling the garden path with their coffee",
  },
  pool: {
    first:
      "a view of a rooftop infinity-pool deck at a luxury Bangkok hotel, a guest relaxing on a sun lounger reading a book, the pool water merging with the city skyline at golden hour, cabanas and loungers, warm evening light",
    lastRefFirst: true,
    last:
      "the same scene, the camera eased gently toward the infinity-pool edge and the guest so they are only a little more prominent, identical setting and lighting, photorealistic",
    // Simple single-frame shot: anchor on the over-the-shoulder reading frame and let
    // the prompt drive the motion (slow push to her shoulder + a page flip).
    singleAnchor: "last",
    motion:
      "A slow gentle push-in toward the woman's shoulder as she relaxes on the sun lounger reading, and she gently flips a page of her book, the infinity pool and golden city skyline beyond, calm and natural real-time pace",
  },
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

async function image(prompt, aspect, dest, label, opts = {}) {
  if (existsSync(dest) && !flag("force")) { console.log(`  • skip ${dest.replace(PUBLIC, "public")} (exists)`); return; }
  await withRetry(async () => {
    const input = { prompt, quality: "medium", aspect_ratio: aspect, output_format: "webp" };
    if (opts.inputImages?.length) input.input_images = opts.inputImages; // img2img: keep the subject
    const url = await run("openai/gpt-image-2", input, label);
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

function dataUri(path) {
  return `data:image/webp;base64,${readFileSync(path).toString("base64")}`;
}

// ---- QA loop: a vision model (Gemini) inspects each generated frame for the
// structural / anatomical / text artifacts AI image models commonly produce, and
// the generator retries until the frame passes (or attempts run out). ----
const QA_MAX = parseInt(val("qa-tries", "3"), 10) || 3;
const QA_PROMPT = `You are a meticulous QA reviewer for luxury hotel marketing photography produced by an AI image generator, which frequently introduces artifacts. The image is intended to show: "{EXP}".
Inspect VERY carefully for clearly visible defects:
- Structural: malformed or detached objects (e.g. a car door not properly attached to the car), warped or physically impossible architecture, bent/broken/duplicated structural lines, fused objects.
- People: distorted, extra or missing limbs, hands, fingers or faces; melted or blended bodies; impossible poses.
- Objects: floating, melting, smeared, duplicated or nonsensical shapes.
- Text: any gibberish or garbled text, signage, logos or watermarks.
- General: obvious blurry mush or repeating glitch patterns — anything a luxury brand would reject.
Method: go object by object (each vehicle, door, person, hand, railing, pillar) and check it is WHOLE and correctly connected — be especially alert to car doors/handles that are detached, floating or merged with the body, and to hands/fingers.
Minor softness, bokeh, grain or deliberate stylistic choices are NOT defects. Set ok=false for any clearly visible structural/anatomical artifact a professional would reject (severity "minor" or "major").
Respond ONLY as JSON: {"ok": boolean, "severity": "none"|"minor"|"major", "issues": ["short description", ...]}.`;

async function reviewImage(path, expectation, label) {
  if (!GEMINI) return { ok: true, severity: "skip", issues: ["no GEMINI_API_KEY"] };
  const body = {
    contents: [{ parts: [
      { text: QA_PROMPT.replace("{EXP}", expectation) },
      { inline_data: { mime_type: "image/webp", data: readFileSync(path).toString("base64") } },
    ] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 }, // reasoning ON for QA accuracy
  };
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) return { ok: true, severity: "error", issues: [`QA no response: ${JSON.stringify(j).slice(0, 140)}`] };
    const v = JSON.parse(txt);
    return { ok: v.ok !== false, severity: v.severity || "none", issues: v.issues || [] };
  } catch (e) {
    return { ok: true, severity: "error", issues: [`QA error: ${e.message}`] }; // never block on QA infra failure
  }
}

// Generate an image, then QA it; regenerate until it passes or QA_MAX is hit.
async function imageQA(prompt, aspect, dest, label, opts = {}, expectation = "") {
  for (let attempt = 1; attempt <= QA_MAX; attempt++) {
    let made = false;
    await withRetry(async () => {
      const input = { prompt, quality: "medium", aspect_ratio: aspect, output_format: "webp" };
      if (opts.inputImages?.length) input.input_images = opts.inputImages;
      const url = await run("openai/gpt-image-2", input, `${label} #${attempt}`);
      await download(url, dest);
      made = true;
    }, label);
    if (!made) return false; // generation failed (already logged in withRetry)
    const v = await reviewImage(dest, expectation || prompt, label);
    console.log(`    QA ${v.ok ? "✓" : "✗"} ${label} [${v.severity}]${v.issues.length ? " — " + v.issues.join("; ") : ""}`);
    if (v.ok) return true;
    if (attempt < QA_MAX) console.log(`    ↻ regenerating ${label} (QA rejected)`);
    else { console.log(`    ! ${label}: kept after ${QA_MAX} attempts despite QA flags`); failures.push(`qa ${label}`); }
  }
  return false;
}

async function video(prompt, dest, label, opts = {}) {
  if (existsSync(dest) && !flag("force")) { console.log(`  • skip ${dest.replace(PUBLIC, "public")} (exists)`); return; }
  await withRetry(async () => {
    // seedance-1-pro supports a `resolution` knob (480p/720p/1080p) and the same
    // first/last interpolation; 1.5-pro has no resolution control (caps lower).
    const model = opts.model || "bytedance/seedance-1.5-pro";
    const input = { prompt, duration: opts.duration || 5 };
    if (model.includes("1.5-pro")) input.generate_audio = false; // field only exists on 1.5-pro
    if (opts.image) input.image = opts.image;                       // first frame
    if (opts.last_frame_image) input.last_frame_image = opts.last_frame_image;
    if (opts.resolution) input.resolution = opts.resolution;
    if (opts.aspect_ratio) input.aspect_ratio = opts.aspect_ratio;
    else if (!opts.image) input.aspect_ratio = "9:16";
    const url = await run(model, input, label);
    await download(url, dest);
  }, label);
}

// veo-3.1 interpolation: image (first frame) + last_frame (end frame).
async function videoVeo(prompt, dest, label, opts = {}) {
  if (existsSync(dest) && !flag("force")) { console.log(`  • skip ${dest.replace(PUBLIC, "public")} (exists)`); return; }
  await withRetry(async () => {
    const input = {
      prompt,
      duration: opts.duration || 8,
      resolution: opts.resolution || "1080p",
      generate_audio: false,
    };
    if (opts.image) input.image = opts.image;
    if (opts.last_frame) input.last_frame = opts.last_frame;
    if (opts.aspect_ratio) input.aspect_ratio = opts.aspect_ratio;
    const url = await run("google/veo-3.1", input, label);
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

  if (flag("hero-images")) {
    // Generate QA-gated first/last frame image pairs for review (no video yet).
    //   --scenes=establishing,valet   (default: all defined pairs)
    //   --qa-tries=N                  (artifact-retry budget per frame, default 3)
    const seqStyles = val("styles", "") ? styles : ["luxe"];
    const only = val("scenes", "") ? val("scenes", "").split(",") : Object.keys(HERO_PAIRS);
    for (const style of seqStyles) {
      console.log(`\nHero frame pairs — ${style}`);
      for (const scene of only) {
        const p = HERO_PAIRS[scene];
        if (!p) { console.log(`  ! unknown scene ${scene}`); continue; }
        for (const orient of ["land", "port"]) {
          const aspect = orient === "land" ? "1536x1024" : "1024x1536";
          const baseRef = p.ref?.(style, orient);
          const firstDest = `${ASSETS_IMAGES}/${scene}-first-${orient}-${style}.webp`;
          const lastDest = `${ASSETS_IMAGES}/${scene}-last-${orient}-${style}.webp`;
          // FIRST frame — from the canonical reference (subject lock) when given
          const firstOpts = {};
          if (baseRef && existsSync(baseRef)) firstOpts.inputImages = [dataUri(baseRef)];
          else if (baseRef) console.log(`  ! ${scene}-first-${orient}: missing ref ${baseRef.replace(PUBLIC, "public")}`);
          await image(p.first + STYLE[style], aspect, firstDest, `img ${style}/${scene}-first-${orient}`, firstOpts);
          // LAST frame — from the first frame when lastRefFirst, else the canonical ref
          const lastRef = p.lastRefFirst ? firstDest : baseRef;
          const lastOpts = {};
          if (lastRef && existsSync(lastRef)) lastOpts.inputImages = [dataUri(lastRef)];
          else if (lastRef) console.log(`  ! ${scene}-last-${orient}: missing ref ${lastRef.replace(PUBLIC, "public")}`);
          await image(p.last + STYLE[style], aspect, lastDest, `img ${style}/${scene}-last-${orient}`, lastOpts);
        }
      }
    }
  }

  if (flag("qa-review")) {
    // Audit EXISTING frame pairs in assets/images and regenerate only the ones that
    // fail QA (artifacts). Good frames are left untouched.
    //   --scenes=valet   (default: all defined pairs)
    const seqStyles = val("styles", "") ? styles : ["luxe"];
    const only = val("scenes", "") ? val("scenes", "").split(",") : Object.keys(HERO_PAIRS);
    if (!GEMINI) console.log("  ! qa-review needs GEMINI_API_KEY");
    for (const style of seqStyles) {
      console.log(`\nQA review — ${style}`);
      for (const scene of only) {
        const p = HERO_PAIRS[scene];
        if (!p) { console.log(`  ! unknown scene ${scene}`); continue; }
        for (const orient of ["land", "port"]) {
          const aspect = orient === "land" ? "1536x1024" : "1024x1536";
          const baseRef = p.ref?.(style, orient);
          const firstDest = `${ASSETS_IMAGES}/${scene}-first-${orient}-${style}.webp`;
          const lastDest = `${ASSETS_IMAGES}/${scene}-last-${orient}-${style}.webp`;
          for (const which of ["first", "last"]) {
            const dest = which === "first" ? firstDest : lastDest;
            if (!existsSync(dest)) { console.log(`  • ${scene}-${which}-${orient}: missing, skip`); continue; }
            const v = await reviewImage(dest, p[which], `${scene}-${which}-${orient}`);
            console.log(`  QA ${v.ok ? "✓" : "✗"} ${scene}-${which}-${orient} [${v.severity}]${v.issues.length ? " — " + v.issues.join("; ") : ""}`);
            if (v.ok) continue;
            // regenerate the failing frame through the QA loop
            const ref = which === "first" ? baseRef : (p.lastRefFirst ? firstDest : baseRef);
            const opts = {};
            if (ref && existsSync(ref)) opts.inputImages = [dataUri(ref)];
            await imageQA(p[which] + STYLE[style], aspect, dest, `${style}/${scene}-${which}-${orient}`, opts, p[which]);
          }
        }
      }
    }
  }

  if (flag("hero-videos")) {
    // Render video from the verified first/last frame pairs in assets/images,
    // → assets/videos, then mirror into web/public/hero/clips (app-served).
    //   --scenes=establishing   (default: all defined pairs)
    //   --veo                   (use veo-3.1; default is seedance-1.5-pro 1080p)
    const useVeo = flag("veo");
    const modelName = useVeo ? "veo-3.1" : "seedance-1.5-pro";
    const seqStyles = val("styles", "") ? styles : ["luxe"];
    const only = val("scenes", "") ? val("scenes", "").split(",") : Object.keys(HERO_PAIRS);
    for (const style of seqStyles) {
      console.log(`\nHero videos (${modelName}) — ${style}`);
      for (const scene of only) {
        const p = HERO_PAIRS[scene];
        if (!p) { console.log(`  ! unknown scene ${scene}`); continue; }
        for (const orient of ["land", "port"]) {
          const first = `${ASSETS_IMAGES}/${scene}-first-${orient}-${style}.webp`;
          const last = `${ASSETS_IMAGES}/${scene}-last-${orient}-${style}.webp`;
          const name = `${scene}-${orient}-${style}.mp4`;
          const dest = `${ASSETS_VIDEOS}/${name}`;
          const served = `${PUBLIC}/hero/clips/${name}`;
          if (existsSync(dest) && !flag("force")) { console.log(`  • skip assets/videos/${name} (exists)`); }
          else {
            // singleAnchor scenes drive motion from ONE frame + the prompt (no last_frame).
            const single = p.singleAnchor;            // "first" | "last" | undefined
            const anchor = single === "first" ? first : last;
            const need = single ? [anchor] : [first, last];
            if (need.some((f) => !existsSync(f))) { console.log(`  ✗ ${scene}-${orient}: missing frame(s) in assets/images`); failures.push(`video ${style}/${scene}-${orient}`); continue; }
            const motion = (p.motion || "Gentle, natural cinematic camera move") + CLIP_TAG;
            const label = `${useVeo ? "veo" : "seedance"} ${style}/${scene}-${orient}`;
            if (useVeo) {
              await videoVeo(motion, dest, label, {
                image: dataUri(single ? anchor : first),
                ...(single ? {} : { last_frame: dataUri(last) }),
                aspect_ratio: orient === "land" ? "16:9" : "9:16", duration: 6,
              });
            } else {
              await video(motion, dest, label, {
                model: "bytedance/seedance-1.5-pro", // per request; no resolution knob (~834p)
                image: dataUri(single ? anchor : first),
                ...(single ? {} : { last_frame_image: dataUri(last) }),
                duration: 6,
              });
            }
          }
          if (existsSync(dest)) { mkdirSync(dirname(served), { recursive: true }); copyFileSync(dest, served); }
        }
      }
    }
  }

  if (flag("hero-seq")) {
    // default to luxe only unless --styles is explicitly passed
    const seqStyles = val("styles", "") ? styles : ["luxe"];
    for (const style of seqStyles) {
      console.log(`\nHero sequence — ${style}`);
      // 1) source stills (img2img where `ref` is set, to keep the building consistent)
      for (const [slug, def] of Object.entries(HERO_FRAMES)) {
        for (const orient of def.orients) {
          const aspect = orient === "land" ? "1536x1024" : "1024x1536";
          const opts = {};
          if (def.ref) {
            const refPath = def.ref(style, orient);
            if (existsSync(refPath)) opts.inputImages = [dataUri(refPath)];
            else console.log(`  ! ${slug}-${orient}: missing ref ${refPath.replace(PUBLIC, "public")}`);
          }
          await image(def.prompt + STYLE[style], aspect, heroFramePath(slug, orient, style), `frame ${style}/${slug}-${orient}`, opts);
        }
      }
      // 2) anchored clips → assets/videos (for review), then copied into web/public/hero/clips
      for (const clip of HERO_CLIPS) {
        const f = clip.frames(style);
        for (const orient of ["land", "port"]) {
          const src = f[orient];
          const name = `${clip.scene}-${orient}-${style}.mp4`;
          const dest = `${ASSETS_VIDEOS}/${name}`;
          const served = `${PUBLIC}/hero/clips/${name}`;
          if (existsSync(dest) && !flag("force")) { console.log(`  • skip assets/videos/${name} (exists)`); }
          else {
            if (!existsSync(src.image)) { console.log(`  ✗ clip ${style}/${clip.scene}-${orient}: missing source ${src.image.replace(PUBLIC, "public")}`); failures.push(`clip ${style}/${clip.scene}-${orient}`); continue; }
            const opts = { image: dataUri(src.image), duration: 8 };
            if (src.last && existsSync(src.last)) opts.last_frame_image = dataUri(src.last);
            await video(clip.prompt + CLIP_TAG, dest, `clip ${style}/${clip.scene}-${orient}`, opts);
          }
          // mirror into the app's served folder so the hero keeps working
          if (existsSync(dest)) { mkdirSync(dirname(served), { recursive: true }); copyFileSync(dest, served); }
        }
      }
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
