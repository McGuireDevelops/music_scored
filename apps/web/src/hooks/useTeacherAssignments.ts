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
import type { Assignment } from "@learning-scores/shared";

export interface TeacherAssignmentWithId extends Assignment {
  id: string;
}

export interface TeacherAssignmentEnriched extends TeacherAssignmentWithId {
  className?: string;
}

export function useTeacherAssignments(teacherId: string | undefined) {
  const [assignments, setAssignments] = useState<TeacherAssignmentEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAssignments() {
      setLoading(true);
      setError(null);

      try {
        const assignmentsSnap = await getDocs(
          query(
            collection(db, "assignments"),
            where("ownerId", "==", teacherId)
          )
        );

        if (cancelled) return;

        const assignmentList: TeacherAssignmentWithId[] = assignmentsSnap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data(),
          })
        ) as TeacherAssignmentWithId[];

        const classIds = [...new Set(assignmentList.map((a) => a.classId))];
        const classesMap = new Map<string, string>();

        for (const cid of classIds) {
          if (!cid) continue;
          const classSnap = await getDoc(doc(db, "classes", cid));
          if (cancelled) return;
          if (classSnap.exists()) {
            classesMap.set(cid, classSnap.data().name ?? "Class");
          }
        }

        const enriched: TeacherAssignmentEnriched[] = assignmentList.map((a) => ({
          ...a,
          className: a.classId ? classesMap.get(a.classId) : undefined,
        }));

        setAssignments(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load assignments"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAssignments();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  const createAssignment = async (
    data: Omit<Assignment, "id"> & { classId: string; moduleId?: string },
    ownerId: string
  ) => {
    const { moduleId, ...rest } = data;
    const ref = await addDoc(collection(db, "assignments"), {
      ...rest,
      moduleId: moduleId ?? "",
      classId: data.classId,
      ownerId,
    });
    const newAssignment: TeacherAssignmentEnriched = {
      id: ref.id,
      ...data,
      moduleId: moduleId ?? "",
      ownerId,
      className: undefined,
    } as TeacherAssignmentEnriched;
    setAssignments((prev) => [...prev, newAssignment]);
  };

  const updateAssignment = async (
    assignmentId: string,
    data: Partial<Pick<TeacherAssignmentWithId, "title" | "brief" | "deadline" | "rubricId">>
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
