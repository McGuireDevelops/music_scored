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
} from "firebase/firestore";
import { db } from "../firebase";
import type { Lesson } from "@learning-scores/shared";

export interface TeacherLessonWithId extends Lesson {
  id: string;
}

export interface TeacherLessonEnriched extends TeacherLessonWithId {
  moduleName?: string;
  className?: string;
}

export function useTeacherLessons(teacherId: string | undefined) {
  const [lessons, setLessons] = useState<TeacherLessonEnriched[]>([]);
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
        const lessonsSnap = await getDocs(
          query(
            collection(db, "lessons"),
            where("ownerId", "==", teacherId)
          )
        );

        if (cancelled) return;

        const lessonList: TeacherLessonWithId[] = lessonsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TeacherLessonWithId[];

        lessonList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const moduleIds = [...new Set(lessonList.map((l) => l.moduleId))];
        const classIds = [...new Set(lessonList.map((l) => l.classId))];

        const modulesMap = new Map<string, string>();
        const classesMap = new Map<string, string>();

        for (const mid of moduleIds) {
          if (!mid) continue;
          const modSnap = await getDoc(doc(db, "modules", mid));
          if (cancelled) return;
          if (modSnap.exists()) {
            modulesMap.set(mid, modSnap.data().name ?? "Module");
          }
        }

        for (const cid of classIds) {
          if (!cid) continue;
          const classSnap = await getDoc(doc(db, "classes", cid));
          if (cancelled) return;
          if (classSnap.exists()) {
            classesMap.set(cid, classSnap.data().name ?? "Class");
          }
        }

        const enriched: TeacherLessonEnriched[] = lessonList.map((l) => ({
          ...l,
          moduleName: l.moduleId ? modulesMap.get(l.moduleId) : undefined,
          className: l.classId ? classesMap.get(l.classId) : undefined,
        }));

        setLessons(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load lessons"
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

  const createLesson = async (
    data: Omit<Lesson, "id"> & { classId: string; moduleId: string },
    ownerId: string
  ) => {
    const ref = await addDoc(collection(db, "lessons"), {
      ...data,
      classId: data.classId,
      moduleId: data.moduleId,
      ownerId,
    });
    const newLesson: TeacherLessonEnriched = {
      id: ref.id,
      ...data,
      ownerId,
      moduleName: undefined,
      className: undefined,
    } as TeacherLessonEnriched;
    setLessons((prev) => [...prev, newLesson]);
  };

  const updateLesson = async (
    lessonId: string,
    data: Partial<Pick<TeacherLessonWithId, "title" | "content" | "type" | "order" | "mediaRefs">>
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
