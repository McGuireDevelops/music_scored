import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, getDoc, query, where, doc } from "firebase/firestore";
import { db } from "../firebase";
import type { LiveLessonStatus } from "@learning-scores/shared";

export interface LiveLessonWithId {
  id: string;
  classId: string;
  ownerId: string;
  title: string;
  scheduledAt: number;
  duration?: number;
  cohortIds?: string[];
  zoomMeetingId?: number;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  status?: LiveLessonStatus;
}

export interface TeacherLiveLessonEnriched extends LiveLessonWithId {
  className?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function useTeacherLiveLessons(teacherId: string | undefined) {
  const [lessons, setLessons] = useState<TeacherLiveLessonEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setLessons([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchLessons() {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, "liveLessons"),
          where("ownerId", "==", teacherId)
        );
        const snap = await getDocs(q);

        if (cancelled) return;

        const lessonList: LiveLessonWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LiveLessonWithId[];

        lessonList.sort((a, b) => a.scheduledAt - b.scheduledAt);

        const classIds = [...new Set(lessonList.map((l) => l.classId))];
        const classesMap = new Map<string, string>();

        for (const cid of classIds) {
          if (!cid) continue;
          const classSnap = await getDoc(doc(db, "classes", cid));
          if (cancelled) return;
          if (classSnap.exists()) {
            classesMap.set(cid, classSnap.data().name ?? "Class");
          }
        }

        const enriched: TeacherLiveLessonEnriched[] = lessonList.map((l) => ({
          ...l,
          className: l.classId ? classesMap.get(l.classId) : undefined,
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
  }, [teacherId]);

  const upcomingLessons = useMemo(() => {
    const now = Date.now();
    const upcomingThreshold = now + SEVEN_DAYS_MS;
    return lessons.filter(
      (l) =>
        l.status === "live" ||
        (l.scheduledAt >= now && l.scheduledAt <= upcomingThreshold && l.status !== "ended")
    );
  }, [lessons]);

  return {
    lessons,
    upcomingLessons,
    loading,
    error,
  };
}
