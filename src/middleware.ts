import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Skip auth for the cron endpoint (it uses CRON_SECRET instead)
  if (req.nextUrl.pathname.startsWith("/api/check-availability")) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  const expected = `Basic ${Buffer.from(
    `${process.env.BASIC_AUTH_USER}:${process.env.BASIC_AUTH_PASSWORD}`
  ).toString("base64")}`;

  if (auth === expected) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Watchlist"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};