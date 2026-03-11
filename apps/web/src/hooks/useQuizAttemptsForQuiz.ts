import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { QuizAttempt } from "@learning-scores/shared";

export interface QuizAttemptWithId extends QuizAttempt {
  id: string;
}

export function useQuizAttemptsForQuiz(quizId: string | undefined) {
  const [attempts, setAttempts] = useState<QuizAttemptWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, "quizzes", quizId, "attempts"))
      .then((snap) => {
        setAttempts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttemptWithId))
        );
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  return { attempts, loading };
}
