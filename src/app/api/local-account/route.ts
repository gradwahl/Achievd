import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { productConfig } from "@/config/product";
import { setLocalAccountLoginOptions } from "@/lib/auth/local-accounts";
import { errorResponse } from "@/lib/errors";
import { assertCsrf } from "@/lib/security/csrf";

const schema = z.object({
  displayAtLogin: z.boolean().optional(),
  autoLogin: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    if (!session.username) {
      return Response.json({ ok: false, message: "Local account not found." });
    }
    const body = schema.parse(await request.json());
    const cookieStore = await cookies();
    const steamApiKey = cookieStore.get(
      productConfig.steamApiKeyCookieName,
    )?.value;
    if (body.autoLogin && !steamApiKey) {
      return Response.json({
        ok: false,
        message: "Login again with your password before enabling auto login.",
      });
    }
    await setLocalAccountLoginOptions(session.username, {
      ...body,
      steamApiKey,
    });
    return Response.json({ ok: true, ...body });
  } catch (error) {
    return errorResponse(error);
  }
}
