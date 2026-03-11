import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export interface LiveLessonWithId {
  id: string;
  classId: string;
  ownerId: string;
  title: string;
  scheduledAt: number;
  duration?: number;
  cohortIds?: string[];
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
      .finally(() => setLoading(false));
  }, [classId]);

  const createLiveLesson = async (data: Omit<LiveLessonWithId, "id">) => {
    if (!classId) throw new Error("No class");
    const ref = await addDoc(collection(db, "liveLessons"), {
      ...data,
      classId,
      createdAt: Date.now(),
    });
    setLessons((prev) => [...prev, { id: ref.id, ...data } as LiveLessonWithId]);
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

  const deleteLiveLesson = async (lessonId: string) => {
    await deleteDoc(doc(db, "liveLessons", lessonId));
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  return {
    lessons,
    loading,
    createLiveLesson,
    updateLiveLesson,
    deleteLiveLesson,
  };
}
