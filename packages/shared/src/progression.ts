/**
 * Module/lesson progression: normalize legacy Firestore fields and resolve student access.
 */

import type {
  ContentProgressionFields,
  ModuleReleaseMode,
  ProgressAutoAnchor,
  ProgressAutoInterval,
  ProgressionMode,
} from "./types/curriculum.js";

/** Firestore-shaped fields including legacy releaseMode / releasedAt. */
export type RawProgressionDoc = ContentProgressionFields & {
  releaseMode?: ModuleReleaseMode;
  releasedAt?: number;
};

export interface NormalizedProgression {
  mode: ProgressionMode;
  availableFrom?: number;
  autoInterval?: ProgressAutoInterval;
  autoAnchor?: ProgressAutoAnchor;
  autoStartAt?: number;
  manualReleasedToClass?: boolean;
}

export function normalizeProgression(
  doc: RawProgressionDoc | undefined | null,
  defaultWhenUnset: ProgressionMode = "open"
): NormalizedProgression {
  if (!doc) {
    return { mode: defaultWhenUnset };
  }
  if (doc.progressionMode != null) {
    return {
      mode: doc.progressionMode,
      availableFrom: doc.availableFrom ?? doc.releasedAt,
      autoInterval: doc.autoInterval,
      autoAnchor: doc.autoAnchor,
      autoStartAt: doc.autoStartAt,
      manualReleasedToClass: doc.manualReleasedToClass,
    };
  }
  if (doc.releaseMode === "time-released") {
    const ts = doc.availableFrom ?? doc.releasedAt;
    if (ts == null) {
      return { mode: "open" };
    }
    return { mode: "scheduled", availableFrom: ts };
  }
  if (doc.releaseMode === "mastery-based") {
    return { mode: "open" };
  }
  return { mode: defaultWhenUnset };
}

const DAY_MS = 86_400_000;

export function progressionIntervalMs(interval: ProgressAutoInterval): number {
  switch (interval) {
    case "daily":
      return DAY_MS;
    case "weekly":
      return 7 * DAY_MS;
    case "monthly":
      return 30 * DAY_MS;
    case "quarterly":
      return 90 * DAY_MS;
    case "yearly":
      return 365 * DAY_MS;
    default:
      return DAY_MS;
  }
}

export interface ProgressionAccessContext {
  now: number;
  /** 0-based index among ordered siblings (modules in class or lessons in module). */
  orderIndex: number;
  enrolledAt?: number;
  manualStudentReleased?: boolean;
  isTeacherView?: boolean;
}

export interface ProgressionAccessResult {
  accessible: boolean;
  reason?: string;
}

export function resolveProgressionAccess(
  normalized: NormalizedProgression,
  ctx: ProgressionAccessContext
): ProgressionAccessResult {
  if (ctx.isTeacherView) {
    return { accessible: true };
  }
  switch (normalized.mode) {
    case "open":
      return { accessible: true };
    case "scheduled": {
      const at = normalized.availableFrom ?? 0;
      if (ctx.now >= at) {
        return { accessible: true };
      }
      return {
        accessible: false,
        reason: "This content is scheduled to unlock later.",
      };
    }
    case "automatic": {
      const interval = normalized.autoInterval;
      const anchor = normalized.autoAnchor;
      if (!interval || !anchor) {
        return { accessible: true };
      }
      const base =
        anchor === "course_start" ? normalized.autoStartAt : ctx.enrolledAt;
      if (base == null) {
        return {
          accessible: false,
          reason: "Progression will begin once you are enrolled.",
        };
      }
      const ms = progressionIntervalMs(interval);
      const unlocksAt = base + ctx.orderIndex * ms;
      if (ctx.now >= unlocksAt) {
        return { accessible: true };
      }
      return {
        accessible: false,
        reason: "This content unlocks on a set schedule.",
      };
    }
    case "manual": {
      if (normalized.manualReleasedToClass) {
        return { accessible: true };
      }
      if (ctx.manualStudentReleased) {
        return { accessible: true };
      }
      return {
        accessible: false,
        reason: "Your teacher has not released this content yet.",
      };
    }
    default:
      return { accessible: true };
  }
}

export interface LessonAccessParams {
  now: number;
  moduleOrderIndex: number;
  lessonOrderIndex: number;
  enrolledAt?: number;
  moduleManualStudent: boolean;
  lessonManualStudent: boolean;
  isTeacherView?: boolean;
}

export function resolveLessonAccess(
  moduleDoc: RawProgressionDoc | undefined | null,
  lessonDoc: RawProgressionDoc | undefined | null,
  params: LessonAccessParams
): ProgressionAccessResult {
  const modNorm = normalizeProgression(moduleDoc, "open");
  const modRes = resolveProgressionAccess(modNorm, {
    now: params.now,
    orderIndex: params.moduleOrderIndex,
    enrolledAt: params.enrolledAt,
    manualStudentReleased: params.moduleManualStudent,
    isTeacherView: params.isTeacherView,
  });
  if (!modRes.accessible) {
    return modRes;
  }
  const lessonNorm = normalizeProgression(lessonDoc, "open");
  return resolveProgressionAccess(lessonNorm, {
    now: params.now,
    orderIndex: params.lessonOrderIndex,
    enrolledAt: params.enrolledAt,
    manualStudentReleased: params.lessonManualStudent,
    isTeacherView: params.isTeacherView,
  });
}
