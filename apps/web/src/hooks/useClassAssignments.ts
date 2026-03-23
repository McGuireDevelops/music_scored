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
import type { Assignment } from "@learning-scores/shared";

export interface AssignmentWithId extends Assignment {
  id: string;
}

export function useClassAssignments(classId: string | undefined) {
  const [assignments, setAssignments] = useState<AssignmentWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "assignments"),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        const list: AssignmentWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AssignmentWithId[];
        setAssignments(list);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load assignments")
      )
      .finally(() => setLoading(false));
  }, [classId]);

  const createAssignment = async (
    data: Omit<Assignment, "id"> & { moduleId?: string; lessonId?: string },
    ownerId: string
  ) => {
    if (!classId) throw new Error("No class selected");
    const { moduleId, lessonId, ...rest } = data;
    const docData: Record<string, unknown> = {
      ...rest,
      moduleId: moduleId || "",
      classId,
      ownerId,
    };
    if (lessonId !== undefined) docData.lessonId = lessonId;
    const ref = await addDoc(collection(db, "assignments"), docData);
    setAssignments((prev) => [
      ...prev,
      { id: ref.id, ...data, classId, ownerId } as AssignmentWithId,
    ]);
    return ref.id;
  };

  const updateAssignment = async (
    assignmentId: string,
    data: Partial<Pick<AssignmentWithId, "title" | "brief" | "deadline" | "rubricId" | "lessonId">>
  ) => {
    await updateDoc(doc(db, "assignments", assignmentId), data);
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, ...data } : a))
    );
  };

  const deleteAssignment = async (assignmentId: string) => {
    await deleteDoc(doc(db, "assignments", assignmentId));
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  };

  return {
    assignments,
    loading,
    error,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
