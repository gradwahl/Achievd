import { z } from "zod";
import { env } from "@/config/env";
import { requireApiSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";

const querySchema = z.object({
  appId: z.coerce.number().int(),
  type: z.enum(["boxart", "banner"]),
});

const artSchema = z.object({
  id: z.number(),
  url: z.string().url(),
  thumb: z.string().url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const cache = new Map<
  string,
  { expiresAt: number; art: z.infer<typeof artSchema>[] }
>();

export async function GET(request: Request) {
  try {
    await requireApiSession();
    if (!env.STEAMGRIDDB_API_KEY) {
      return Response.json(
        { ok: false, message: "SteamGridDB API key is missing." },
        { status: 400 },
      );
    }

    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const cacheKey = `${query.type}:${query.appId}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Response.json({ ok: true, art: cached.art });
    }

    const kind = query.type === "banner" ? "heroes" : "grids";
    const response = await fetch(
      `https://www.steamgriddb.com/api/v2/${kind}/steam/${query.appId}`,
      { headers: { Authorization: `Bearer ${env.STEAMGRIDDB_API_KEY}` } },
    );
    if (!response.ok) {
      return Response.json(
        { ok: false, message: "SteamGridDB lookup failed." },
        { status: response.status },
      );
    }

    const body = (await response.json()) as unknown;
    const parsed = z
      .object({ data: z.array(artSchema).default([]) })
      .safeParse(body);

    const art = parsed.success ? parsed.data.data.slice(0, 16) : [];
    cache.set(cacheKey, { expiresAt: Date.now() + 3_600_000, art });

    return Response.json({ ok: true, art });
  } catch (error) {
    return errorResponse(error);
  }
}
