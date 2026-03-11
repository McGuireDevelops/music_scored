/**
 * Origin validation for redirect URLs (Stripe checkout, Stripe Connect).
 * Validates Origin header against allowlist to prevent open redirect abuse.
 */

const DEFAULT_ALLOWED = ["http://localhost:5173", "http://localhost:3000"];

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  if (env) {
    return env.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED;
}

/**
 * Returns a valid origin for redirect URLs, or null if the request origin is not allowed.
 */
export function validateOrigin(origin: string | undefined): string | null {
  const allowed = getAllowedOrigins();
  const normalized = (origin ?? "").trim();
  if (!normalized) return null;
  const match = allowed.find((a) => a === normalized);
  return match ?? null;
}

/**
 * Gets a safe origin for redirect URLs. Falls back to first allowed origin if request origin is invalid.
 */
export function getSafeOrigin(origin: string | undefined): string {
  const validated = validateOrigin(origin);
  if (validated) return validated;
  return getAllowedOrigins()[0] ?? "http://localhost:5173";
}
