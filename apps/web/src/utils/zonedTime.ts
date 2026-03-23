import { DateTime } from "luxon";

/**
 * Convert a wall-clock time in an IANA timezone to UTC epoch ms.
 * Returns null if the local time is invalid (e.g. skipped hour on DST spring-forward).
 */
export function wallTimeInZoneToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  zone: string
): number | null {
  const dt = DateTime.fromObject(
    { year, month, day, hour, minute, second: 0, millisecond: 0 },
    { zone }
  );
  if (!dt.isValid) return null;
  // Reject shifted instants for non-existent local times (e.g. US spring-forward gap).
  const wall = dt.setZone(zone);
  if (wall.hour !== hour || wall.minute !== minute || wall.day !== day) return null;
  return dt.toMillis();
}

/**
 * Parse `datetime-local` value (YYYY-MM-DDTHH:mm) as that wall time in the given IANA zone.
 */
export function parseDatetimeLocalInZone(datetimeLocal: string, zone: string): number | null {
  const [datePart, timePart] = datetimeLocal.trim().split("T");
  if (!datePart || !timePart) return null;
  const [y, mo, d] = datePart.split("-").map(Number);
  const timeBits = timePart.split(":");
  const h = Number(timeBits[0]);
  const mi = Number(timeBits[1] ?? 0);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  return wallTimeInZoneToUtc(y, mo, d, h, mi, zone);
}

/** Luxon weekday Mon=1 … Sun=7 → JS getDay() Sun=0 … Sat=6 */
export function luxonWeekdayToJs(weekday: number): number {
  return weekday === 7 ? 0 : weekday;
}
