import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  addDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Quiz } from "@learning-scores/shared";

export interface TeacherQuizWithId extends Quiz {
  id: string;
}

export interface TeacherQuizEnriched extends TeacherQuizWithId {
  className?: string;
}

export function useTeacherQuizzes(teacherId: string | undefined) {
  const [quizzes, setQuizzes] = useState<TeacherQuizEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setQuizzes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchQuizzes() {
      setLoading(true);
      setError(null);

      try {
        const quizzesSnap = await getDocs(
          query(
            collection(db, "quizzes"),
            where("ownerId", "==", teacherId)
          )
        );

        if (cancelled) return;

        const quizList: TeacherQuizWithId[] = quizzesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TeacherQuizWithId[];

        const classIds = [...new Set(quizList.map((q) => q.classId))];
        const classesMap = new Map<string, string>();

        for (const cid of classIds) {
          if (!cid) continue;
          const classSnap = await getDoc(doc(db, "classes", cid));
          if (cancelled) return;
          if (classSnap.exists()) {
            classesMap.set(cid, classSnap.data().name ?? "Class");
          }
        }

        const enriched: TeacherQuizEnriched[] = quizList.map((q) => ({
          ...q,
          className: q.classId ? classesMap.get(q.classId) : undefined,
        }));

        setQuizzes(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load quizzes"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuizzes();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  const createQuiz = async (
    data: Omit<Quiz, "id"> & { classId: string },
    ownerId: string
  ) => {
    const ref = await addDoc(collection(db, "quizzes"), {
      ...data,
      classId: data.classId,
      ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const newQuiz: TeacherQuizEnriched = {
      id: ref.id,
      ...data,
      ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      className: undefined,
    } as TeacherQuizEnriched;
    setQuizzes((prev) => [...prev, newQuiz]);
  };

  return {
    quizzes,
    loading,
    error,
    createQuiz,
  };
}
