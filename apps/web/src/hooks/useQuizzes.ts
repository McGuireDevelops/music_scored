import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Quiz, QuizQuestion, QuizAttempt, QuizAttemptAnswer } from "@learning-scores/shared";

export interface QuizWithId extends Quiz {
  id: string;
}

export function useClassQuizzes(classId: string | undefined) {
  const [quizzes, setQuizzes] = useState<QuizWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "quizzes"),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        setQuizzes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizWithId))
        );
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const createQuiz = async (data: Omit<Quiz, "id">, ownerId: string) => {
    if (!classId) throw new Error("No class");
    const ref = await addDoc(collection(db, "quizzes"), {
      ...data,
      classId,
      ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setQuizzes((prev) => [
      ...prev,
      {
        id: ref.id,
        ...data,
        classId,
        ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as QuizWithId,
    ]);
  };

  return { quizzes, loading, createQuiz };
}

export function useQuizQuestions(quizId: string | undefined) {
  const [questions, setQuestions] = useState<(QuizQuestion & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, "quizzes", quizId, "questions"))
      .then((snap) => {
        setQuestions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizQuestion & { id: string }))
        );
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  return { questions, loading };
}

export function useQuizAttempt(quizId: string | undefined, userId: string | undefined) {
  const [attempt, setAttempt] = useState<(QuizAttempt & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId || !userId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "quizzes", quizId, "attempts"),
      where("userId", "==", userId)
    );
    getDocs(q)
      .then((snap) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          setAttempt({ id: d.id, ...d.data() } as QuizAttempt & { id: string });
        } else setAttempt(null);
      })
      .finally(() => setLoading(false));
  }, [quizId, userId]);

  return { attempt, loading };
}
