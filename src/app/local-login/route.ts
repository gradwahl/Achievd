import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionResponse } from "@/lib/auth/session";
import {
  loginLocalAccount,
  loginSavedLocalAccount,
  registerLocalAccount,
} from "@/lib/auth/local-accounts";
import { errorResponse } from "@/lib/errors";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { safeReturnTo } from "@/lib/security/redirects";

const credentialSchema = {
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
};

const registerSchema = z
  .object({
    ...credentialSchema,
    confirmPassword: z.string(),
    steamApiKey: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{32}$/),
    steamId: z
      .string()
      .trim()
      .regex(/^\d{17}$/),
  })
  .refine((input) => input.password === input.confirmPassword);

const localAuthSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    returnTo: z.string().optional(),
    ...credentialSchema,
  }),
  z.object({
    action: z.literal("register"),
    returnTo: z.string().optional(),
    ...registerSchema.shape,
  }),
]);

const savedLoginSchema = z.object({
  username: credentialSchema.username,
  returnTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const fallback = (username?: string) =>
    NextResponse.redirect(
      new URL(
        `/?mode=login${username ? `&profile=${encodeURIComponent(username)}` : ""}&returnTo=${encodeURIComponent(safeReturnTo(request.nextUrl.searchParams.get("returnTo")))}`,
        request.url,
      ),
      303,
    );
  try {
    assertRateLimit(
      `local-login:${request.headers.get("x-forwarded-for") ?? "local"}`,
      10,
      60_000,
    );
    const parsed = savedLoginSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return fallback();
    }
    const account = await loginSavedLocalAccount(parsed.data.username);
    if (!account) {
      return fallback(parsed.data.username);
    }
    return await createSessionResponse(
      account.steamId,
      safeReturnTo(parsed.data.returnTo ?? null),
      {
        steamApiKey: account.steamApiKey,
        username: account.username,
      },
    );
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.redirect(new URL("/?error=database", request.url), 303);
    }
    return fallback(request.nextUrl.searchParams.get("username") ?? undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(
      `local-login:${request.headers.get("x-forwarded-for") ?? "local"}`,
      10,
      60_000,
    );
    const form = Object.fromEntries(await request.formData());
    const parsed = localAuthSchema.safeParse(form);
    const account =
      parsed.success && parsed.data.action === "login"
        ? await loginLocalAccount(parsed.data.username, parsed.data.password)
        : parsed.success && parsed.data.action === "register"
          ? await registerLocalAccount(parsed.data)
          : null;

    if (!account) {
      return NextResponse.redirect(
        new URL("/?error=credentials", request.url),
        303,
      );
    }

    const returnTo =
      parsed.success && parsed.data.action === "register"
        ? "/dashboard?sync=1"
        : safeReturnTo(parsed.success ? (parsed.data.returnTo ?? null) : null);
    return await createSessionResponse(account.steamId, returnTo, {
      steamApiKey: account.steamApiKey,
      username: account.username,
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.redirect(new URL("/?error=database", request.url), 303);
    }
    return errorResponse(error);
  }
}

function isDatabaseUnavailable(error: unknown) {
  return (
    error instanceof Error &&
    ("code" in error
      ? error.code === "ECONNREFUSED"
      : error.message.includes("ECONNREFUSED"))
  );
}
