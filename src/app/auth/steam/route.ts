import { type NextRequest, NextResponse } from "next/server";
import { steamLoginUrl } from "@/lib/auth/steam-openid";
import { safeReturnTo } from "@/lib/security/redirects";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  assertRateLimit(
    `steam-login:${request.headers.get("x-forwarded-for") ?? "local"}`,
    10,
    60_000,
  );

  return NextResponse.redirect(steamLoginUrl(returnTo));
}
