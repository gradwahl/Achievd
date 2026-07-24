import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { getSteamGridArt, steamGridArtSchema } from "@/lib/steamgriddb";

const querySchema = z.object({
  appId: z.coerce.number().int(),
  type: z.enum(["boxart", "banner"]),
});

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const art = z
      .array(steamGridArtSchema)
      .parse(await getSteamGridArt(query.appId, query.type));
    return Response.json({ ok: true, art });
  } catch (error) {
    return errorResponse(error);
  }
}
