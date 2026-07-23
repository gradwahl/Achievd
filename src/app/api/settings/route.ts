import { z } from "zod";
import { productConfig } from "@/config/product";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { getRepository } from "@/lib/repositories";
import { assertCsrf } from "@/lib/security/csrf";
import { invalidateAppDataCache } from "@/lib/services/app-service";

const settingsSchema = z.object({
  spoilerMode: z.enum(["hide", "show"]).optional(),
  libraryView: z.enum(["cards", "list"]).optional(),
  defaultSort: z
    .enum(["completion", "remaining", "recent", "playtime", "name"])
    .optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  rarityThresholds: z
    .object({
      common: z.number().min(0).max(100),
      uncommon: z.number().min(0).max(100),
      rare: z.number().min(0).max(100),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    const body = settingsSchema.parse(await request.json());
    const preferences = await getRepository().updatePreferences(
      session.id,
      body,
    );
    invalidateAppDataCache();
    return Response.json({ ok: true, preferences });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const session = await requireApiSession();
    const data = await getRepository().exportAccount(session.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${productConfig.name
          .toLowerCase()
          .replaceAll(" ", "-")}-export.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    const { confirmation } = z
      .object({ confirmation: z.literal("DELETE") })
      .parse(await request.json());
    if (confirmation === "DELETE") {
      await getRepository().deleteAccount(session.id);
      invalidateAppDataCache();
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
