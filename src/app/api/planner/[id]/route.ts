import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { getRepository } from "@/lib/repositories";
import { assertCsrf } from "@/lib/security/csrf";

const patchSchema = z.object({
  notes: z.string().max(2000).optional(),
  manualProgressText: z.string().max(240).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  state: z.enum(["active", "completed", "archived"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const item = await getRepository().updatePin(session.id, id, body);
    return Response.json({ ok: true, item });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    const { id } = await params;
    await getRepository().removePin(session.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
