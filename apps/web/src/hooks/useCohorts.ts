import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export interface CohortWithId {
  id: string;
  name: string;
  limit?: number;
}

export function useClassCohorts(classId: string | undefined) {
  const [cohorts, setCohorts] = useState<CohortWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, "classes", classId, "cohorts"))
      .then((snap) => {
        setCohorts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as CohortWithId))
        );
      })
      .catch((err) => {
        console.error("Failed to load cohorts:", err);
        setCohorts([]);
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const createCohort = async (data: Omit<CohortWithId, "id">) => {
    if (!classId) throw new Error("No class");
    const ref = await addDoc(collection(db, "classes", classId, "cohorts"), data);
    setCohorts((prev) => [...prev, { id: ref.id, ...data }]);
  };

  const updateCohort = async (
    cohortId: string,
    data: Partial<Omit<CohortWithId, "id">>
  ) => {
    await updateDoc(doc(db, "classes", classId!, "cohorts", cohortId), data);
    setCohorts((prev) =>
      prev.map((c) => (c.id === cohortId ? { ...c, ...data } : c))
    );
  };

  const deleteCohort = async (cohortId: string) => {
    await deleteDoc(doc(db, "classes", classId!, "cohorts", cohortId));
    setCohorts((prev) => prev.filter((c) => c.id !== cohortId));
  };

  return {
    cohorts,
    loading,
    createCohort,
    updateCohort,
    deleteCohort,
  };
}
