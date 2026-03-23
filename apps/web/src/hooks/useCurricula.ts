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
import type { Curriculum } from "@learning-scores/shared";
import { seedProgramTimeline } from "../lib/programTimelineFirestore";

export interface CurriculumWithId extends Curriculum {
  id: string;
}

export function useTeacherCurricula(teacherId: string | undefined) {
  const [curricula, setCurricula] = useState<CurriculumWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "curricula"),
      where("teacherId", "==", teacherId)
    );
    getDocs(q)
      .then((snap) => {
        const list: CurriculumWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CurriculumWithId[];
        list.sort(
          (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
        );
        setCurricula(list);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load curricula")
      )
      .finally(() => setLoading(false));
  }, [teacherId]);

  const createCurriculum = async (data: {
    name: string;
    description?: string;
    courseIds?: string[];
  }) => {
    if (!teacherId) throw new Error("Not authenticated");
    const now = Date.now();
    const payload = {
      teacherId,
      name: data.name,
      description: data.description ?? null,
      courseIds: data.courseIds ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(collection(db, "curricula"), payload);
    await seedProgramTimeline(db, {
      teacherId,
      scope: "curriculum",
      scopeId: ref.id,
      title: data.name,
    });
    setCurricula((prev) => [
      { id: ref.id, ...payload } as CurriculumWithId,
      ...prev,
    ]);
    return ref.id;
  };

  const updateCurriculum = async (
    curriculumId: string,
    data: Partial<Pick<Curriculum, "name" | "description" | "courseIds">>
  ) => {
    const update = { ...data, updatedAt: Date.now() };
    await updateDoc(doc(db, "curricula", curriculumId), update);
    setCurricula((prev) =>
      prev.map((c) => (c.id === curriculumId ? { ...c, ...update } : c))
    );
  };

  const deleteCurriculum = async (curriculumId: string) => {
    await deleteDoc(doc(db, "curricula", curriculumId));
    setCurricula((prev) => prev.filter((c) => c.id !== curriculumId));
  };

  return {
    curricula,
    loading,
    error,
    createCurriculum,
    updateCurriculum,
    deleteCurriculum,
  };
}
