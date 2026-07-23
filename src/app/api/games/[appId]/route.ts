import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { saveCustomImage } from "@/lib/media/custom-images";
import { getRepository } from "@/lib/repositories";
import { assertCsrf } from "@/lib/security/csrf";
import { invalidateAppDataCache } from "@/lib/services/app-service";

const imageSchema = z
  .string()
  .max(7_000_000)
  .refine(
    (value) =>
      z.string().url().safeParse(value).success ||
      /^\/api\/media\/[a-f0-9-]+\.(?:jpg|png)$/i.test(value) ||
      /^data:image\/(?:png|jpeg);base64,/i.test(value),
    "Use an image URL, JPEG, or PNG.",
  )
  .nullable();

const patchSchema = z.object({
  hidden: z.boolean().optional(),
  boxArtUrl: imageSchema.optional(),
  bannerUrl: imageSchema.optional(),
});

type Params = { params: Promise<{ appId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    const appId = Number((await params).appId);
    if (!Number.isInteger(appId)) {
      return Response.json({ ok: false, message: "Invalid game." }, { status: 400 });
    }

    const body = patchSchema.parse(await request.json());
    if (body.hidden !== undefined) {
      await getRepository().hideGame(session.id, appId, body.hidden);
    }
    let game =
      body.boxArtUrl !== undefined
        ? await getRepository().updateGameBoxArt(
            session.id,
            appId,
            await saveCustomImage(body.boxArtUrl),
          )
        : null;
    if (body.bannerUrl !== undefined) {
      game = await getRepository().updateGameBanner(
        session.id,
        appId,
        await saveCustomImage(body.bannerUrl),
      );
    }
    invalidateAppDataCache();

    return Response.json(
      { ok: true, game },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
