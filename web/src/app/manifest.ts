import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Grand Neural — Agoda Ascend Sandbox",
    short_name: "Grand Neural",
    description: "Be the guest at the AI-powered hotel of 2026.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e24",
    theme_color: "#0a0e24",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
