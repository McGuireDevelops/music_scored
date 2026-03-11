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
import type { Module, ModuleReleaseMode } from "@learning-scores/shared";

export interface ModuleWithId extends Module {
  id: string;
}

export function useClassModules(classId: string | undefined) {
  const [modules, setModules] = useState<ModuleWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "modules"),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        const list: ModuleWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ModuleWithId[];
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setModules(list);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load modules"))
      .finally(() => setLoading(false));
  }, [classId]);

  const createModule = async (data: {
    name: string;
    releaseMode: ModuleReleaseMode;
    releasedAt?: number;
    order?: number;
  }) => {
    if (!classId) throw new Error("No class selected");
    const ref = await addDoc(collection(db, "modules"), {
      classId,
      name: data.name,
      releaseMode: data.releaseMode,
      releasedAt: data.releasedAt ?? null,
      order: data.order ?? modules.length,
    });
    setModules((prev) => [
      ...prev,
      {
        id: ref.id,
        classId,
        name: data.name,
        releaseMode: data.releaseMode,
        releasedAt: data.releasedAt,
        order: data.order ?? modules.length,
      } as ModuleWithId,
    ]);
  };

  const updateModule = async (
    moduleId: string,
    data: Partial<Pick<ModuleWithId, "name" | "releaseMode" | "releasedAt" | "order" | "documentRefs">>
  ) => {
    await updateDoc(doc(db, "modules", moduleId), data);
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, ...data } : m))
    );
  };

  const deleteModule = async (moduleId: string) => {
    await deleteDoc(doc(db, "modules", moduleId));
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  };

  return {
    modules,
    loading,
    error,
    createModule,
    updateModule,
    deleteModule,
  };
}
