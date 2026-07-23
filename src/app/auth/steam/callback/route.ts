import { type NextRequest, NextResponse } from "next/server";
import { createSessionResponse } from "@/lib/auth/session";
import { verifySteamOpenIdCallback } from "@/lib/auth/steam-openid";
import { errorResponse } from "@/lib/errors";
import { safeReturnTo } from "@/lib/security/redirects";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  try {
    assertRateLimit(
      `steam-callback:${request.headers.get("x-forwarded-for") ?? "local"}`,
      20,
      60_000,
    );
    const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
    const steamId = await verifySteamOpenIdCallback(new URL(request.url));
    return createSessionResponse(steamId, returnTo);
  } catch (error) {
    if (request.headers.get("accept")?.includes("application/json")) {
      return errorResponse(error);
    }
    return NextResponse.redirect(new URL("/login?error=steam", request.url));
  }
}
