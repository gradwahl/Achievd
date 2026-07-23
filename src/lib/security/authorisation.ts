import { AppError } from "@/lib/errors";

export function assertOwnsResource(
  resourceUserId: string,
  sessionUserId: string,
) {
  if (resourceUserId !== sessionUserId) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have access to this resource.",
      403,
    );
  }
}
