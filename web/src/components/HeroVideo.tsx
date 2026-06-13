"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { heroPoster, heroVideo, useArtStyle } from "@/lib/artStyle";

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

/**
 * Ambient property loop behind the landing experience. Muted, looping,
 * poster-backed; falls back to the poster still under prefers-reduced-motion
 * or if the video asset is missing. A heavy scrim keeps overlaid text legible.
 */
export default function HeroVideo() {
  const [style] = useArtStyle();
  const reduced = usePrefersReducedMotion();
  const [videoOk, setVideoOk] = useState(true);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Image
        key={heroPoster(style)}
        src={heroPoster(style)}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {!reduced && videoOk && (
        <video
          key={heroVideo(style)}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroPoster(style)}
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = 0.8; }}
          onError={() => setVideoOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={heroVideo(style)} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/75 to-abyss/45" />
    </div>
  );
}
