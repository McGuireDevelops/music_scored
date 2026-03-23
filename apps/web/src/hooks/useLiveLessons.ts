import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, functions, httpsCallable } from "../firebase";
import type { LiveLessonStatus, ZoomRecording } from "@learning-scores/shared";

export interface LiveLessonWithId {
  id: string;
  classId: string;
  ownerId: string;
  title: string;
  scheduledAt: number;
  scheduledTimezone?: string;
  duration?: number;
  cohortIds?: string[];
  moduleId?: string;
  topics?: string[];
  zoomMeetingId?: number;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  status?: LiveLessonStatus;
  isTimeManaged?: boolean;
  recording?: ZoomRecording;
}

export function useClassLiveLessons(classId: string | undefined) {
  const [lessons, setLessons] = useState<LiveLessonWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "liveLessons"),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        setLessons(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveLessonWithId))
        );
      })
      .catch((err) => {
        console.error("Failed to load live lessons:", err);
        setLessons([]);
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const createLiveLesson = async (data: {
    title: string;
    scheduledAt: number;
    scheduledTimezone?: string;
    duration?: number;
    cohortIds?: string[];
    moduleId?: string;
    topics?: string[];
    ownerId: string;
    isTimeManaged?: boolean;
  }) => {
    if (!classId) throw new Error("No class");
    const fn = httpsCallable<Record<string, unknown>, LiveLessonWithId>(
      functions,
      "createZoomMeeting"
    );
    const res = await fn({ ...data, classId });
    const created = res.data;
    setLessons((prev) => [...prev, created]);
    return created;
  };

  const updateLiveLesson = async (
    lessonId: string,
    data: Partial<Omit<LiveLessonWithId, "id">>
  ) => {
    await updateDoc(doc(db, "liveLessons", lessonId), data);
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, ...data } : l))
    );
  };

  const setLessonStatus = async (lessonId: string, status: LiveLessonStatus) => {
    const fn = httpsCallable<
      { lessonId: string; status: string },
      { success: boolean; status: string }
    >(functions, "updateLiveLessonStatus");
    await fn({ lessonId, status });
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, status } : l))
    );
  };

  const deleteLiveLesson = async (lessonId: string) => {
    await deleteDoc(doc(db, "liveLessons", lessonId));
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  return {
    lessons,
    loading,
    createLiveLesson,
    updateLiveLesson,
    setLessonStatus,
    deleteLiveLesson,
  };
}
