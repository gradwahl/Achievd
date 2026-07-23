import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { productConfig } from "@/config/product";

const protectedPrefixes = ["/dashboard", "/games", "/planner", "/settings"];

export function proxy(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  if (!isProtected) return NextResponse.next();

  if (!request.cookies.get(productConfig.cookieName)) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set(
      "returnTo",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/games/:path*",
    "/planner/:path*",
    "/settings/:path*",
  ],
};
