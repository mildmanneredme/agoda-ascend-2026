// In-memory sliding-window rate limiter — an abuse deterrent for the demo's
// direct-to-Gemini routes. State lives in module memory, so the budget is
// per serverless instance (it resets on cold start and isn't shared across
// instances). That's intentional for a conference demo: cheap, dependency-free,
// and enough to stop a single client from hammering the LLM. For hard,
// cross-instance guarantees, swap the Map for Vercel KV / Upstash Redis.

/** Max LLM requests allowed per client within the window. */
const LIMIT = 30;
/** Sliding window length, in milliseconds. */
const WINDOW_MS = 60_000;
/** Drop idle clients from memory after this long to bound growth. */
const IDLE_EVICT_MS = 5 * 60_000;

// key (client id) -> request timestamps (ms) within roughly the last window
const hits = new Map<string, number[]>();
let lastSweep = 0;

function clientId(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "local";
}

/** Periodically evict clients with no recent activity. */
function sweep(now: number) {
  if (now - lastSweep < IDLE_EVICT_MS) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    if (times.length === 0 || now - times[times.length - 1]! > IDLE_EVICT_MS) {
      hits.delete(key);
    }
  }
}

/**
 * Records a request and enforces the limit. Returns a ready-to-send `429`
 * Response when the caller is over budget, or `null` when the request may
 * proceed. Call at the very top of a route handler:
 *
 *   const limited = rateLimit(req);
 *   if (limited) return limited;
 */
export function rateLimit(req: Request): Response | null {
  const now = Date.now();
  sweep(now);

  const key = clientId(req);
  const windowStart = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((recent[0]! + WINDOW_MS - now) / 1000));
    hits.set(key, recent);
    return Response.json(
      { error: "Too many requests — slow down a moment and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  }

  recent.push(now);
  hits.set(key, recent);
  return null;
}
