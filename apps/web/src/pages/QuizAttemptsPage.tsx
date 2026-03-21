import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useQuizAttemptsForQuiz, type QuizAttemptWithId } from "../hooks/useQuizAttemptsForQuiz";
import { useQuizQuestions } from "../hooks/useQuizzes";
import { useQuiz } from "../hooks/useQuizzes";
import { QUESTION_TYPES } from "../components/quiz/QuizTeacherQuestionEditor";
import { formatAttemptAnswerDisplay } from "../utils/formatQuizAttemptAnswer";

function questionTypeLabel(type: string): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function QuizAttemptsPage() {
  const { classId, quizId } = useParams<{ classId: string; quizId: string }>();
  const { quiz } = useQuiz(quizId);
  const { attempts, loading } = useQuizAttemptsForQuiz(quizId);
  const { questions } = useQuizQuestions(quizId, { forTeacher: true });
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptWithId | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [editScore, setEditScore] = useState<string>("");
  const [editFeedback, setEditFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uids = [...new Set(attempts.map((a) => a.userId))];
    Promise.all(
      uids.map((uid) =>
        getDoc(doc(db, "users", uid)).then((s) => ({
          uid,
          name: s.exists() ? (s.data()?.displayName || s.data()?.email || uid) : uid,
        }))
      )
    ).then((list) => {
      const map: Record<string, string> = {};
      list.forEach(({ uid, name }) => (map[uid] = name));
      setUserNames(map);
    });
  }, [attempts]);

  useEffect(() => {
    if (selectedAttempt) {
      setEditScore(String(selectedAttempt.score ?? ""));
      setEditFeedback(selectedAttempt.teacherFeedback ?? "");
    }
  }, [selectedAttempt]);

  const handleSaveGrade = async () => {
    if (!selectedAttempt || !quizId) return;
    const scoreNum = editScore.trim() ? parseInt(editScore, 10) : null;
    if (editScore.trim() && (scoreNum === undefined || isNaN(scoreNum))) return;
    setSaving(true);
    try {
      await updateDoc(
        doc(db, "quizzes", quizId, "attempts", selectedAttempt.id),
        {
          ...(scoreNum != null && { score: scoreNum }),
          teacherFeedback: editFeedback.trim() || null,
          gradedBy: "manual",
          updatedAt: Date.now(),
        }
      );
      setSelectedAttempt({
        ...selectedAttempt,
        score: scoreNum ?? undefined,
        teacherFeedback: editFeedback.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleShareWithStudent = async () => {
    if (!selectedAttempt || !quizId) return;
    setSaving(true);
    try {
      await updateDoc(
        doc(db, "quizzes", quizId, "attempts", selectedAttempt.id),
        {
          sharedWithStudentAt: Date.now(),
          teacherFeedback: editFeedback.trim() || selectedAttempt.teacherFeedback || null,
          score: editScore.trim() ? parseInt(editScore, 10) : selectedAttempt.score ?? null,
          updatedAt: Date.now(),
        }
      );
      setSelectedAttempt({
        ...selectedAttempt,
        sharedWithStudentAt: Date.now(),
        teacherFeedback: editFeedback.trim() || selectedAttempt.teacherFeedback,
        score: editScore.trim() ? parseInt(editScore, 10) : selectedAttempt.score ?? undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to={`/teacher/class/${classId}/quiz/${quizId}/edit`}
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to edit quiz
        </Link>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">
          Quiz attempts: {quiz?.title ?? "…"}
        </h2>

        {loading && <p className="text-gray-500">Loading…</p>}

        <div className="flex gap-8">
          <div className="flex-1">
            <h3 className="mb-3 text-lg font-medium text-gray-900">Submissions</h3>
            {!loading && attempts.length === 0 && (
              <p className="text-gray-600">No submissions yet.</p>
            )}
            {!loading && attempts.length > 0 && (
              <ul className="space-y-2">
                {attempts.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedAttempt(a)}
                      className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedAttempt?.id === a.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium text-gray-900">
                        {userNames[a.userId] ?? a.userId}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {a.score != null ? `${a.score} / ${a.maxScore ?? "?"}` : "Pending"}
                        {a.sharedWithStudentAt != null && " · Shared"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedAttempt && (
            <div className="w-full max-w-lg shrink-0 rounded-lg border border-gray-200 bg-white p-6 shadow-card">
              <h3 className="mb-4 font-medium text-gray-900">
                {userNames[selectedAttempt.userId] ?? selectedAttempt.userId}
              </h3>

              <div className="mb-4 max-h-[60vh] space-y-2 overflow-y-auto">
                {questions.map((q, idx) => {
                  const ans = selectedAttempt.answers.find((a) => a.questionId === q.id);
                  const { student, correct } = formatAttemptAnswerDisplay(
                    q,
                    ans?.answer as { type: string; value: unknown } | undefined
                  );
                  return (
                    <div key={q.id} className="rounded border border-gray-100 p-3">
                      <p className="text-sm font-medium text-gray-700">
                        {idx + 1}. {questionTypeLabel(q.type)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-700">Answer: </span>
                        {student}
                      </p>
                      <p className="text-xs text-green-800">
                        <span className="font-medium">Correct: </span>
                        {correct}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Score
                </label>
                <input
                  type="number"
                  min={0}
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Feedback (optional)
                </label>
                <textarea
                  rows={3}
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="Add feedback for the student…"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveGrade}
                  disabled={saving}
                  className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  Save grade
                </button>
                <button
                  type="button"
                  onClick={handleShareWithStudent}
                  disabled={saving}
                  className="rounded-xl border border-primary bg-white px-4 py-2 font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                >
                  Share with student
                </button>
              </div>

              {selectedAttempt.sharedWithStudentAt != null && (
                <p className="mt-3 text-sm text-green-600">
                  Shared on{" "}
                  {new Date(selectedAttempt.sharedWithStudentAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
