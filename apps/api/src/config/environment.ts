import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
    JWT_ACCESS_EXPIRES_IN: z
      .string()
      .regex(/^[1-9]\d*(s|m|h|d)$/)
      .default("15m"),
    API_CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
    PORT: z.coerce.number().int().positive().max(65_535).optional(),
    API_PORT: z.coerce.number().int().positive().max(65_535).default(4000),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  })
  .passthrough()
  .superRefine((environment, context) => {
    if (environment.NODE_ENV !== "production") {
      return;
    }

    if (
      environment.JWT_ACCESS_SECRET.length < 32 ||
      environment.JWT_ACCESS_SECRET.includes("replace-with")
    ) {
      context.addIssue({
        code: "custom",
        path: ["JWT_ACCESS_SECRET"],
        message: "must contain at least 32 characters in production",
      });
    }

    const databaseUrl = URL.canParse(environment.DATABASE_URL)
      ? new URL(environment.DATABASE_URL)
      : null;

    if (
      !databaseUrl ||
      !["postgresql:", "postgres:"].includes(databaseUrl.protocol)
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "must be a PostgreSQL connection string in production",
      });
    }

    for (const origin of environment.API_CORS_ORIGIN.split(",")) {
      const value = origin.trim();

      const url = URL.canParse(value) ? new URL(value) : null;

      if (!url || url.protocol !== "https:" || url.origin !== value) {
        context.addIssue({
          code: "custom",
          path: ["API_CORS_ORIGIN"],
          message: "must contain exact comma-separated frontend URLs",
        });
      }
    }
  });

export function validateEnvironment(environment: Record<string, unknown>) {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
