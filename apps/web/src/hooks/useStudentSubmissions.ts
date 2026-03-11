import { useState, useEffect } from "react";
import {
  collectionGroup,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Submission } from "@learning-scores/shared";

export interface SubmissionWithMeta extends Submission {
  id: string;
  assignmentTitle?: string;
}

export function useStudentSubmissions(userId: string | undefined) {
  const [submissions, setSubmissions] = useState<SubmissionWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const q = query(
      collectionGroup(db, "submissions"),
      where("userId", "==", userId)
    );
    getDocs(q)
      .then(async (snap) => {
        const list: SubmissionWithMeta[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            assignmentId: data.assignmentId,
            userId: data.userId,
            classId: data.classId,
            mediaRefs: data.mediaRefs,
            submittedAt: data.submittedAt,
          } as SubmissionWithMeta;
        });
        const assignmentIds = [...new Set(list.map((s) => s.assignmentId))];
        const titleMap: Record<string, string> = {};
        await Promise.all(
          assignmentIds.map(async (aid) => {
            const asnap = await getDoc(doc(db, "assignments", aid));
            titleMap[aid] = asnap.exists() ? asnap.data().title ?? "Assignment" : "Assignment";
          })
        );
        list.forEach((s) => {
          s.assignmentTitle = titleMap[s.assignmentId];
        });
        setSubmissions(list);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { submissions, loading };
}
