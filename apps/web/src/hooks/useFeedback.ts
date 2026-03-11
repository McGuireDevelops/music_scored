import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Feedback, FeedbackCriterionResult } from "@learning-scores/shared";

export interface FeedbackWithId extends Feedback {
  id: string;
}

export function useSubmissionFeedback(
  submissionId: string | undefined,
  userId: string | undefined
) {
  const [feedback, setFeedback] = useState<FeedbackWithId | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    if (!submissionId || !userId) return;
    const q = query(
      collection(db, "feedback"),
      where("submissionId", "==", submissionId)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.filter(
      (d) => d.data().userId === userId || d.data().teacherId === userId
    );
    if (docs.length > 0)
      setFeedback({
        id: docs[0].id,
        ...docs[0].data(),
      } as FeedbackWithId);
    else setFeedback(null);
  };

  useEffect(() => {
    if (!submissionId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchFeedback().finally(() => setLoading(false));
  }, [submissionId, userId]);

  return { feedback, loading, refetch: fetchFeedback };
}

export function useCreateFeedback() {
  const [creating, setCreating] = useState(false);

  const createFeedback = async (data: {
    userId: string;
    teacherId: string;
    submissionId: string;
    assignmentId: string;
    rubricId: string;
    criterionResults: FeedbackCriterionResult[];
    comment?: string;
  }) => {
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, "feedback"), {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return ref.id;
    } finally {
      setCreating(false);
    }
  };

  return { createFeedback, creating };
}
