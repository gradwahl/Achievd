import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { getRepository } from "@/lib/repositories";
import { assertCsrf } from "@/lib/security/csrf";

const reorderSchema = z.object({
  pinIds: z.array(z.string().min(1)),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    const body = reorderSchema.parse(await request.json());
    const items = await getRepository().reorderPins(session.id, body.pinIds);
    return Response.json({ ok: true, items });
  } catch (error) {
    return errorResponse(error);
  }
}
