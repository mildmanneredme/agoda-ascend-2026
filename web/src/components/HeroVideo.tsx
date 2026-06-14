"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { heroMaster, heroPoster, useArtStyle } from "@/lib/artStyle";

const RM_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  const m = window.matchMedia(RM_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeRM,
    () => window.matchMedia(RM_QUERY).matches,
    () => false,
  );
}

// Portrait master on mobile / portrait viewports, landscape otherwise.
const PORTRAIT_QUERY = "(orientation: portrait), (max-width: 768px)";
function subscribePortrait(cb: () => void) {
  const m = window.matchMedia(PORTRAIT_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function usePortrait() {
  return useSyncExternalStore(
    subscribePortrait,
    () => window.matchMedia(PORTRAIT_QUERY).matches,
    () => false, // SSR: assume landscape; corrected on hydration
  );
}

/**
 * Ambient property loop behind the landing experience: a single edited master
 * clip (the full arrival sequence), looped. Picks the portrait or landscape
 * master by viewport. Falls back to the poster still under prefers-reduced-motion
 * or if the master is missing (e.g. a style not yet produced). A heavy scrim
 * keeps overlaid text legible.
 */
export default function HeroVideo() {
  const [style] = useArtStyle();
  const reduced = usePrefersReducedMotion();
  const portrait = usePortrait();

  const orient = portrait ? "port" : "land";
  const src = heroMaster(style, orient);
  const poster = heroPoster(style);

  // Reset the fallback flag whenever the source changes (style/orientation switch).
  const [prevSrc, setPrevSrc] = useState(src);
  const [videoOk, setVideoOk] = useState(true);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setVideoOk(true);
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Image
        key={poster}
        src={poster}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {!reduced && videoOk && (
        <video
          key={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          onError={() => setVideoOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/75 to-abyss/45" />
    </div>
  );
}
