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
import type { Rubric, RubricAxis, Criterion, PartialSatisfactionLevel } from "@learning-scores/shared";

export interface RubricWithId extends Rubric {
  id: string;
}

export function useRubrics(ownerId: string | undefined) {
  const [rubrics, setRubrics] = useState<RubricWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "rubrics"),
      where("ownerId", "==", ownerId)
    );
    getDocs(q)
      .then((snap) => {
        setRubrics(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as RubricWithId))
        );
      })
      .finally(() => setLoading(false));
  }, [ownerId]);

  const createRubric = async (data: {
    name: string;
    axes: RubricAxis[];
  }) => {
    if (!ownerId) throw new Error("No user");
    const ref = await addDoc(collection(db, "rubrics"), {
      name: data.name,
      ownerId,
      axes: data.axes,
      version: 1,
      editHistory: [],
    });
    setRubrics((prev) => [
      ...prev,
      {
        id: ref.id,
        name: data.name,
        ownerId,
        axes: data.axes,
        version: 1,
        editHistory: [],
      } as RubricWithId,
    ]);
  };

  const updateRubric = async (
    rubricId: string,
    data: Partial<Pick<RubricWithId, "name" | "axes" | "version">>
  ) => {
    await updateDoc(doc(db, "rubrics", rubricId), data);
    setRubrics((prev) =>
      prev.map((r) => (r.id === rubricId ? { ...r, ...data } : r))
    );
  };

  const deleteRubric = async (rubricId: string) => {
    await deleteDoc(doc(db, "rubrics", rubricId));
    setRubrics((prev) => prev.filter((r) => r.id !== rubricId));
  };

  return { rubrics, loading, createRubric, updateRubric, deleteRubric };
}

export function createDefaultCriterion(id: string): Criterion {
  return {
    id,
    description: "",
    partialSatisfactionLevels: [
      { id: "not-met", label: "Not met", description: "Does not meet expectations" },
      { id: "partial", label: "Partial", description: "Partially meets expectations" },
      { id: "met", label: "Met", description: "Fully meets expectations" },
    ],
  };
}

export function createDefaultAxis(id: string): RubricAxis {
  return {
    id,
    name: "New axis",
    criteria: [createDefaultCriterion(`criterion-${Date.now()}`)],
  };
}
