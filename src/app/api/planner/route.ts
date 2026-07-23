import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { getRepository } from "@/lib/repositories";
import { assertCsrf } from "@/lib/security/csrf";

const pinSchema = z.object({
  achievementId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    const body = pinSchema.parse(await request.json());
    const item = await getRepository().pinAchievement(
      session.id,
      body.achievementId,
    );
    return Response.json({ ok: true, item });
  } catch (error) {
    return errorResponse(error);
  }
}
