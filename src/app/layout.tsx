import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Watchlist",
  manifest: "/manifest.webmanifest",
  themeColor: "#09090b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Watchlist",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#09090b] text-zinc-100 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
