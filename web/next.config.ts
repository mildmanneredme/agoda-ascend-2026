import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server (and its /_next dev resources + HMR) from
  // other devices on the LAN — e.g. testing on a phone at http://<ip>:3456.
  // Without this, Next 16 blocks cross-origin dev resources and client-side
  // React never hydrates, so the page renders but nothing is interactive.
  allowedDevOrigins: ["192.168.68.57"],
};

export default nextConfig;
