import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  LiveQuizSession,
  LiveQuizParticipantState,
  QuizAnswer,
} from "@learning-scores/shared";
import type { QuizQuestionWithId } from "./useQuizzes";
import { defaultAnswerForQuestion } from "../components/quiz/QuizQuestionInputs";

export type LiveQuizSessionWithId = LiveQuizSession & { id: string };

export type LiveQuizParticipantWithId = LiveQuizParticipantState & { id: string };

const DEBOUNCE_MS = 600;

export function useActiveLiveQuizSession(
  classId: string | undefined,
  quizId: string | undefined
) {
  const [session, setSession] = useState<LiveQuizSessionWithId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId || !quizId) {
      setLoading(false);
      setSession(null);
      return;
    }
    const q = query(
      collection(db, "liveQuizSessions"),
      where("classId", "==", classId),
      where("quizId", "==", quizId),
      where("status", "==", "active")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) setSession(null);
        else {
          const d = snap.docs[0];
          setSession({ id: d.id, ...(d.data() as LiveQuizSession) });
        }
        setLoading(false);
      },
      (err) => {
        console.error("useActiveLiveQuizSession:", err);
        setSession(null);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [classId, quizId]);

  return { session, loading };
}

export function useLiveQuizParticipants(sessionId: string | undefined) {
  const [participants, setParticipants] = useState<LiveQuizParticipantWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setParticipants([]);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "liveQuizSessions", sessionId, "participants"),
      (snap) => {
        setParticipants(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as LiveQuizParticipantState),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("useLiveQuizParticipants:", err);
        setParticipants([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [sessionId]);

  return { participants, loading };
}

/**
 * Debounced sync of local answer state to the participant doc (student).
 */
export function useLiveQuizParticipantDraftSync(options: {
  sessionId: string | undefined;
  userId: string | undefined;
  displayName: string | undefined;
  questions: QuizQuestionWithId[];
  answers: Record<string, QuizAnswer>;
  enabled: boolean;
}) {
  const { sessionId, userId, displayName, questions, answers, enabled } = options;
  const snapshotRef = useRef({ questions, answers });
  snapshotRef.current = { questions, answers };
  const fingerprint = JSON.stringify(
    questions.map((q) => [q.id, answers[q.id] ?? null])
  );

  useEffect(() => {
    if (!enabled || !sessionId || !userId) return;

    const t = window.setTimeout(async () => {
      const { questions: qs, answers: ans } = snapshotRef.current;
      const attemptAnswers = qs.map((q) => ({
        questionId: q.id,
        answer: ans[q.id] ?? defaultAnswerForQuestion(q),
      }));
      const answeredCount = attemptAnswers.filter((row) => {
        const q = qs.find((x) => x.id === row.questionId);
        if (!q) return false;
        return (
          JSON.stringify(row.answer) !==
          JSON.stringify(defaultAnswerForQuestion(q))
        );
      }).length;
      try {
        await setDoc(
          doc(db, "liveQuizSessions", sessionId, "participants", userId),
          {
            userId,
            displayName: displayName ?? null,
            answers: attemptAnswers,
            answeredCount,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error("live quiz draft sync failed:", e);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [sessionId, userId, displayName, fingerprint, enabled]);
}

export async function markLiveQuizParticipantSubmitted(
  sessionId: string,
  userId: string
): Promise<void> {
  await setDoc(
    doc(db, "liveQuizSessions", sessionId, "participants", userId),
    {
      userId,
      submittedAt: Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export async function startLiveQuizSession(data: {
  classId: string;
  quizId: string;
  createdBy: string;
  liveLessonId?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "liveQuizSessions"), {
    classId: data.classId,
    quizId: data.quizId,
    createdBy: data.createdBy,
    createdAt: Date.now(),
    status: "active" as const,
    ...(data.liveLessonId ? { liveLessonId: data.liveLessonId } : {}),
  });
  return ref.id;
}

export function useLiveQuizSessionRef(sessionId: string | undefined) {
  const [session, setSession] = useState<LiveQuizSessionWithId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "liveQuizSessions", sessionId),
      (snap) => {
        if (!snap.exists()) setSession(null);
        else setSession({ id: snap.id, ...(snap.data() as LiveQuizSession) });
        setLoading(false);
      },
      (err) => {
        console.error("useLiveQuizSessionRef:", err);
        setSession(null);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [sessionId]);

  return { session, loading };
}

export async function endLiveQuizSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, "liveQuizSessions", sessionId), {
    status: "ended",
    endedAt: Date.now(),
  });
  const parts = await getDocs(
    collection(db, "liveQuizSessions", sessionId, "participants")
  );
  const batch = writeBatch(db);
  parts.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
