import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { ProgramTimeline, ProgramTimelineScope } from "@learning-scores/shared";
import {
  programTimelineDocId,
  seedProgramTimeline,
  updateProgramTimelineFields,
} from "../lib/programTimelineFirestore";

export function useProgramTimeline(
  scope: ProgramTimelineScope | undefined,
  scopeId: string | undefined,
  teacherId: string | undefined
) {
  const [timeline, setTimeline] = useState<ProgramTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scope || !scopeId || !teacherId) {
      setTimeline(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, "programTimelines", programTimelineDocId(scope, scopeId));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setTimeline(null);
        } else {
          setTimeline(snap.data() as ProgramTimeline);
        }
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [scope, scopeId, teacherId]);

  const createTimeline = useCallback(
    async (title?: string) => {
      if (!scope || !scopeId || !teacherId) return;
      await seedProgramTimeline(db, { teacherId, scope, scopeId, title });
    },
    [scope, scopeId, teacherId]
  );

  const saveFields = useCallback(
    async (
      fields: Pick<ProgramTimeline, "title" | "weekCount" | "anchorDate" | "segments" | "milestones">
    ) => {
      if (!scope || !scopeId) return;
      await updateProgramTimelineFields(db, scope, scopeId, fields);
    },
    [scope, scopeId]
  );

  return { timeline, loading, error, createTimeline, saveFields };
}
