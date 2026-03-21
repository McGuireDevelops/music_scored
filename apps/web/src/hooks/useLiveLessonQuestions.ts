import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { ClassQuestion, ClassQuestionStatus } from "@learning-scores/shared";
import { CLASS_QUESTION_TEXT_MAX_LENGTH } from "@learning-scores/shared";

export type ClassQuestionWithId = ClassQuestion & { id: string };

export function useLiveLessonQuestions(lessonId: string | undefined) {
  const [questions, setQuestions] = useState<ClassQuestionWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lessonId) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "liveLessons", lessonId, "classQuestions"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setQuestions(
          snap.docs.map((d) => {
            const data = d.data() as ClassQuestion;
            return { id: d.id, ...data };
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("useLiveLessonQuestions:", err);
        setQuestions([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [lessonId]);

  const submitQuestion = async (authorId: string, text: string) => {
    if (!lessonId) throw new Error("No lesson");
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Question is empty");
    if (trimmed.length > CLASS_QUESTION_TEXT_MAX_LENGTH) {
      throw new Error(`Question must be at most ${CLASS_QUESTION_TEXT_MAX_LENGTH} characters`);
    }
    await addDoc(collection(db, "liveLessons", lessonId, "classQuestions"), {
      authorId,
      text: trimmed,
      createdAt: Date.now(),
      status: "open",
    });
  };

  const setQuestionStatus = async (questionId: string, status: ClassQuestionStatus) => {
    if (!lessonId) throw new Error("No lesson");
    await updateDoc(doc(db, "liveLessons", lessonId, "classQuestions", questionId), {
      status,
      updatedAt: Date.now(),
    });
  };

  return { questions, loading, submitQuestion, setQuestionStatus };
}
