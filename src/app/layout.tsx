import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "Watchlist",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#111", color: "#e8e8e8" }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
