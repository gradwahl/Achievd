export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_FAILED"
  | "CSRF_FAILED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PRIVATE_PROFILE"
  | "RATE_LIMITED"
  | "STEAM_TEMPORARY"
  | "STEAM_PERMANENT"
  | "VALIDATION_FAILED";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.status },
    );
  }

  return Response.json(
    { ok: false, code: "UNEXPECTED", message: "Something went wrong." },
    { status: 500 },
  );
}
