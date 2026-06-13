"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Persona portrait with emoji-glyph fallback. Renders /personas/{id}.webp once
 * generated; until then (or on error) it shows the original glyph so onboarding
 * never looks broken.
 */
export default function PersonaAvatar({
  id,
  glyph,
  color,
  size = "h-12 w-12",
  rounded = "rounded-xl",
}: {
  id: string;
  glyph: string;
  color: string;
  size?: string;
  rounded?: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <span
      className={`relative flex ${size} ${rounded} shrink-0 items-center justify-center overflow-hidden text-2xl`}
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {ok ? (
        <Image
          src={`/personas/${id}.webp`}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
          onError={() => setOk(false)}
        />
      ) : (
        glyph
      )}
    </span>
  );
}
