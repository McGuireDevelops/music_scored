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

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
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

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Must filter by classId as well as moduleId: Firestore rules allow read when
    // ownerId matches or ownsClass(classId), etc. A moduleId-only query does not
    // guarantee those hold for every possible matching doc, so list requests can fail
    // or omit documents; classId + moduleId aligns the query with ownsClass(classId).
    const q = query(
      collection(db, "lessons"),
      where("classId", "==", classId),
      where("moduleId", "==", moduleId)
    );
    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        const list: LessonWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LessonWithId[];
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setLessons(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load lessons");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, moduleId]);

  const createLesson = async (
    data: Omit<Lesson, "id">,
    ownerId: string
  ) => {
    if (!classId || !moduleId) throw new Error("No class/module selected");
    const payload = stripUndefined({ ...data, classId, moduleId, ownerId });
    const ref = await addDoc(collection(db, "lessons"), payload);
    const newLesson: LessonWithId = { id: ref.id, ...payload } as LessonWithId;
    setLessons((prev) => [...prev, newLesson].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  };

  const updateLesson = async (
    lessonId: string,
    data: Partial<Pick<LessonWithId, "title" | "content" | "type" | "order" | "mediaRefs" | "summary">>,
    updateMode?: "push" | "newVersion"
  ) => {
    const cleanData = stripUndefined({ ...data });
    if (updateMode === "newVersion") {
      const lessonSnap = await getDoc(doc(db, "lessons", lessonId));
      if (lessonSnap.exists()) {
        const current = lessonSnap.data();
        const version = (current.version ?? 0) + 1;
        await addDoc(
          collection(db, "lessons", lessonId, "lessonVersions"),
          stripUndefined({
            version,
            title: current.title,
            content: current.content,
            summary: current.summary,
            mediaRefs: current.mediaRefs,
            timestamp: Date.now(),
          })
        );
        await updateDoc(doc(db, "lessons", lessonId), {
          ...cleanData,
          version,
        });
      } else {
        await updateDoc(doc(db, "lessons", lessonId), cleanData);
      }
    } else {
      await updateDoc(doc(db, "lessons", lessonId), cleanData);
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
