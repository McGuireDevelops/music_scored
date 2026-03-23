import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, functions, httpsCallable } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useQuizQuestions, useQuizAttempt, type QuizQuestionWithId } from "../hooks/useQuizzes";
import type { QuizAnswer } from "@learning-scores/shared";
import {
  QuizQuestionInputs,
  defaultAnswerForQuestion,
} from "../components/quiz/QuizQuestionInputs";
import {
  useActiveLiveQuizSession,
  useLiveQuizParticipantDraftSync,
  markLiveQuizParticipantSubmitted,
} from "../hooks/useLiveQuiz";
import { evaluateStudentModuleLessonAccess } from "../lib/studentProgressionAccess";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multipleChoiceSingle: "Single choice",
  multipleChoiceMulti: "Multiple choice",
  chordIdentification: "Chord identification",
  romanNumeral: "Roman numeral",
  nashville: "Nashville numbers",
  pitchClassSet: "Pitch-class set",
  intervalVector: "Interval vector",
  mixedMeter: "Mixed meter",
  polymeter: "Polymeter",
  visualScore: "Score (bar range)",
  mediaTimeCode: "Time code",
  staffSingleNote: "Staff — single note",
  staffMelody: "Staff — melody",
  chordSpelling: "Chord spelling",
};

export default function QuizPlayer() {
  const { classId, quizId } = useParams<{ classId: string; quizId: string }>();
  const { user } = useAuth();
  const { questions, loading } = useQuizQuestions(quizId, { forStudent: true });
  const { attempt } = useQuizAttempt(quizId, user?.uid);
  const { session: liveSession } = useActiveLiveQuizSession(classId, quizId);
  const [progressionGate, setProgressionGate] = useState<{
    checked: boolean;
    ok: boolean;
    reason?: string;
  }>({ checked: false, ok: true });
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<{
    score: number | null;
    maxScore: number;
    pending?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!quizId || !classId || !user?.uid) {
      setProgressionGate({ checked: true, ok: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      const snap = await getDoc(doc(db, "quizzes", quizId));
      if (cancelled) return;
      if (!snap.exists()) {
        setProgressionGate({ checked: true, ok: false, reason: "Quiz not found." });
        return;
      }
      const qz = snap.data();
      const res = await evaluateStudentModuleLessonAccess({
        classId,
        studentId: user.uid,
        isTeacher: false,
        moduleId: qz.moduleId as string | undefined,
        lessonId: qz.lessonId as string | undefined,
      });
      if (!cancelled) {
        setProgressionGate({ checked: true, ok: res.ok, reason: res.reason });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId, classId, user?.uid]);

  useEffect(() => {
    setAnswers((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const q of questions) {
        if (next[q.id] == null) {
          next[q.id] = defaultAnswerForQuestion(q);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [questions]);

  const liveSyncEnabled =
    Boolean(liveSession?.id && user?.uid && !attempt && !submitted);
  useLiveQuizParticipantDraftSync({
    sessionId: liveSession?.id,
    userId: user?.uid,
    displayName: user?.displayName ?? user?.email ?? undefined,
    questions,
    answers,
    enabled: liveSyncEnabled,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId || !user) return;
    setSubmitting(true);
    try {
      const attemptAnswers = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? defaultAnswerForQuestion(q),
      }));
      const submitAttempt = httpsCallable<
        { quizId: string; answers: typeof attemptAnswers },
        { attemptId: string; score: number | null; maxScore: number }
      >(functions, "submitQuizAttempt");
      const res = await submitAttempt({ quizId, answers: attemptAnswers });
      const data = res.data;
      setLastResult({
        score: data.score,
        maxScore: data.maxScore,
        pending: data.score == null,
      });
      setSubmitted(true);
      if (liveSession?.id && user?.uid) {
        try {
          await markLiveQuizParticipantSubmitted(liveSession.id, user.uid);
        } catch (markErr) {
          console.error(markErr);
        }
      }
    } catch (err) {
      console.error(err);
      setLastResult({ score: null, maxScore: 0, pending: false });
    } finally {
      setSubmitting(false);
    }
  };

  const canShowScore =
    attempt?.sharedWithStudentAt != null ||
    (lastResult && !lastResult.pending) ||
    (attempt && attempt.gradedBy === "auto");

  const displayScore =
    lastResult && !lastResult.pending
      ? { score: lastResult.score ?? 0, maxScore: lastResult.maxScore }
      : attempt && canShowScore
        ? { score: attempt.score ?? 0, maxScore: attempt.maxScore ?? 0 }
        : null;

  if (!progressionGate.checked) {
    return (
      <ProtectedRoute requiredRole="student">
        <p className="text-gray-500">Loading…</p>
      </ProtectedRoute>
    );
  }

  if (!progressionGate.ok) {
    return (
      <ProtectedRoute requiredRole="student">
        <div>
          <Link
            to={`/student/class/${classId}`}
            className="mb-4 inline-block text-gray-600 hover:text-gray-900"
          >
            ← Back to class
          </Link>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Quiz not available</h2>
          <p className="text-gray-600">
            {progressionGate.reason ?? "You can’t access this quiz yet."}
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  if (attempt || submitted)
    return (
      <ProtectedRoute requiredRole="student">
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">Quiz complete</h2>
          {displayScore != null ? (
            <p className="mb-4 text-lg">
              Score: {displayScore.score} / {displayScore.maxScore}
            </p>
          ) : lastResult?.pending || (attempt && !canShowScore) ? (
            <p className="mb-4 text-lg text-gray-600">
              Your submission has been received. Your teacher will grade it and share your score.
            </p>
          ) : null}
          <Link
            to={`/student/class/${classId}`}
            className="text-primary hover:underline"
          >
            ← Back to class
          </Link>
        </div>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <Link
          to={`/student/class/${classId}`}
          className="mb-4 inline-block text-gray-600 hover:text-gray-900"
        >
          ← Back to class
        </Link>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">Quiz</h2>
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && questions.length === 0 && <p className="text-gray-600">No questions.</p>}
        {!loading && questions.length > 0 && (
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
            {liveSession && (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                role="status"
              >
                Live session in progress. Your teacher can see your answers as you fill in the quiz.
              </div>
            )}
            {questions.map((q, i) => (
              <QuizQuestionCard
                key={q.id}
                index={i}
                q={q}
                answer={answers[q.id] ?? defaultAnswerForQuestion(q)}
                onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
              />
            ))}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-6 py-2.5 font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit quiz"}
            </button>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}

function QuizQuestionCard({
  index,
  q,
  answer,
  onChange,
}: {
  index: number;
  q: QuizQuestionWithId;
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  const label = QUESTION_TYPE_LABELS[q.type] ?? q.type;
  return (
    <div className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
      <p className="mb-3 text-sm font-semibold text-gray-900">
        {index + 1}. {label}
      </p>
      <QuizQuestionInputs q={q} answer={answer} onChange={onChange} />
    </div>
  );
}
