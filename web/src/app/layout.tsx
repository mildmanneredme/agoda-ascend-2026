import type { Metadata, Viewport } from "next";
import { Outfit, Albert_Sans } from "next/font/google";
import "./globals.css";
import { DevTraceProvider } from "@/components/DevTrace";
import PeelCorner from "@/components/PeelCorner";
import XrayPanel from "@/components/XrayPanel";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const albert = Albert_Sans({
  variable: "--font-albert",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Grand Neural",
  description:
    "Be the guest. Experience the AI-powered hotel of 2026 — an Agoda Ascend sandbox.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Grand Neural",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e24",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${albert.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* App-wide backdrop. The landing hero video sits above this and hides it. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/mobile-background.png')" }}
        />
        <DevTraceProvider>
          {children}
          <PeelCorner />
          <XrayPanel />
        </DevTraceProvider>
      </body>
    </html>
  );
}
