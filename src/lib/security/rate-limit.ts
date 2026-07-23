import { AppError } from "@/lib/errors";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new AppError(
      "RATE_LIMITED",
      "Please wait a moment before trying that again.",
      429,
    );
  }

  bucket.count += 1;
}

export function resetRateLimits() {
  buckets.clear();
}
