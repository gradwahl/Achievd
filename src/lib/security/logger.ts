const blocked = [/key/i, /cookie/i, /openid/i, /authorization/i, /secret/i];

export function logError(message: string, details?: Record<string, unknown>) {
  const safeDetails = details
    ? Object.fromEntries(
        Object.entries(details).filter(([key]) =>
          blocked.every((pattern) => !pattern.test(key)),
        ),
      )
    : undefined;
  console.error(message, safeDetails ?? "");
}
