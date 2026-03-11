import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { LiveLessonStatus } from "@learning-scores/shared";

export interface StudentLiveLesson {
  id: string;
  classId: string;
  ownerId: string;
  title: string;
  scheduledAt: number;
  duration?: number;
  zoomJoinUrl?: string;
  status?: LiveLessonStatus;
  className?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function useStudentLiveLessons(studentId: string | undefined) {
  const [lessons, setLessons] = useState<StudentLiveLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLessons([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchLessons() {
      setLoading(true);
      setError(null);

      try {
        const grantsSnap = await getDocs(
          collection(db, "users", studentId!, "accessGrants")
        );
        const classIds = grantsSnap.docs.map((d) => d.id).filter(Boolean);

        if (classIds.length === 0) {
          setLessons([]);
          return;
        }

        const batches: string[][] = [];
        for (let i = 0; i < classIds.length; i += 30) {
          batches.push(classIds.slice(i, i + 30));
        }

        const allLessons: StudentLiveLesson[] = [];
        for (const batch of batches) {
          const q = query(
            collection(db, "liveLessons"),
            where("classId", "in", batch)
          );
          const snap = await getDocs(q);
          if (cancelled) return;
          for (const d of snap.docs) {
            const data = d.data();
            allLessons.push({
              id: d.id,
              classId: data.classId,
              ownerId: data.ownerId,
              title: data.title,
              scheduledAt: data.scheduledAt,
              duration: data.duration,
              zoomJoinUrl: data.zoomJoinUrl,
              status: data.status,
            });
          }
        }

        allLessons.sort((a, b) => a.scheduledAt - b.scheduledAt);

        const uniqueClassIds = [...new Set(allLessons.map((l) => l.classId))];
        const classesMap = new Map<string, string>();
        for (const cid of uniqueClassIds) {
          const classSnap = await getDoc(doc(db, "classes", cid));
          if (cancelled) return;
          if (classSnap.exists()) {
            classesMap.set(cid, classSnap.data().name ?? "Class");
          }
        }

        const enriched = allLessons.map((l) => ({
          ...l,
          className: classesMap.get(l.classId),
        }));

        setLessons(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load live lessons"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLessons();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const liveLessons = useMemo(
    () => lessons.filter((l) => l.status === "live"),
    [lessons]
  );

  const upcomingLessons = useMemo(() => {
    const now = Date.now();
    const threshold = now + SEVEN_DAYS_MS;
    return lessons.filter(
      (l) =>
        l.status !== "ended" &&
        l.status !== "live" &&
        l.scheduledAt >= now &&
        l.scheduledAt <= threshold
    );
  }, [lessons]);

  return {
    lessons,
    liveLessons,
    upcomingLessons,
    loading,
    error,
  };
}
