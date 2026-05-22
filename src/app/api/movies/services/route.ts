// GET /api/movies/services — list known streaming services with subscription status
// POST /api/movies/services — toggle a service on or off

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

const DEFAULT_USER_ID = 1;
const DEFAULT_REGION = "US";

// Well-known US streaming services (TMDB provider IDs + logo paths)
const KNOWN_SERVICES = [
  { providerId: 8, providerName: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" },
  { providerId: 9, providerName: "Amazon Prime Video", logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg" },
  { providerId: 337, providerName: "Disney Plus", logoPath: "/97yvRBw1GzX7fXprcF80er19ot.jpg" },
  { providerId: 1899, providerName: "Max", logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg" },
  { providerId: 15, providerName: "Hulu", logoPath: "/bxBlRPEPpMVDc4jMhSrTf2339DW.jpg" },
  { providerId: 531, providerName: "Paramount Plus", logoPath: "/fts6X10Jn4QT0X6ac3udKEn2tJA.jpg" },
  { providerId: 350, providerName: "Apple TV Plus", logoPath: "/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg" },
  { providerId: 387, providerName: "Peacock", logoPath: "/drPlq5beqXtBaP7MNs8W616YRhm.jpg" },
  { providerId: 283, providerName: "Crunchyroll", logoPath: "/fzN5Jok5Ig1eJ7gyNGoMhnLSCfh.jpg" },
  { providerId: 37, providerName: "Showtime", logoPath: null },
  { providerId: 73, providerName: "Tubi", logoPath: null },
  { providerId: 300, providerName: "Pluto TV", logoPath: null },
  { providerId: 43, providerName: "Starz", logoPath: "/yIKwylTLP1u8gl84Is7FItpYLGL.jpg" },
  { providerId: 207, providerName: "Roku Channel", logoPath: "/wQzSN83BnWVgO7xEh0SeTVqtrFv.jpg" },
  { providerId: 257, providerName: "fuboTV", logoPath: "/9BgaNQRMDvVlji1JBZi6tcfxpKx.jpg" },
  { providerId: 538, providerName: "Plex", logoPath: "/vLZKlXUNDcZR7ilvfY9Wr9k80FZ.jpg" },
];

const getSubscribed = db.prepare(
  `SELECT provider_id FROM user_service WHERE user_id = ? AND region = ?`
);

const addService = db.prepare(
  `INSERT OR IGNORE INTO user_service (user_id, provider_id, provider_name, region) VALUES (?, ?, ?, ?)`
);

const removeService = db.prepare(
  `DELETE FROM user_service WHERE user_id = ? AND provider_id = ? AND region = ?`
);

export async function GET() {
  const rows = getSubscribed.all(DEFAULT_USER_ID, DEFAULT_REGION) as { provider_id: number }[];
  const subscribedIds = new Set(rows.map((r) => r.provider_id));

  const services = KNOWN_SERVICES.map((s) => ({
    ...s,
    subscribed: subscribedIds.has(s.providerId),
  }));

  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { providerId, providerName, subscribed } = body;

  if (!providerId || !providerName || typeof subscribed !== "boolean") {
    return NextResponse.json({ error: "Missing providerId, providerName, or subscribed" }, { status: 400 });
  }

  if (subscribed) {
    addService.run(DEFAULT_USER_ID, providerId, providerName, DEFAULT_REGION);
  } else {
    removeService.run(DEFAULT_USER_ID, providerId, DEFAULT_REGION);
  }

  return NextResponse.json({ ok: true });
}
