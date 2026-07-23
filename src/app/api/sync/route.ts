import { errorResponse } from "@/lib/errors";
import { startUserSync, getUserSyncStatus } from "@/lib/jobs/sync-jobs";
import { requireApiSession } from "@/lib/auth/session";
import { assertCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { invalidateAppDataCache } from "@/lib/services/app-service";

const invalidatedSyncCompletions = new Map<string, string>();

export async function GET() {
  try {
    const session = await requireApiSession();
    const status = await getUserSyncStatus(session.id);
    if (
      status.completedAt &&
      invalidatedSyncCompletions.get(session.id) !== status.completedAt
    ) {
      invalidatedSyncCompletions.set(session.id, status.completedAt);
      invalidateAppDataCache();
    }
    return Response.json({
      ok: true,
      status,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    assertCsrf(request, session);
    assertRateLimit(`sync:${session.id}`, 3, 60_000);
    invalidateAppDataCache();
    return Response.json({ ok: true, status: await startUserSync(session) });
  } catch (error) {
    return errorResponse(error);
  }
}
