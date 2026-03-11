import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
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

export type QuizQuestionWithId = QuizQuestion & { id: string };

export function useQuizQuestions(quizId: string | undefined) {
  const [questions, setQuestions] = useState<QuizQuestionWithId[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    if (!quizId) return;
    getDocs(collection(db, "quizzes", quizId, "questions")).then((snap) => {
      setQuestions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizQuestionWithId))
      );
    });
  };

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, "quizzes", quizId, "questions"))
      .then((snap) => {
        setQuestions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizQuestionWithId))
        );
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  const addQuestion = async (
    data: Omit<QuizQuestion, "id"> & { id?: string }
  ) => {
    if (!quizId) throw new Error("No quiz");
    const { id: _ignored, ...rest } = data;
    const ref = await addDoc(
      collection(db, "quizzes", quizId, "questions"),
      rest
    );
    setQuestions((prev) => [
      ...prev,
      { id: ref.id, ...rest } as QuizQuestionWithId,
    ]);
  };

  const updateQuestion = async (
    questionId: string,
    data: Partial<Omit<QuizQuestion, "id">>
  ) => {
    if (!quizId) throw new Error("No quiz");
    await updateDoc(
      doc(db, "quizzes", quizId, "questions", questionId),
      data
    );
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...data } : q))
    );
  };

  const deleteQuestion = async (questionId: string) => {
    if (!quizId) throw new Error("No quiz");
    await deleteDoc(doc(db, "quizzes", quizId, "questions", questionId));
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  return {
    questions,
    loading,
    refetch,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  };
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
