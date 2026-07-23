import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertOwnsResource } from "@/lib/security/authorisation";
import { safeReturnTo } from "@/lib/security/redirects";

describe("authorisation helpers", () => {
  it("blocks access to another user's resource", () => {
    expect(() => assertOwnsResource("a", "b")).toThrow(AppError);
    expect(() => assertOwnsResource("a", "a")).not.toThrow();
  });

  it("prevents open redirects", () => {
    expect(safeReturnTo("https://evil.example")).toBe("/dashboard");
    expect(safeReturnTo("//evil.example")).toBe("/dashboard");
    expect(safeReturnTo("/games")).toBe("/games");
  });
});
