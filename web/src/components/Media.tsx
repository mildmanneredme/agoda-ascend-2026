"use client";

import Image from "next/image";
import { useState } from "react";
import { imgSrc, type ArtStyle } from "@/lib/artStyle";

/**
 * Property image with a graceful gradient fallback — renders the generated
 * /property/{style}/{slug}.webp asset, and quietly degrades to a brand
 * gradient if that asset hasn't been generated yet. Parent must be `relative`.
 */
export default function Media({
  slug,
  style,
  alt,
  sizes = "(max-width: 768px) 100vw, 768px",
  priority = false,
}: {
  slug: string;
  style: ArtStyle;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-navy-raise via-navy to-abyss"
      />
      {!failed && (
        <Image
          key={imgSrc(style, slug)}
          src={imgSrc(style, slug)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}
