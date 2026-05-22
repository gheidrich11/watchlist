import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watchlist",
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
