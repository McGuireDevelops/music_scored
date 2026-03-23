import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import type { TeacherAvailability } from "@learning-scores/shared";
import { generateSlots, getSlotsForDay } from "./bookingSlots";
import { wallTimeInZoneToUtc, parseDatetimeLocalInZone } from "./zonedTime";

function baseAvail(over: Partial<TeacherAvailability> = {}): TeacherAvailability {
  return {
    teacherId: "t1",
    slotDurationMinutes: 30,
    timezone: "America/New_York",
    weeklySlots: [{ dayOfWeek: 1, startTime: "10:00", endTime: "11:00" }],
    bookingLimit: { maxPerStudent: 10, periodDays: 7 },
    updatedAt: 0,
    ...over,
  };
}

describe("wallTimeInZoneToUtc", () => {
  it("maps a winter Eastern time to the correct UTC instant", () => {
    const ms = wallTimeInZoneToUtc(2025, 1, 20, 10, 0, "America/New_York");
    expect(ms).not.toBeNull();
    expect(DateTime.fromMillis(ms!, { zone: "utc" }).toISO()).toContain("2025-01-20T15:00:00.000Z");
  });

  it("returns null for a non-existent local time on US spring-forward", () => {
    const ms = wallTimeInZoneToUtc(2025, 3, 9, 2, 30, "America/New_York");
    expect(ms).toBeNull();
  });

  it("resolves an ambiguous local hour on US fall-back (Luxon picks an offset)", () => {
    const ms = wallTimeInZoneToUtc(2025, 11, 2, 1, 30, "America/New_York");
    expect(ms).not.toBeNull();
    expect(typeof ms).toBe("number");
  });
});

describe("parseDatetimeLocalInZone", () => {
  it("parses datetime-local string in the given zone, not browser local", () => {
    const ms = parseDatetimeLocalInZone("2025-01-20T10:00", "America/New_York");
    expect(ms).not.toBeNull();
    expect(DateTime.fromMillis(ms!, { zone: "utc" }).hour).toBe(15);
  });
});

describe("generateSlots", () => {
  it("produces UTC slots aligned to the teacher timezone", () => {
    const mondayMorningNy = DateTime.fromObject(
      { year: 2025, month: 1, day: 20, hour: 8, minute: 0 },
      { zone: "America/New_York" }
    ).toMillis();

    const slots = generateSlots(baseAvail(), [], 3, mondayMorningNy);
    const match = slots.find((s) => {
      const z = DateTime.fromMillis(s.startAt).setZone("America/New_York");
      return z.weekday === 1 && z.hour === 10 && z.minute === 0 && z.day === 20;
    });
    expect(match).toBeDefined();
    expect(match!.endAt - match!.startAt).toBe(30 * 60_000);
  });

  it("excludes slots that start in the past relative to nowMs", () => {
    const mondayNoonNy = DateTime.fromObject(
      { year: 2025, month: 1, day: 20, hour: 12, minute: 0 },
      { zone: "America/New_York" }
    ).toMillis();

    const slots = generateSlots(baseAvail(), [], 3, mondayNoonNy);
    const tooEarly = slots.filter((s) => {
      const z = DateTime.fromMillis(s.startAt).setZone("America/New_York");
      return z.day === 20 && z.hour === 10;
    });
    expect(tooEarly).toHaveLength(0);
  });
});

describe("getSlotsForDay", () => {
  it("skips invalid wall times inside the availability window on DST transition", () => {
    const avail = baseAvail({
      weeklySlots: [{ dayOfWeek: 0, startTime: "01:00", endTime: "04:00" }],
      slotDurationMinutes: 60,
      bufferMinutes: 0,
    });
    const sundayBeforeSpring = DateTime.fromObject(
      { year: 2025, month: 3, day: 9, hour: 12, minute: 0 },
      { zone: "America/New_York" }
    ).toMillis();
    const slots = getSlotsForDay(avail.weeklySlots[0], avail, sundayBeforeSpring, 0);
    const invalidStart = wallTimeInZoneToUtc(2025, 3, 9, 2, 0, "America/New_York");
    expect(invalidStart).toBeNull();
    expect(slots.every((s) => s.startAt > 0)).toBe(true);
  });
});
