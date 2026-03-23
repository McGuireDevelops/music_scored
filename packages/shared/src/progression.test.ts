import { describe, expect, it } from "vitest";
import {
  normalizeProgression,
  progressionIntervalMs,
  resolveLessonAccess,
  resolveProgressionAccess,
} from "./progression.js";

describe("normalizeProgression", () => {
  it("maps time-released with future releasedAt to scheduled", () => {
    const n = normalizeProgression({
      releaseMode: "time-released",
      releasedAt: 1_700_000_000_000,
    });
    expect(n.mode).toBe("scheduled");
    expect(n.availableFrom).toBe(1_700_000_000_000);
  });

  it("maps time-released without date to open", () => {
    const n = normalizeProgression({ releaseMode: "time-released" });
    expect(n.mode).toBe("open");
  });

  it("maps mastery-based to open", () => {
    expect(normalizeProgression({ releaseMode: "mastery-based" }).mode).toBe("open");
  });

  it("prefers progressionMode over legacy", () => {
    const n = normalizeProgression({
      progressionMode: "manual",
      releaseMode: "time-released",
      releasedAt: 1,
    });
    expect(n.mode).toBe("manual");
  });
});

describe("resolveProgressionAccess", () => {
  const t0 = 1_000_000;

  it("open is always accessible", () => {
    expect(
      resolveProgressionAccess(
        { mode: "open" },
        { now: t0, orderIndex: 0, manualStudentReleased: false }
      ).accessible
    ).toBe(true);
  });

  it("scheduled allows at boundary", () => {
    expect(
      resolveProgressionAccess(
        { mode: "scheduled", availableFrom: t0 },
        { now: t0, orderIndex: 0, manualStudentReleased: false }
      ).accessible
    ).toBe(true);
  });

  it("scheduled denies before time", () => {
    expect(
      resolveProgressionAccess(
        { mode: "scheduled", availableFrom: t0 + 1 },
        { now: t0, orderIndex: 0, manualStudentReleased: false }
      ).accessible
    ).toBe(false);
  });

  it("manual allows class or student release", () => {
    const ctx = { now: t0, orderIndex: 0, manualStudentReleased: false };
    expect(
      resolveProgressionAccess(
        { mode: "manual", manualReleasedToClass: true },
        ctx
      ).accessible
    ).toBe(true);
    expect(
      resolveProgressionAccess(
        { mode: "manual", manualReleasedToClass: false },
        { ...ctx, manualStudentReleased: true }
      ).accessible
    ).toBe(true);
    expect(
      resolveProgressionAccess(
        { mode: "manual", manualReleasedToClass: false },
        ctx
      ).accessible
    ).toBe(false);
  });

  it("automatic drip by index", () => {
    const intervalMs = progressionIntervalMs("daily");
    const base = t0;
    expect(
      resolveProgressionAccess(
        {
          mode: "automatic",
          autoInterval: "daily",
          autoAnchor: "course_start",
          autoStartAt: base,
        },
        { now: base + intervalMs - 1, orderIndex: 1, manualStudentReleased: false }
      ).accessible
    ).toBe(false);
    expect(
      resolveProgressionAccess(
        {
          mode: "automatic",
          autoInterval: "daily",
          autoAnchor: "course_start",
          autoStartAt: base,
        },
        { now: base + intervalMs, orderIndex: 1, manualStudentReleased: false }
      ).accessible
    ).toBe(true);
  });

  it("automatic enrollment anchor uses enrolledAt", () => {
    const intervalMs = progressionIntervalMs("weekly");
    const enrolled = t0;
    expect(
      resolveProgressionAccess(
        {
          mode: "automatic",
          autoInterval: "weekly",
          autoAnchor: "enrollment",
        },
        {
          now: t0 + intervalMs - 1,
          orderIndex: 1,
          enrolledAt: enrolled,
          manualStudentReleased: false,
        }
      ).accessible
    ).toBe(false);
    expect(
      resolveProgressionAccess(
        {
          mode: "automatic",
          autoInterval: "weekly",
          autoAnchor: "enrollment",
        },
        {
          now: t0 + intervalMs,
          orderIndex: 1,
          enrolledAt: enrolled,
          manualStudentReleased: false,
        }
      ).accessible
    ).toBe(true);
  });

  it("teacher view bypasses locks", () => {
    expect(
      resolveProgressionAccess(
        { mode: "manual", manualReleasedToClass: false },
        {
          now: t0,
          orderIndex: 0,
          manualStudentReleased: false,
          isTeacherView: true,
        }
      ).accessible
    ).toBe(true);
  });
});

describe("resolveLessonAccess", () => {
  const now = 5_000_000;

  it("denies lesson when module locked", () => {
    const r = resolveLessonAccess(
      { progressionMode: "manual", manualReleasedToClass: false },
      { progressionMode: "open" },
      {
        now,
        moduleOrderIndex: 0,
        lessonOrderIndex: 0,
        moduleManualStudent: false,
        lessonManualStudent: false,
      }
    );
    expect(r.accessible).toBe(false);
  });

  it("allows lesson when module open and lesson open", () => {
    const r = resolveLessonAccess(
      { progressionMode: "open" },
      {},
      {
        now,
        moduleOrderIndex: 0,
        lessonOrderIndex: 0,
        moduleManualStudent: false,
        lessonManualStudent: false,
      }
    );
    expect(r.accessible).toBe(true);
  });

  it("denies when module open but lesson manual locked", () => {
    const r = resolveLessonAccess(
      { progressionMode: "open" },
      { progressionMode: "manual", manualReleasedToClass: false },
      {
        now,
        moduleOrderIndex: 0,
        lessonOrderIndex: 0,
        moduleManualStudent: false,
        lessonManualStudent: false,
      }
    );
    expect(r.accessible).toBe(false);
  });
});
