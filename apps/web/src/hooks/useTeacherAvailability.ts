import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { TeacherAvailability } from "@learning-scores/shared";

export function useTeacherAvailability(teacherId: string | undefined) {
  const [availability, setAvailability] = useState<TeacherAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setAvailability(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, "teacherAvailability", teacherId!));
        if (cancelled) return;
        if (snap.exists()) {
          setAvailability({ ...snap.data(), teacherId: teacherId! } as TeacherAvailability);
        } else {
          setAvailability(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load availability");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [teacherId]);

  const saveAvailability = useCallback(
    async (data: Omit<TeacherAvailability, "teacherId" | "updatedAt">) => {
      if (!teacherId) return;
      const payload: TeacherAvailability = {
        ...data,
        teacherId,
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, "teacherAvailability", teacherId), payload);
      setAvailability(payload);
    },
    [teacherId]
  );

  return { availability, loading, error, saveAvailability };
}
