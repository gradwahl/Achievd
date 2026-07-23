import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { isSteamGameInstalled } from "@/lib/steam/local-library";

const querySchema = z.object({
  appIds: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((item) => Number(item))
        .filter(Number.isInteger)
        .slice(0, 500),
    ),
});

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const entries = await Promise.all(
      query.appIds.map(async (appId) => [
        appId,
        await isSteamGameInstalled(appId),
      ]),
    );

    return Response.json({
      ok: true,
      installed: Object.fromEntries(entries),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
