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
import type { Lesson } from "@learning-scores/shared";

export interface LessonWithId extends Lesson {
  id: string;
}

export function useModuleLessons(
  classId: string | undefined,
  moduleId: string | undefined
) {
  const [lessons, setLessons] = useState<LessonWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moduleId || !classId) {
      setLessons([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "lessons"),
      where("moduleId", "==", moduleId)
    );
    getDocs(q)
      .then((snap) => {
        const list: LessonWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LessonWithId[];
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setLessons(list);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load lessons")
      )
      .finally(() => setLoading(false));
  }, [classId, moduleId]);

  const createLesson = async (
    data: Omit<Lesson, "id">,
    ownerId: string
  ) => {
    if (!classId || !moduleId) throw new Error("No class/module selected");
    const ref = await addDoc(collection(db, "lessons"), {
      ...data,
      classId,
      moduleId,
      ownerId,
    });
    setLessons((prev) => [
      ...prev,
      { id: ref.id, ...data, classId, moduleId, ownerId } as LessonWithId,
    ]);
  };

  const updateLesson = async (
    lessonId: string,
    data: Partial<Pick<LessonWithId, "title" | "content" | "type" | "order" | "mediaRefs">>
  ) => {
    await updateDoc(doc(db, "lessons", lessonId), data);
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, ...data } : l))
    );
  };

  const deleteLesson = async (lessonId: string) => {
    await deleteDoc(doc(db, "lessons", lessonId));
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  return {
    lessons,
    loading,
    error,
    createLesson,
    updateLesson,
    deleteLesson,
  };
}
