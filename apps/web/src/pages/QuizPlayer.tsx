import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { functions, httpsCallable } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useQuizQuestions, useQuizAttempt, type QuizQuestionWithId } from "../hooks/useQuizzes";

export default function QuizPlayer() {
  const { classId, quizId } = useParams<{ classId: string; quizId: string }>();
  const { user } = useAuth();
  const { questions, loading } = useQuizQuestions(quizId, { forStudent: true });
  const { attempt } = useQuizAttempt(quizId, user?.uid);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<{
    score: number | null;
    maxScore: number;
    pending?: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId || !user) return;
    setSubmitting(true);
    try {
      const attemptAnswers = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        answer: { type: "multipleChoice", value: value ?? [] },
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

  if (attempt || submitted)
    return (
      <ProtectedRoute requiredRole="student">
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">Quiz complete</h2>
          {displayScore != null ? (
            <p className="mb-4 text-lg">
              Score: {displayScore.score} / {displayScore.maxScore}
            </p>
          ) : (lastResult?.pending || (attempt && !canShowScore)) ? (
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
          style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to class
        </Link>
        <h2>Quiz</h2>
        {loading && <p>Loading…</p>}
        {!loading && questions.length === 0 && <p>No questions.</p>}
        {!loading && questions.length > 0 && (
          <form onSubmit={handleSubmit}>
            {questions.map((q, i) => (
              <div key={q.id} style={{ marginBottom: "1.5rem" }}>
                <p>
                  <strong>{i + 1}. {q.type}</strong>
                </p>
                {q.type === "multipleChoiceSingle" || q.type === "multipleChoiceMulti" ? (
                  <div>
                    {(q.payload as { choices?: Array<{ key: string; label: string }> }).choices?.map(
                      (c) => {
                        const isMulti = q.type === "multipleChoiceMulti";
                        const selected = answers[q.id] ?? [];
                        const isChecked = selected.includes(c.key);
                        return (
                          <label key={c.key} style={{ display: "block" }}>
                            <input
                              type={isMulti ? "checkbox" : "radio"}
                              name={isMulti ? undefined : q.id}
                              value={c.key}
                              checked={isChecked}
                              onChange={() => {
                                if (isMulti) {
                                  setAnswers((prev) => {
                                    const current = prev[q.id] ?? [];
                                    const next = current.includes(c.key)
                                      ? current.filter((k) => k !== c.key)
                                      : [...current, c.key];
                                    return { ...prev, [q.id]: next };
                                  });
                                } else {
                                  setAnswers((prev) => ({ ...prev, [q.id]: [c.key] }));
                                }
                              }}
                            />
                            {c.label}
                          </label>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <input
                    placeholder="Answer"
                    value={(answers[q.id] ?? [])[0] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: e.target.value ? [e.target.value] : [],
                      }))
                    }
                  />
                )}
              </div>
            ))}
            <button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit quiz"}
            </button>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
