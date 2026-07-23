import { productConfig } from "@/config/product";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/types";

export function assertCsrf(request: Request, session: SessionUser) {
  const token = request.headers.get(productConfig.csrfHeader);
  if (!token || token !== session.csrfToken) {
    throw new AppError("CSRF_FAILED", "Security token is invalid.", 403);
  }
}
