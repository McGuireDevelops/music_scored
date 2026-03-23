import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export interface EnrollmentWithId {
  id: string; // userId
  userId: string;
  cohortId?: string;
  status: string;
  enrolledAt?: number;
  updatedAt?: number;
}

export function useClassEnrollments(classId: string | undefined) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, "classes", classId, "enrollments"))
      .then((snap) => {
        setEnrollments(
          snap.docs.map((d) => ({
            id: d.id,
            userId: d.id,
            ...d.data(),
          } as EnrollmentWithId))
        );
      })
      .catch((err) => {
        console.error("Failed to load enrollments:", err);
        setEnrollments([]);
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const addEnrollment = async (
    userId: string,
    cohortId?: string,
    status = "enrolled"
  ) => {
    if (!classId) throw new Error("No class");
    const ref = doc(db, "classes", classId, "enrollments", userId);
    const snap = await getDoc(ref);
    const now = Date.now();
    const prevData = snap.exists() ? snap.data() : null;
    const enrolledAt = !snap.exists()
      ? now
      : prevData?.enrolledAt != null
        ? prevData.enrolledAt
        : prevData?.updatedAt ?? now;

    await setDoc(
      ref,
      {
        userId,
        cohortId: cohortId || null,
        status,
        updatedAt: now,
        enrolledAt,
      },
      { merge: true }
    );
    setEnrollments((prev) => {
      const existing = prev.find((e) => e.userId === userId);
      if (existing) {
        return prev.map((e) =>
          e.userId === userId
            ? { ...e, cohortId, status, enrolledAt, updatedAt: now }
            : e
        );
      }
      return [...prev, { id: userId, userId, cohortId, status, enrolledAt, updatedAt: now }];
    });
  };

  const removeEnrollment = async (userId: string) => {
    if (!classId) throw new Error("No class");
    const ref = doc(db, "classes", classId, "enrollments", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await deleteDoc(ref);
    }
    setEnrollments((prev) => prev.filter((e) => e.userId !== userId));
  };

  return {
    enrollments,
    loading,
    addEnrollment,
    removeEnrollment,
  };
}
