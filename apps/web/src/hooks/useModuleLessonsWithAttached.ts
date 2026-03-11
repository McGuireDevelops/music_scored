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
import type { LessonWithId } from "./useModuleLessons";
import { useModuleLessons } from "./useModuleLessons";

export interface AttachedLessonItem {
  id: string;
  lesson: LessonWithId;
  placementId: string;
  order: number;
  linkType: "attached";
}

export type ModuleLessonItem =
  | { type: "owned"; id: string; lesson: LessonWithId; order: number }
  | AttachedLessonItem;

/**
 * Extends useModuleLessons to include attached lessons from other courses.
 * Returns merged list of owned + attached, sorted by order.
 */
export function useModuleLessonsWithAttached(
  classId: string | undefined,
  moduleId: string | undefined
) {
  const base = useModuleLessons(classId, moduleId);
  const [attachedItems, setAttachedItems] = useState<AttachedLessonItem[]>([]);
  const [attachedLoading, setAttachedLoading] = useState(true);

  useEffect(() => {
    if (!moduleId || !classId) {
      setAttachedItems([]);
      setAttachedLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAttached() {
      try {
        const placementsSnap = await getDocs(
          query(
            collection(db, "lessonPlacements"),
            where("moduleId", "==", moduleId),
            where("classId", "==", classId),
            where("linkType", "==", "attached")
          )
        );

        if (cancelled) return;

        const items: AttachedLessonItem[] = [];
        for (const d of placementsSnap.docs) {
          const data = d.data();
          const sourceLessonId = data.sourceLessonId;
          const sourceClassId = data.sourceClassId;
          if (!sourceLessonId || !sourceClassId) continue;

          const lessonSnap = await getDoc(doc(db, "lessons", sourceLessonId));
          if (cancelled) return;
          if (!lessonSnap.exists()) continue;

          const lessonData = lessonSnap.data();
          items.push({
            id: `attached-${d.id}`,
            lesson: { id: lessonSnap.id, ...lessonData } as LessonWithId,
            placementId: d.id,
            order: data.order ?? 999,
            linkType: "attached",
          });
        }

        items.sort((a, b) => a.order - b.order);
        setAttachedItems(items);
      } catch (err) {
        console.error("Failed to fetch attached lessons:", err);
        if (!cancelled) setAttachedItems([]);
      } finally {
        if (!cancelled) setAttachedLoading(false);
      }
    }

    fetchAttached();
    return () => {
      cancelled = true;
    };
  }, [moduleId, classId]);

  const allItems: ModuleLessonItem[] = [
    ...base.lessons.map((l) => ({
      type: "owned" as const,
      id: l.id,
      lesson: l as LessonWithId,
      order: l.order ?? 999,
    })),
    ...attachedItems,
  ].sort((a, b) => a.order - b.order);

  const attachLesson = async (
    sourceLessonId: string,
    sourceClassId: string
  ): Promise<void> => {
    if (!classId || !moduleId) throw new Error("No class/module selected");

    const maxOrder = Math.max(
      ...allItems.map((i) => i.order),
      -1
    );

    await addDoc(collection(db, "lessonPlacements"), {
      moduleId,
      classId,
      order: maxOrder + 1,
      linkType: "attached",
      sourceLessonId,
      sourceClassId,
    });

    // Refetch attached (could optimistically add)
    const placementsSnap = await getDocs(
      query(
        collection(db, "lessonPlacements"),
        where("moduleId", "==", moduleId),
        where("classId", "==", classId),
        where("linkType", "==", "attached")
      )
    );

    const items: AttachedLessonItem[] = [];
    for (const d of placementsSnap.docs) {
      const data = d.data();
      const slId = data.sourceLessonId;
      const scId = data.sourceClassId;
      if (!slId || !scId) continue;
      const lessonSnap = await getDoc(doc(db, "lessons", slId));
      if (!lessonSnap.exists()) continue;
      const lessonData = lessonSnap.data();
      items.push({
        id: `attached-${d.id}`,
        lesson: { id: lessonSnap.id, ...lessonData } as LessonWithId,
        placementId: d.id,
        order: data.order ?? 999,
        linkType: "attached",
      });
    }
    items.sort((a, b) => a.order - b.order);
    setAttachedItems(items);
  };

  return {
    ...base,
    loading: base.loading || attachedLoading,
    lessons: base.lessons,
    allItems,
    attachLesson,
  };
}
