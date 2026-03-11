/**
 * Detects Firebase/Firestore permission errors and provides user-facing messages.
 */

const PERMISSION_DENIED_CODES = [
  "permission-denied",
  "PERMISSION_DENIED",
  "storage/unauthorized",
];

const ADMIN_ROLE_HINT =
  "If you're an admin, ensure your user document in Firestore (users collection) has role: 'admin'. See DEPLOYMENT_GUIDE.md for setup.";

export function isFirebasePermissionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    PERMISSION_DENIED_CODES.includes(e.code ?? "") ||
    (typeof e.message === "string" &&
      e.message.toLowerCase().includes("permission"))
  );
}

export function getPermissionErrorMessage(
  err: unknown,
  fallback = "An error occurred."
): string {
  if (!isFirebasePermissionError(err)) {
    return err instanceof Error ? err.message : fallback;
  }
  return `Missing or insufficient permissions. ${ADMIN_ROLE_HINT}`;
}
