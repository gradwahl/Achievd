import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env, sessionSecret } from "@/config/env";
import { productConfig } from "@/config/product";
import { AppError } from "@/lib/errors";
import { getRepository } from "@/lib/repositories";
import type { SessionUser } from "@/lib/types";

const maxAgeSeconds = 60 * 60 * 24 * 30;

const sessionPayloadSchema = z.object({
  id: z.string(),
  steamId: z.string(),
  username: z.string().optional(),
  csrfToken: z.string(),
  expiresAt: z.number(),
});

type SessionPayload = z.infer<typeof sessionPayloadSchema>;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
};

function sign(value: string) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function encode(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(value?: string): SessionUser | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const parsed = sessionPayloadSchema.safeParse(
    JSON.parse(Buffer.from(body, "base64url").toString("utf8")),
  );
  if (!parsed.success || parsed.data.expiresAt < Date.now()) return null;
  return {
    id: parsed.data.id,
    steamId: parsed.data.steamId,
    username: parsed.data.username,
    csrfToken: parsed.data.csrfToken,
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return decode(cookieStore.get(productConfig.cookieName)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/?mode=login");
  return session;
}

export async function requireApiSession() {
  const session = await getSession();
  if (!session) {
    throw new AppError("AUTH_REQUIRED", "Please sign in first.", 401);
  }
  return session;
}

export async function createSessionResponse(
  steamId: string,
  returnTo = "/dashboard",
  options: { steamApiKey?: string; username?: string } = {},
) {
  const sessionUser = await getRepository().getOrCreateUserBySteamId(steamId);
  const payload: SessionPayload = {
    ...sessionUser,
    username: options.username,
    csrfToken: randomBytes(24).toString("base64url"),
    expiresAt: Date.now() + maxAgeSeconds * 1000,
  };
  const response = NextResponse.redirect(new URL(returnTo, env.APP_URL), 303);
  response.cookies.set(
    productConfig.cookieName,
    encode(payload),
    cookieOptions,
  );
  if (options.steamApiKey) {
    response.cookies.set(
      productConfig.steamApiKeyCookieName,
      options.steamApiKey,
      cookieOptions,
    );
  }
  return response;
}

export function clearSessionResponse(returnTo = "/") {
  const response = NextResponse.redirect(new URL(returnTo, env.APP_URL), 303);
  response.cookies.set(productConfig.cookieName, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  response.cookies.set(productConfig.steamApiKeyCookieName, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  return response;
}
