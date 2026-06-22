"use client";

import Image from "next/image";
import { useState } from "react";
import { imgSrc } from "@/lib/artStyle";

/**
 * Property image with a graceful gradient fallback — renders the generated
 * /property/luxe/{slug}.webp asset, and quietly degrades to a brand
 * gradient if that asset hasn't been generated yet. Parent must be `relative`.
 */
export default function Media({
  slug,
  alt,
  sizes = "(max-width: 768px) 100vw, 768px",
  priority = false,
}: {
  slug: string;
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
          key={imgSrc(slug)}
          src={imgSrc(slug)}
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
