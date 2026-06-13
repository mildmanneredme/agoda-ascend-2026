#!/usr/bin/env node
/**
 * Generate ambient background-video variations on Replicate (Seedance 1.5 pro)
 * to replace the CSS/SVG RayBurst background. Outputs are abstract, dark,
 * loop-friendly motion graphics keyed to the Agoda Ascend theme:
 *   deep navy abyss + the agoda rainbow (red/amber/green/magenta/cyan/aqua)
 *   fanning from / converging to a white-hot focal point.
 *
 * 720p, 9:16 (mobile-first PWA), 5s, no audio. Saved to repo-root /assets.
 *
 * Usage:
 *   node scripts/generate-bg-video.mjs                # all variations
 *   node scripts/generate-bg-video.mjs --only=runway  # one variation
 *   node scripts/generate-bg-video.mjs --force        # re-render existing
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "assets");

function token() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  const env = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  const m = env.match(/^REPLICATE_API_TOKEN=(.+)$/m);
  if (!m) throw new Error("REPLICATE_API_TOKEN not found");
  return m[1].trim();
}
const TOKEN = token();

// Shared art direction — keep it dark and abstract so UI/text reads on top.
const SUFFIX =
  " Abstract motion-graphic background only — no people, no objects, no buildings, " +
  "no text, no letters, no logos, no watermarks. Deep navy-black base (#0a0e24) keeps " +
  "the frame dark so overlaid white interface text stays legible. The agoda rainbow " +
  "palette: electric cyan #00aae0, aqua #4beaea, magenta #af38b1, red #ff2838, amber " +
  "#fdb812, green #00b057, with violet #4400c6 and royal blue #0040c1 atmosphere. " +
  "Premium, futuristic, elegant, subtle film grain, slow seamless ambient motion that " +
  "could loop. Cinematic, high-detail, photoreal volumetric light.";

// A few distinct concepts to review.
const VARIATIONS = {
  // 1. The RayBurst itself, brought to life.
  burst: {
    camera_fixed: true,
    prompt:
      "A slow, hypnotic prismatic light-burst: fine needle-thin rays of cyan, magenta, " +
      "red, amber, green and aqua fan outward from a single white-hot focal point set in " +
      "the upper-right of a deep navy-black abyss. The rays breathe and shimmer gently in " +
      "and out, a soft violet glow halo pulsing around the molten-white core, faint " +
      "volumetric haze. Minimal, calm, hypnotic.",
  },
  // 2. The PowerPoint hero look — light-speed runway converging to a vanishing point.
  runway: {
    camera_fixed: false,
    prompt:
      "Smooth cinematic forward flight down a runway of multicoloured light streaks — " +
      "cyan, magenta, red, amber, green, aqua — that converge to one brilliant white " +
      "vanishing point on a distant horizon, like an elegant slow light-speed warp over a " +
      "deep navy floor. Glowing trails stretch and taper toward the core, soft mirrored " +
      "reflections beneath, gentle continuous forward drift.",
  },
  // 3. Soft ambient nebula — quietest option, best behind dense text.
  aurora: {
    camera_fixed: true,
    prompt:
      "A soft drifting aurora of violet and electric-blue light over a deep navy-black " +
      "sky, slow billowing nebula-like clouds, threaded with faint shimmering rainbow " +
      "filaments of cyan, magenta and amber that ripple and fade. Very subtle, dark, " +
      "atmospheric and moody, barely-there ambient drift.",
  },
  // 4. Refracted prism caustics — abstract cut-glass light.
  caustics: {
    camera_fixed: true,
    prompt:
      "Abstract refracted prismatic light caustics in the agoda-rainbow colours rippling " +
      "slowly across a deep navy surface, like sunlight through cut crystal glass — " +
      "delicate shifting bands of cyan, magenta, amber and green, soft bokeh glints and " +
      "lens flares, dark elegant negative space, slow liquid shifting motion.",
  },
};

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : d; };
const only = val("only", "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function create(input, label) {
  const res = await fetch("https://api.replicate.com/v1/models/bytedance/seedance-1.5-pro/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const pred = await res.json();
  if (pred.error || !pred.id) throw new Error(`${label}: ${pred.error || pred.detail || "no id"}`);
  console.log(`  → ${label}: started ${pred.id}`);
  return pred;
}

async function poll(pred, label) {
  let cur = pred, tries = 0;
  while (cur.status && !["succeeded", "failed", "canceled"].includes(cur.status) && tries < 240) {
    await sleep(3000);
    const r = await fetch(cur.urls.get, { headers: { Authorization: `Bearer ${TOKEN}` } });
    cur = await r.json();
    tries++;
  }
  if (cur.status !== "succeeded") throw new Error(`${label}: status ${cur.status} ${JSON.stringify(cur.error || "")}`);
  const out = cur.output;
  const url = Array.isArray(out) ? out[0] : (typeof out === "string" ? out : out?.url);
  if (!url) throw new Error(`${label}: no output url`);
  return url;
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`  ✓ saved assets/${dest.replace(OUT + "/", "")} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}

async function main() {
  const keys = Object.keys(VARIATIONS).filter((k) => !only || k === only);
  console.log(`Background-video gen — variations: [${keys.join(", ")}], 720p 9:16 5s no-audio\n`);

  // Fire all predictions concurrently, then poll+download each.
  const jobs = [];
  for (const key of keys) {
    const dest = `${OUT}/bg-${key}.mp4`;
    if (existsSync(dest) && !flag("force")) { console.log(`  • skip bg-${key}.mp4 (exists)`); continue; }
    const v = VARIATIONS[key];
    const input = {
      prompt: v.prompt + SUFFIX,
      duration: 5,
      aspect_ratio: "9:16",
      resolution: "720p",
      generate_audio: false,
      camera_fixed: !!v.camera_fixed,
    };
    jobs.push({ key, dest, started: create(input, `bg-${key}`) });
  }

  const failures = [];
  await Promise.all(
    jobs.map(async ({ key, dest, started }) => {
      try {
        const pred = await started;
        const url = await poll(pred, `bg-${key}`);
        await download(url, dest);
      } catch (e) {
        console.log(`  ✗ bg-${key}: ${e.message}`);
        failures.push(key);
      }
    })
  );

  console.log(failures.length ? `\nDone with failures: ${failures.join(", ")}` : "\nDone.");
  if (failures.length) process.exit(2);
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
