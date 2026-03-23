import { doc, setDoc, getDoc, updateDoc, type Firestore } from "firebase/firestore";
import type { ProgramTimeline, ProgramTimelineScope } from "@learning-scores/shared";

/** Deterministic doc id: one timeline per class or curriculum. */
export function programTimelineDocId(scope: ProgramTimelineScope, scopeId: string): string {
  return `${scope}_${scopeId}`;
}

export const DEFAULT_WEEK_COUNT_CLASS = 12;
export const DEFAULT_WEEK_COUNT_CURRICULUM = 35;

export function buildNewProgramTimeline(
  teacherId: string,
  scope: ProgramTimelineScope,
  scopeId: string,
  title: string | undefined,
  weekCount: number,
  anchorDate: number
): ProgramTimeline {
  const now = Date.now();
  return {
    teacherId,
    scope,
    scopeId,
    title: title?.trim() || null,
    weekCount,
    anchorDate,
    segments: [],
    milestones: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function seedProgramTimeline(
  db: Firestore,
  args: {
    teacherId: string;
    scope: ProgramTimelineScope;
    scopeId: string;
    title?: string;
    weekCount?: number;
    anchorDate?: number;
  }
): Promise<void> {
  const weekCount =
    args.weekCount ??
    (args.scope === "class" ? DEFAULT_WEEK_COUNT_CLASS : DEFAULT_WEEK_COUNT_CURRICULUM);
  const anchorDate = args.anchorDate ?? Date.now();
  const payload = buildNewProgramTimeline(
    args.teacherId,
    args.scope,
    args.scopeId,
    args.title,
    weekCount,
    anchorDate
  );
  const ref = doc(db, "programTimelines", programTimelineDocId(args.scope, args.scopeId));
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, payload);
}

export async function updateProgramTimelineFields(
  db: Firestore,
  scope: ProgramTimelineScope,
  scopeId: string,
  fields: Pick<ProgramTimeline, "title" | "weekCount" | "anchorDate" | "segments" | "milestones">
): Promise<void> {
  const ref = doc(db, "programTimelines", programTimelineDocId(scope, scopeId));
  await updateDoc(ref, {
    ...fields,
    updatedAt: Date.now(),
  });
}
