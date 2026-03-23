import { DateTime } from "luxon";
import type { WeeklySlot, TeacherAvailability, Booking } from "@learning-scores/shared";
import { luxonWeekdayToJs, wallTimeInZoneToUtc } from "./zonedTime";

export interface ConcreteSlot {
  startAt: number;
  endAt: number;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Generate concrete UTC slots for one weekly rule on a given week offset (0 = next occurrence).
 */
export function getSlotsForDay(
  ws: WeeklySlot,
  avail: TeacherAvailability,
  now: number,
  weekOffset: number
): ConcreteSlot[] {
  const result: ConcreteSlot[] = [];
  const tz = avail.timezone;
  const duration = avail.slotDurationMinutes;
  const buffer = avail.bufferMinutes ?? 0;

  const nowZ = DateTime.fromMillis(now).setZone(tz);
  const jsCurrent = luxonWeekdayToJs(nowZ.weekday);
  let daysUntil = ws.dayOfWeek - jsCurrent;
  if (daysUntil < 0) daysUntil += 7;
  daysUntil += weekOffset * 7;

  const targetDay = nowZ.plus({ days: daysUntil });

  const windowStartMins = timeToMinutes(ws.startTime);
  const windowEndMins = timeToMinutes(ws.endTime);

  let currentMins = windowStartMins;
  while (currentMins + duration <= windowEndMins) {
    const hour = Math.floor(currentMins / 60);
    const minute = currentMins % 60;
    const utcStart = wallTimeInZoneToUtc(
      targetDay.year,
      targetDay.month,
      targetDay.day,
      hour,
      minute,
      tz
    );
    if (utcStart !== null) {
      result.push({
        startAt: utcStart,
        endAt: utcStart + duration * 60_000,
      });
    }
    currentMins += duration + buffer;
  }

  return result;
}

export function generateSlots(
  avail: TeacherAvailability,
  existingBookings: Booking[],
  weeksAhead: number = 3,
  nowMs: number = Date.now()
): ConcreteSlot[] {
  const now = nowMs;
  const slots: ConcreteSlot[] = [];
  const confirmedBookings = existingBookings.filter((b) => b.status === "confirmed");

  for (let weekOffset = 0; weekOffset < weeksAhead; weekOffset++) {
    for (const ws of avail.weeklySlots) {
      slots.push(...getSlotsForDay(ws, avail, now, weekOffset));
    }
  }

  return slots.filter((slot) => {
    if (slot.startAt <= now) return false;
    return !confirmedBookings.some(
      (b) => b.startAt < slot.endAt && b.endAt > slot.startAt
    );
  });
}
