import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { TeacherPlanItem } from "@learning-scores/shared";

export interface TeacherPlanItemWithId extends TeacherPlanItem {
  id: string;
}

function stripNulls<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

export function useTeacherPlanItems(liveLessonId: string | undefined) {
  const [items, setItems] = useState<TeacherPlanItemWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!liveLessonId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setItems([]);
    setLoading(true);
    setError(null);
    try {
      const colRef = collection(db, "liveLessons", liveLessonId, "teacherPlanItems");
      const snap = await getDocs(colRef);
      const list: TeacherPlanItemWithId[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          order: data.order ?? 0,
          title: data.title ?? "",
          lessonId: data.lessonId ?? undefined,
          externalUrl: data.externalUrl ?? undefined,
          notes: data.notes ?? undefined,
        };
      });
      list.sort((a, b) => a.order - b.order);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teaching plan");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [liveLessonId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const addItem = async (data: {
    title: string;
    lessonId?: string;
    externalUrl?: string;
    notes?: string;
  }) => {
    if (!liveLessonId) throw new Error("No live lesson");
    const colRef = collection(db, "liveLessons", liveLessonId, "teacherPlanItems");
    const payload = stripNulls({
      order: items.length,
      title: data.title.trim(),
      lessonId: data.lessonId?.trim(),
      externalUrl: data.externalUrl?.trim(),
      notes: data.notes?.trim(),
    });
    const ref = await addDoc(colRef, payload);
    setItems((prev) => [
      ...prev,
      {
        id: ref.id,
        order: items.length,
        title: data.title.trim(),
        lessonId: data.lessonId?.trim() || undefined,
        externalUrl: data.externalUrl?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
    ]);
  };

  const updateItem = async (
    itemId: string,
    data: Partial<Pick<TeacherPlanItemWithId, "title" | "lessonId" | "externalUrl" | "notes" | "order">>
  ) => {
    if (!liveLessonId) throw new Error("No live lesson");
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.order !== undefined) patch.order = data.order;
    if (data.lessonId !== undefined) patch.lessonId = data.lessonId || null;
    if (data.externalUrl !== undefined) patch.externalUrl = data.externalUrl || null;
    if (data.notes !== undefined) patch.notes = data.notes || null;
    await updateDoc(doc(db, "liveLessons", liveLessonId, "teacherPlanItems", itemId), patch);
    setItems((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, ...data } : i))
        .sort((a, b) => a.order - b.order)
    );
  };

  const removeItem = async (itemId: string) => {
    if (!liveLessonId) throw new Error("No live lesson");
    await deleteDoc(doc(db, "liveLessons", liveLessonId, "teacherPlanItems", itemId));
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const reorderItems = async (orderedIds: string[]) => {
    if (!liveLessonId) throw new Error("No live lesson");
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      batch.update(doc(db, "liveLessons", liveLessonId, "teacherPlanItems", id), {
        order: index,
      });
    });
    await batch.commit();
    setItems((prev) => {
      const byId = new Map(prev.map((i) => [i.id, i]));
      return orderedIds
        .map((id, index) => {
          const row = byId.get(id);
          return row ? { ...row, order: index } : null;
        })
        .filter((x): x is TeacherPlanItemWithId => x != null);
    });
  };

  return {
    items,
    loading,
    error,
    refetch,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
  };
}
