"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Two end-to-end art directions for the property visuals. The whole showcase,
 * the landing hero loop and persona-adjacent imagery swap together so we can
 * A/B them live. Assets resolve to /property/{style}/{slug}.webp.
 */
export type ArtStyle = "luxe" | "neon";

export const ART_STYLES: { id: ArtStyle; label: string; hint: string }[] = [
  { id: "luxe", label: "Riverside Luxe", hint: "Cinematic, golden-hour" },
  { id: "neon", label: "Neo-Futurist", hint: "Neon-prism, stylized" },
];

const KEY = "gn-art-style";
const EVENT = "gn-art-style-change";
const DEFAULT: ArtStyle = "luxe";

export function imgSrc(style: ArtStyle, slug: string): string {
  return `/property/${style}/${slug}.webp`;
}

export function heroVideo(style: ArtStyle): string {
  return `/hero/landing-${style}.mp4`;
}

export function heroPoster(style: ArtStyle): string {
  return `/hero/landing-${style}-poster.webp`;
}

function isStyle(v: unknown): v is ArtStyle {
  return v === "luxe" || v === "neon";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): ArtStyle {
  const stored = localStorage.getItem(KEY);
  return isStyle(stored) ? stored : DEFAULT;
}

/**
 * Shared, cross-component art-style state persisted to localStorage, exposed as
 * an external store so reads stay SSR-safe and every consumer stays in sync.
 */
export function useArtStyle(): [ArtStyle, (s: ArtStyle) => void] {
  const style = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT);

  const setStyle = useCallback((s: ArtStyle) => {
    localStorage.setItem(KEY, s);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: s }));
  }, []);

  return [style, setStyle];
}
