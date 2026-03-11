import { useState, useEffect } from "react";
import { functions, httpsCallable } from "../firebase";
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
        const getLessons = httpsCallable<unknown, { lessons: TeacherLessonEnriched[] }>(
          functions,
          "getTeacherLessons"
        );
        const res = await getLessons({});
        if (cancelled) return;
        setLessons(res.data.lessons);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load lessons";
          const isPermissionDenied = typeof msg === "string" && msg.toLowerCase().includes("permission");
          setError(
            isPermissionDenied
              ? "Permission denied. Ensure your account has the teacher role. Contact an administrator."
              : msg
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

  const createLessonFn = httpsCallable<
    Record<string, unknown>,
    { id: string }
  >(functions, "createTeacherLesson");

  const updateLessonFn = httpsCallable<
    { lessonId: string; data: Record<string, unknown> },
    { success: boolean }
  >(functions, "updateTeacherLesson");

  const deleteLessonFn = httpsCallable<string, { success: boolean }>(
    functions,
    "deleteTeacherLesson"
  );

  const createLesson = async (
    data: Omit<Lesson, "id"> & { classId: string; moduleId: string },
    ownerId: string
  ) => {
    const payload = { ...data, classId: data.classId, moduleId: data.moduleId, ownerId };
    const res = await createLessonFn(payload);
    const newLesson: TeacherLessonEnriched = {
      id: res.data.id,
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
    await updateLessonFn({ lessonId, data });
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, ...data } : l))
    );
  };

  const deleteLesson = async (lessonId: string) => {
    await deleteLessonFn(lessonId);
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
