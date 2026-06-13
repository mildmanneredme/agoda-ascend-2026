"use client";

/**
 * The Ascend prismatic light-burst, rebuilt as pure CSS.
 * Rays fan out from a white-hot focal point — the visual voice of the AI.
 * `active` speeds the breathing up while the AI is thinking.
 */

const RAYS: Array<{ color: string; angle: number; width: number; length: number; delay: number }> = [
  { color: "var(--ray-cyan)", angle: -26, width: 3, length: 92, delay: 0 },
  { color: "var(--ray-magenta)", angle: -18, width: 7, length: 100, delay: 0.4 },
  { color: "var(--ray-red)", angle: -10, width: 12, length: 96, delay: 0.9 },
  { color: "var(--ray-amber)", angle: -3, width: 14, length: 104, delay: 0.2 },
  { color: "var(--ray-green)", angle: 4, width: 8, length: 90, delay: 1.2 },
  { color: "var(--ray-magenta)", angle: 11, width: 10, length: 100, delay: 0.6 },
  { color: "var(--ray-aqua)", angle: 18, width: 5, length: 94, delay: 1.5 },
  { color: "var(--ray-cyan)", angle: 26, width: 4, length: 86, delay: 0.8 },
  { color: "var(--blue, #0040c1)", angle: 34, width: 3, length: 78, delay: 1.1 },
];

export default function RayBurst({
  active = false,
  className = "",
  origin = { x: "82%", y: "30%" },
}: {
  active?: boolean;
  className?: string;
  origin?: { x: string; y: string };
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* violet atmosphere behind the focal point */}
      <div
        className="absolute h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
        style={{
          left: origin.x,
          top: origin.y,
          background:
            "radial-gradient(closest-side, rgba(68,0,198,0.5), rgba(68,0,198,0.12) 55%, transparent 75%)",
        }}
      />
      {RAYS.map((ray, i) => (
        <div
          key={i}
          className="absolute origin-right"
          style={{
            left: 0,
            right: `calc(100% - ${origin.x})`,
            top: origin.y,
            height: ray.width,
            width: `${ray.length}vmax`,
            marginTop: -ray.width / 2,
            transform: `rotate(${ray.angle}deg)`,
            transformOrigin: "100% 50%",
          }}
        >
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(to left, ${ray.color}, transparent 82%)`,
              borderRadius: 9999,
              opacity: 0.8,
              animation: `breathe ${active ? 1.6 + (i % 3) * 0.4 : 4.5 + (i % 4)}s ease-in-out ${ray.delay}s infinite`,
              ["--ray-min" as string]: active ? 0.55 : 0.3,
              ["--ray-max" as string]: active ? 1 : 0.75,
            }}
          />
        </div>
      ))}
      {/* white-hot core */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{
          left: origin.x,
          top: origin.y,
          width: "16vmax",
          height: "16vmax",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(190,210,255,0.35) 35%, transparent 70%)",
          animation: `breathe ${active ? 1.4 : 5}s ease-in-out infinite`,
        }}
      />
    </div>
  );
}
