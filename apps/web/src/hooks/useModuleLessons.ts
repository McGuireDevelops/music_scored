import { useState, useEffect, useCallback } from "react";
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
import {
  listManualReleasedStudentIds,
  setManualReleaseForStudent,
} from "../lib/progressionFirestore";

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

  const fetchLessons = useCallback(async (opts?: { silent?: boolean }) => {
    if (!moduleId || !classId) {
      setLessons([]);
      setLoading(false);
      return;
    }
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);
    const q = query(
      collection(db, "lessons"),
      where("classId", "==", classId),
      where("moduleId", "==", moduleId)
    );
    try {
      const snap = await getDocs(q);
      const list: LessonWithId[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LessonWithId[];
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setLessons(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lessons");
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [classId, moduleId]);

  useEffect(() => {
    void fetchLessons();
  }, [fetchLessons]);

  const createLesson = async (
    data: Omit<Lesson, "id">,
    ownerId: string
  ) => {
    if (!classId || !moduleId) throw new Error("No class/module selected");
    const payload = stripUndefined({ ...data, classId, moduleId, ownerId });
    const ref = await addDoc(collection(db, "lessons"), payload);
    const newLesson: LessonWithId = { id: ref.id, ...payload } as LessonWithId;
    setLessons((prev) => [...prev, newLesson].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return ref.id;
  };

  const updateLesson = async (
    lessonId: string,
    data: Partial<
      Pick<
        LessonWithId,
        | "title"
        | "content"
        | "type"
        | "order"
        | "mediaRefs"
        | "summary"
        | "progressionMode"
        | "availableFrom"
        | "autoInterval"
        | "autoAnchor"
        | "autoStartAt"
        | "manualReleasedToClass"
      >
    > &
      Record<string, unknown>,
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
    await fetchLessons({ silent: true });
  };

  const deleteLesson = async (lessonId: string) => {
    await deleteDoc(doc(db, "lessons", lessonId));
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  const listLessonManualReleasedStudents = useCallback(
    (lessonId: string) => listManualReleasedStudentIds("lessons", lessonId),
    []
  );

  const setLessonManualStudentRelease = useCallback(
    async (lessonId: string, studentId: string, released: boolean) => {
      await setManualReleaseForStudent("lessons", lessonId, studentId, released);
    },
    []
  );

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
    refetchLessons: fetchLessons,
    listLessonManualReleasedStudents,
    setLessonManualStudentRelease,
  };
}
