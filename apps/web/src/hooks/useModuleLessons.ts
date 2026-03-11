import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
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
    data: Partial<Pick<LessonWithId, "title" | "content" | "type" | "order" | "mediaRefs" | "summary">>,
    updateMode?: "push" | "newVersion"
  ) => {
    if (updateMode === "newVersion") {
      const lessonSnap = await getDoc(doc(db, "lessons", lessonId));
      if (lessonSnap.exists()) {
        const current = lessonSnap.data();
        const version = (current.version ?? 0) + 1;
        await addDoc(
          collection(db, "lessons", lessonId, "lessonVersions"),
          {
            version,
            title: current.title,
            content: current.content,
            summary: current.summary,
            mediaRefs: current.mediaRefs,
            timestamp: Date.now(),
          }
        );
        await updateDoc(doc(db, "lessons", lessonId), {
          ...data,
          version,
        });
      } else {
        await updateDoc(doc(db, "lessons", lessonId), data);
      }
    } else {
      await updateDoc(doc(db, "lessons", lessonId), data);
    }
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, ...data } : l))
    );
  };

  const deleteLesson = async (lessonId: string) => {
    await deleteDoc(doc(db, "lessons", lessonId));
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  const reorderLessons = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = [...lessons];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const batch = writeBatch(db);
    reordered.forEach((l, i) => {
      batch.update(doc(db, "lessons", l.id), { order: i });
    });
    await batch.commit();
    setLessons(reordered);
  };

  return {
    lessons,
    loading,
    error,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
  };
}
