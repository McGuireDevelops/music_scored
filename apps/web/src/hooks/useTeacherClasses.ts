import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export interface Class {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
}

export function useTeacherClasses(uid: string | undefined) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    async function fetch() {
      try {
        const q = query(
          collection(db, "classes"),
          where("teacherId", "==", uid)
        );
        const snap = await getDocs(q);
        const list: Class[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? "Unnamed class",
            description: data.description,
            teacherId: data.teacherId ?? "",
          };
        });
        setClasses(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [uid]);

  return { classes, setClasses, loading, error };
}
