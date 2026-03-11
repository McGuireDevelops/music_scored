import { z, ZodSchema } from "zod";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Validates request data against a Zod schema and throws HttpsError on failure.
 */
export function validateInput<T>(
  schema: ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const msg = first
    ? `${first.path.join(".")}: ${first.message}`
    : "Invalid input";
  throw new HttpsError("invalid-argument", msg);
}
