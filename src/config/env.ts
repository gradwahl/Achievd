import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z
      .string()
      .default("postgresql://postgres:postgres@localhost:5432/Achievd"),
    SESSION_SECRET: z.string().optional(),
    STEAM_API_KEY: z.string().optional(),
    STEAMGRIDDB_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === "production" &&
      !env.APP_URL.startsWith("http://localhost") &&
      !env.APP_URL.startsWith("http://127.0.0.1") &&
      (env.SESSION_SECRET?.length ?? 0) < 32
    ) {
      ctx.addIssue({
        code: "custom",
        message: "SESSION_SECRET must be at least 32 characters in production",
        path: ["SESSION_SECRET"],
      });
    }
  });

export const env = envSchema.parse(process.env);

export const sessionSecret =
  env.SESSION_SECRET ?? "achievd-local-session-secret-change-me";
