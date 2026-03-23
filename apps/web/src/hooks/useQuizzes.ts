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
  deleteField,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Quiz, QuizQuestion, QuizAttempt } from "@learning-scores/shared";
import {
  encodeQuizAnswerKeyForFirestore,
  decodeQuizAnswerKeyFromFirestore,
} from "@learning-scores/shared";
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
      .catch((err) => {
        console.error("Failed to load quizzes:", err);
        setQuizzes([]);
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const createQuiz = async (
    data: Omit<Quiz, "id"> & { correctionMode?: Quiz["correctionMode"] },
    ownerId: string
  ) => {
    if (!classId) throw new Error("No class");
    const payload: Record<string, unknown> = {
      ...data,
      classId,
      ownerId,
      correctionMode: data.correctionMode ?? "auto",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (data.moduleId !== undefined) payload.moduleId = data.moduleId;
    if (data.lessonId !== undefined) payload.lessonId = data.lessonId;
    if (payload.moduleId === undefined) delete payload.moduleId;
    if (payload.lessonId === undefined) delete payload.lessonId;
    const ref = await addDoc(collection(db, "quizzes"), payload);
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

  const updateQuiz = async (
    data: Partial<
      Pick<Quiz, "title" | "correctionMode" | "printIdentifier" | "moduleId" | "lessonId">
    >
  ) => {
    if (!quizId || !quiz) throw new Error("No quiz");
    const update: Record<string, unknown> = { ...data, updatedAt: Date.now() };
    if (data.moduleId !== undefined)
      update.moduleId = data.moduleId === "" || data.moduleId == null ? deleteField() : data.moduleId;
    if (data.lessonId !== undefined)
      update.lessonId = data.lessonId === "" || data.lessonId == null ? deleteField() : data.lessonId;
    await updateDoc(doc(db, "quizzes", quizId), update);
    setQuiz((prev) => (prev ? { ...prev, ...data, updatedAt: Date.now() } : null));
  };

  return { quiz, loading, updateQuiz };
}

export type QuizQuestionWithId = QuizQuestion & { id: string };

/** Stable ordering: explicit `order` first, then document id for legacy rows. */
export function sortQuizQuestionsByOrder<T extends { id: string; order?: number }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}

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
            ? decodeQuizAnswerKeyFromFirestore(
                keySnap.data() as Record<string, unknown>
              )
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
    return sortQuizQuestionsByOrder(list);
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

    const ordered = sortQuizQuestionsByOrder(questions);
    const nextOrder =
      ordered.length === 0
        ? 0
        : Math.max(...ordered.map((q) => q.order ?? 0)) + 1;

    const ref = await addDoc(collection(db, "quizzes", quizId, "questions"), {
      ...rest,
      order: nextOrder,
      payload: sanitized,
    });

    if (answerKeyData) {
      await setDoc(
        doc(db, "quizzes", quizId, "answerKey", ref.id),
        encodeQuizAnswerKeyForFirestore(answerKeyData)
      );
    }

    const displayPayload = forTeacher
      ? mergeAnswerKeyIntoPayload(sanitized, answerKeyData)
      : sanitized;
    setQuestions((prev) =>
      sortQuizQuestionsByOrder([
        ...prev,
        { id: ref.id, ...rest, order: nextOrder, payload: displayPayload } as QuizQuestionWithId,
      ])
    );
  };

  const updateQuestion = async (
    questionId: string,
    data: Partial<Omit<QuizQuestion, "id">> & { mediaRef?: QuizQuestion["mediaRef"] | null }
  ) => {
    if (!quizId) throw new Error("No quiz");
    const payload = data.payload as Record<string, unknown> | undefined;
    let sanitized = payload;
    let answerKeyData: Record<string, unknown> | null = null;

    if (payload) {
      const questionType =
        data.type ??
        questions.find((x) => x.id === questionId)?.type ??
        "multipleChoiceSingle";
      sanitized = sanitizePayloadForStudent(payload, questionType);
      answerKeyData = extractAnswerKey(payload, questionType);
    }

    const updateData: Record<string, unknown> = { ...data };
    if (payload) {
      updateData.payload = sanitized;
    }
    if (data.mediaRef === null) {
      updateData.mediaRef = deleteField();
    }
    await updateDoc(
      doc(db, "quizzes", quizId, "questions", questionId),
      updateData
    );

    if (answerKeyData !== undefined) {
      if (answerKeyData) {
        await setDoc(
          doc(db, "quizzes", quizId, "answerKey", questionId),
          encodeQuizAnswerKeyForFirestore(answerKeyData)
        );
      } else {
        await deleteDoc(doc(db, "quizzes", quizId, "answerKey", questionId));
      }
    }

    const { mediaRef: patchMedia, ...restPatch } = data;

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              ...restPatch,
              ...(patchMedia === null
                ? { mediaRef: undefined }
                : patchMedia !== undefined
                  ? { mediaRef: patchMedia }
                  : {}),
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
    setQuestions((prev) => sortQuizQuestionsByOrder(prev.filter((q) => q.id !== questionId)));
  };

  const reorderQuestions = async (fromIndex: number, toIndex: number) => {
    if (!quizId || fromIndex === toIndex) return;
    const sorted = sortQuizQuestionsByOrder(questions);
    const reordered = [...sorted];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed!);
    const batch = writeBatch(db);
    reordered.forEach((q, i) => {
      batch.update(doc(db, "quizzes", quizId, "questions", q.id), { order: i });
    });
    await batch.commit();
    setQuestions(reordered.map((q, i) => ({ ...q, order: i })));
  };

  return {
    questions,
    loading,
    refetch,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
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
