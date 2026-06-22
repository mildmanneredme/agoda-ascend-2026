/**
 * Asset-path helpers for the property visuals (Riverside Luxe art direction).
 * Assets resolve to /property/luxe/{slug}.webp, with the landing hero loop and
 * showcase imagery served from the matching luxe folders.
 */

export function imgSrc(slug: string): string {
  return `/property/luxe/${slug}.webp`;
}

export function heroPoster(): string {
  return `/hero/landing-luxe-poster.webp`;
}

export type HeroOrient = "land" | "port";

/** Single edited hero master per orientation, e.g. `/hero/hero-land-luxe.mp4`.
 * The HeroVideo player loops this one file (orientation chosen by viewport). */
export function heroMaster(orient: HeroOrient): string {
  return `/hero/hero-${orient}-luxe.mp4`;
}
