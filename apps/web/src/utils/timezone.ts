/**
 * Timezone utilities - store all times in UTC, convert for display
 */

/**
 * Format UTC timestamp for display using optional timezone.
 * Defaults to user's local timezone if not specified.
 */
export function formatUtcForDisplay(
  utcMs: number,
  timezone?: string
): string {
  try {
    if (timezone) {
      return new Date(utcMs).toLocaleString(undefined, {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
    return new Date(utcMs).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return new Date(utcMs).toISOString();
  }
}

/**
 * Get current UTC timestamp in milliseconds
 */
export function nowUtc(): number {
  return Date.now();
}

/**
 * Parse a local datetime string to UTC ms (for forms).
 * Assumes the input is in the user's local timezone.
 */
export function localToUtc(
  dateStr: string,
  timeStr?: string
): number {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}`).getTime();
  }
  return new Date(dateStr).getTime();
}
