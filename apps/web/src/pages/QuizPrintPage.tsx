import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ProtectedRoute from "../components/ProtectedRoute";
import { QuizPrintView } from "../components/quiz/QuizPrintView";
import { useQuiz, useQuizQuestions } from "../hooks/useQuizzes";

export default function QuizPrintPage() {
  return (
    <ProtectedRoute requiredRole="teacher">
      <QuizPrintInner />
    </ProtectedRoute>
  );
}

function QuizPrintInner() {
  const { classId, quizId } = useParams<{ classId: string; quizId: string }>();
  const { quiz, loading: quizLoading } = useQuiz(quizId);
  const { questions, loading: qLoading } = useQuizQuestions(quizId, { forStudent: true });
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: quiz?.title ?? "Quiz",
  });

  const loading = quizLoading || qLoading;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (!classId || !quizId) {
    return <p className="p-8 text-gray-600">Missing quiz.</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="no-print border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          <Link
            to={`/teacher/class/${classId}/quiz/${quizId}/edit`}
            className="text-sm text-primary hover:underline"
          >
            ← Back to edit
          </Link>
          <button
            type="button"
            onClick={() => handlePrint()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => handlePrint()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Save as PDF (use Print dialog)
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 print:p-0">
        {loading && <p className="text-gray-600">Loading…</p>}
        {!loading && quiz && (
          <div ref={printRef} className="rounded-lg bg-white p-8 shadow print:shadow-none">
            <QuizPrintView
              title={quiz.title}
              dateLabel={dateLabel}
              questions={questions}
            />
          </div>
        )}
        {!loading && !quiz && <p className="text-gray-600">Quiz not found.</p>}
      </div>
    </div>
  );
}
