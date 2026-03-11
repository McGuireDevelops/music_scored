import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, functions, httpsCallable } from "../firebase";
import type { RecordingShare, RecordingShareTarget } from "@learning-scores/shared";

export type RecordingShareWithId = RecordingShare & { id: string };

/**
 * Hook for teachers to manage recording shares for a class.
 */
export function useTeacherRecordingShares(ownerId: string | undefined, classId: string | undefined) {
  const [shares, setShares] = useState<RecordingShareWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId || !classId) {
      setShares([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "recordingShares"),
      where("ownerId", "==", ownerId),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        setShares(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecordingShareWithId))
        );
      })
      .catch(() => setShares([]))
      .finally(() => setLoading(false));
  }, [ownerId, classId]);

  const shareRecordingFn = httpsCallable<
    {
      sourceType: "liveLesson" | "booking";
      sourceId: string;
      sharedWith: RecordingShareTarget[];
    },
    { id: string; updated: boolean }
  >(functions, "shareRecording");

  const shareRecording = useCallback(
    async (
      sourceType: "liveLesson" | "booking",
      sourceId: string,
      sharedWith: RecordingShareTarget[]
    ) => {
      const res = await shareRecordingFn({ sourceType, sourceId, sharedWith });
      // Re-fetch shares after sharing
      if (ownerId && classId) {
        const q = query(
          collection(db, "recordingShares"),
          where("ownerId", "==", ownerId),
          where("classId", "==", classId)
        );
        const snap = await getDocs(q);
        setShares(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecordingShareWithId))
        );
      }
      return res.data;
    },
    [ownerId, classId, shareRecordingFn]
  );

  const getShareForSource = useCallback(
    (sourceId: string) => shares.find((s) => s.sourceId === sourceId),
    [shares]
  );

  return { shares, loading, shareRecording, getShareForSource };
}

/**
 * Hook for students to view recording shares for a class.
 */
export function useStudentRecordingShares(classId: string | undefined) {
  const [shares, setShares] = useState<RecordingShareWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setShares([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "recordingShares"),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        setShares(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecordingShareWithId))
        );
      })
      .catch(() => setShares([]))
      .finally(() => setLoading(false));
  }, [classId]);

  const getShareForSource = useCallback(
    (sourceId: string) => shares.find((s) => s.sourceId === sourceId),
    [shares]
  );

  return { shares, loading, getShareForSource };
}
