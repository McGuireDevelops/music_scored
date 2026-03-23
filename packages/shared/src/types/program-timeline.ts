/** Scope: single course (Firestore `classes`) or teacher curriculum (`curricula`). */
export type ProgramTimelineScope = "class" | "curriculum";

export interface ProgramTimelineSegment {
  id: string;
  label: string;
  /** Inclusive program week index (1-based). */
  weekStart: number;
  /** Inclusive program week index (1-based). */
  weekEnd: number;
  color?: string;
  moduleId?: string;
}

export interface ProgramTimelineMilestone {
  id: string;
  label: string;
  weekStart?: number;
  weekEnd?: number;
  /** UTC ms — calendar start for dated milestones. */
  startAt?: number;
  /** UTC ms — calendar end for multi-day events. */
  endAt?: number;
  notes?: string;
}

/**
 * High-level program map (Gantt-style) for a class or curriculum.
 * `anchorDate`: UTC ms marking the start of **week 1** of the program (first moment of that week).
 */
export interface ProgramTimeline {
  teacherId: string;
  scope: ProgramTimelineScope;
  scopeId: string;
  title?: string | null;
  weekCount: number;
  anchorDate: number;
  segments: ProgramTimelineSegment[];
  milestones: ProgramTimelineMilestone[];
  createdAt: number;
  updatedAt: number;
}
