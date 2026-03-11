import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";

export interface Class {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
}

export function useStudentClasses(uid: string | undefined) {
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
        const grantsSnap = await getDocs(
          collection(db, "users", uid, "accessGrants")
        );
        const classIds = grantsSnap.docs
          .map((d) => d.id)
          .filter((id) => id);

        if (classIds.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const classDocs = await Promise.all(
          classIds.map((id) => getDoc(doc(db, "classes", id)))
        );

        const valid: Class[] = [];
        for (let i = 0; i < classIds.length; i++) {
          const d = classDocs[i];
          if (d.exists()) {
            const data = d.data();
            valid.push({
              id: d.id,
              name: data.name ?? "Unnamed class",
              description: data.description,
              teacherId: data.teacherId ?? "",
            });
          }
        }
        setClasses(valid);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [uid]);

  return { classes, loading, error };
}
