import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: "Watchlist",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Watchlist",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Next.js 15 outputs mobile-web-app-capable but not the iOS-specific variant.
            apple-mobile-web-app-capable is the actual gate for iOS Safari standalone mode. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#09090b] text-zinc-100 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
