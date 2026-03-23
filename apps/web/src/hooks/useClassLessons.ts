import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { LessonWithId } from "./useModuleLessons";

export function useClassLessons(classId: string | undefined) {
  const [lessons, setLessons] = useState<LessonWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!classId) return;
    setError(null);
    try {
      const q = query(
        collection(db, "lessons"),
        where("classId", "==", classId)
      );
      const snap = await getDocs(q);
      const list: LessonWithId[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LessonWithId[];
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setLessons(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lessons");
    }
  }, [classId]);

  useEffect(() => {
    if (!classId) {
      setLessons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [classId, refetch]);

  return { lessons, loading, error, refetch };
}
