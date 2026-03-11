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
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Quiz, QuizQuestion, QuizAttempt } from "@learning-scores/shared";
import {
  sanitizePayloadForStudent,
  extractAnswerKey,
  mergeAnswerKeyIntoPayload,
} from "../utils/quizAnswerKey";

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

  const createQuiz = async (
    data: Omit<Quiz, "id"> & { correctionMode?: Quiz["correctionMode"] },
    ownerId: string
  ) => {
    if (!classId) throw new Error("No class");
    const ref = await addDoc(collection(db, "quizzes"), {
      ...data,
      classId,
      ownerId,
      correctionMode: data.correctionMode ?? "auto",
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

export function useQuiz(quizId: string | undefined) {
  const [quiz, setQuiz] = useState<(Quiz & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    getDoc(doc(db, "quizzes", quizId))
      .then((snap) => {
        setQuiz(snap.exists() ? { id: snap.id, ...snap.data() } as Quiz & { id: string } : null);
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  const updateQuiz = async (data: Partial<Pick<Quiz, "title" | "correctionMode" | "printIdentifier">>) => {
    if (!quizId || !quiz) throw new Error("No quiz");
    await updateDoc(doc(db, "quizzes", quizId), {
      ...data,
      updatedAt: Date.now(),
    });
    setQuiz((prev) => (prev ? { ...prev, ...data, updatedAt: Date.now() } : null));
  };

  return { quiz, loading, updateQuiz };
}

export type QuizQuestionWithId = QuizQuestion & { id: string };

export interface UseQuizQuestionsOptions {
  /** When true, strip correct answers (for students) */
  forStudent?: boolean;
  /** When true, fetch answerKey and merge (for teachers editing) */
  forTeacher?: boolean;
}

export function useQuizQuestions(
  quizId: string | undefined,
  options: UseQuizQuestionsOptions = {}
) {
  const { forStudent = false, forTeacher = false } = options;
  const [questions, setQuestions] = useState<QuizQuestionWithId[]>([]);
  const [loading, setLoading] = useState(true);

  const processQuestions = async (
    snap: Awaited<ReturnType<typeof getDocs>>
  ): Promise<QuizQuestionWithId[]> => {
    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizQuestionWithId));
    if (forStudent) {
      list = list.map((q) => ({
        ...q,
        payload: sanitizePayloadForStudent(
          q.payload as Record<string, unknown>,
          q.type
        ) as QuizQuestion["payload"],
      }));
    } else if (forTeacher) {
      const merged = await Promise.all(
        list.map(async (q) => {
          const keySnap = await getDoc(
            doc(db, "quizzes", quizId!, "answerKey", q.id)
          );
          const answerKey = keySnap.exists()
            ? (keySnap.data() as Record<string, unknown>)
            : null;
          return {
            ...q,
            payload: mergeAnswerKeyIntoPayload(
              q.payload as Record<string, unknown>,
              answerKey
            ) as QuizQuestion["payload"],
          };
        })
      );
      list = merged;
    }
    return list;
  };

  const refetch = async () => {
    if (!quizId) return;
    const snap = await getDocs(collection(db, "quizzes", quizId, "questions"));
    setQuestions(await processQuestions(snap));
  };

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, "quizzes", quizId, "questions"))
      .then((snap) => processQuestions(snap))
      .then(setQuestions)
      .finally(() => setLoading(false));
  }, [quizId, forStudent, forTeacher]);

  const addQuestion = async (
    data: Omit<QuizQuestion, "id"> & { id?: string }
  ) => {
    if (!quizId) throw new Error("No quiz");
    const { id: _ignored, ...rest } = data;
    const payload = rest.payload as Record<string, unknown>;
    const sanitized = sanitizePayloadForStudent(payload, rest.type);
    const answerKeyData = extractAnswerKey(payload, rest.type);

    const ref = await addDoc(collection(db, "quizzes", quizId, "questions"), {
      ...rest,
      payload: sanitized,
    });

    if (answerKeyData) {
      await setDoc(
        doc(db, "quizzes", quizId, "answerKey", ref.id),
        answerKeyData
      );
    }

    const displayPayload = forTeacher
      ? mergeAnswerKeyIntoPayload(sanitized, answerKeyData)
      : sanitized;
    setQuestions((prev) => [
      ...prev,
      { id: ref.id, ...rest, payload: displayPayload } as QuizQuestionWithId,
    ]);
  };

  const updateQuestion = async (
    questionId: string,
    data: Partial<Omit<QuizQuestion, "id">>
  ) => {
    if (!quizId) throw new Error("No quiz");
    const payload = data.payload as Record<string, unknown> | undefined;
    let sanitized = payload;
    let answerKeyData: Record<string, unknown> | null = null;

    if (payload) {
      sanitized = sanitizePayloadForStudent(
        payload,
        (data.type ?? payload) as QuizQuestion["type"]
      );
      answerKeyData = extractAnswerKey(
        payload,
        (data.type ?? "multipleChoiceSingle") as string
      );
    }

    const updateData = payload
      ? { ...data, payload: sanitized }
      : data;
    await updateDoc(
      doc(db, "quizzes", quizId, "questions", questionId),
      updateData
    );

    if (answerKeyData !== undefined) {
      if (answerKeyData) {
        await setDoc(
          doc(db, "quizzes", quizId, "answerKey", questionId),
          answerKeyData
        );
      } else {
        await deleteDoc(doc(db, "quizzes", quizId, "answerKey", questionId));
      }
    }

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              ...data,
              payload: payload
                ? (forTeacher && answerKeyData
                    ? mergeAnswerKeyIntoPayload(sanitized!, answerKeyData)
                    : sanitized)
                : q.payload,
            }
          : q
      )
    );
  };

  const deleteQuestion = async (questionId: string) => {
    if (!quizId) throw new Error("No quiz");
    await deleteDoc(doc(db, "quizzes", quizId, "questions", questionId));
    await deleteDoc(doc(db, "quizzes", quizId, "answerKey", questionId));
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
