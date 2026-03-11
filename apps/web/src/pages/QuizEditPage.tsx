import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useQuizQuestions } from "../hooks/useQuizzes";
import type { QuizQuestionWithId } from "../hooks/useQuizzes";
import type {
  QuizQuestion,
  QuizQuestionType,
  MultipleChoicePayload,
} from "@learning-scores/shared";

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: "multipleChoiceSingle", label: "Single choice" },
  { value: "multipleChoiceMulti", label: "Multiple choice" },
];

function createEmptyPayload(type: QuizQuestionType): MultipleChoicePayload {
  return {
    choices: [{ key: "a", label: "" }, { key: "b", label: "" }],
    correctKeys: [],
  };
}

function QuestionEditor({
  question,
  onSave,
  onCancel,
  onDelete,
}: {
  question: QuizQuestionWithId | null;
  onSave: (data: Omit<QuizQuestion, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [type, setType] = useState<QuizQuestionType>(
    question?.type ?? "multipleChoiceSingle"
  );
  const [payload, setPayload] = useState<MultipleChoicePayload>(
    question?.type === "multipleChoiceSingle" || question?.type === "multipleChoiceMulti"
      ? (question.payload as MultipleChoicePayload)
      : createEmptyPayload("multipleChoiceSingle")
  );
  const [points, setPoints] = useState(question?.points ?? 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payload.choices.some((c) => !c.label.trim())) return;
    onSave({
      type,
      payload: { ...payload },
      points: points > 0 ? points : 1,
    });
  };

  const addChoice = () => {
    const keys = payload.choices.map((c) => c.key);
    let nextKey = "a";
    while (keys.includes(nextKey)) {
      nextKey = String.fromCharCode(nextKey.charCodeAt(0) + 1);
    }
    setPayload((p) => ({
      ...p,
      choices: [...p.choices, { key: nextKey, label: "" }],
    }));
  };

  const updateChoice = (idx: number, label: string) => {
    setPayload((p) => ({
      ...p,
      choices: p.choices.map((c, i) =>
        i === idx ? { ...c, label } : c
      ),
    }));
  };

  const removeChoice = (idx: number) => {
    const key = payload.choices[idx].key;
    setPayload((p) => ({
      ...p,
      choices: p.choices.filter((_, i) => i !== idx),
      correctKeys: p.correctKeys.filter((k) => k !== key),
    }));
  };

  const toggleCorrect = (key: string) => {
    setPayload((p) => {
      if (type === "multipleChoiceSingle") {
        return {
          ...p,
          correctKeys: p.correctKeys.includes(key) ? [] : [key],
        };
      }
      const has = p.correctKeys.includes(key);
      return {
        ...p,
        correctKeys: has
          ? p.correctKeys.filter((k) => k !== key)
          : [...p.correctKeys, key],
      };
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card max-w-2xl border border-gray-200 bg-white p-6 shadow-card"
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {question ? "Edit question" : "Add question"}
      </h3>
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Question type
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as QuizQuestionType);
            setPayload(createEmptyPayload(e.target.value as QuizQuestionType));
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Choices
        </label>
        <div className="space-y-2">
          {payload.choices.map((c, idx) => (
            <div key={c.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={payload.correctKeys.includes(c.key)}
                onChange={() => toggleCorrect(c.key)}
                title="Correct answer"
                className="h-4 w-4 rounded border-gray-300"
              />
              <input
                type="text"
                value={c.label}
                onChange={(e) => updateChoice(idx, e.target.value)}
                placeholder={`Option ${c.key}`}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {payload.choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(idx)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addChoice}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          + Add choice
        </button>
      </div>
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Points
        </label>
        <input
          type="number"
          min={1}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value) || 1)}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        {question && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

export default function QuizEditPage() {
  const { classId, quizId } = useParams<{ classId: string; quizId: string }>();
  const { user } = useAuth();
  const {
    questions,
    loading,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  } = useQuizQuestions(quizId);
  const [editingQuestion, setEditingQuestion] =
    useState<QuizQuestionWithId | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");

  useEffect(() => {
    if (!quizId) return;
    getDoc(doc(db, "quizzes", quizId)).then((snap) => {
      setQuizTitle(snap.exists() ? snap.data().title ?? "Quiz" : "");
    });
  }, [quizId]);

  const handleSaveNew = async (data: Omit<QuizQuestion, "id">) => {
    await addQuestion(data);
    setAddingNew(false);
  };

  const handleSaveEdit = async (data: Omit<QuizQuestion, "id">) => {
    if (!editingQuestion) return;
    await updateQuestion(editingQuestion.id, data);
    setEditingQuestion(null);
  };

  const handleDelete = async () => {
    if (!editingQuestion) return;
    await deleteQuestion(editingQuestion.id);
    setEditingQuestion(null);
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to={`/teacher/class/${classId}/quizzes`}
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to quizzes
        </Link>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">
          Edit quiz {quizTitle || "(loading…)"}
        </h2>
        {loading && <p className="text-gray-500">Loading questions…</p>}
        {!loading && (
          <>
            <div className="mb-6">
              {addingNew ? (
                <QuestionEditor
                  question={null}
                  onSave={handleSaveNew}
                  onCancel={() => setAddingNew(false)}
                />
              ) : editingQuestion ? (
                <QuestionEditor
                  question={editingQuestion}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingQuestion(null)}
                  onDelete={handleDelete}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingNew(true)}
                  className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-4 font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary"
                >
                  + Add question
                </button>
              )}
            </div>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {idx + 1}. {q.type}
                    </span>
                    {(q.payload as MultipleChoicePayload).choices && (
                      <p className="mt-1 text-sm text-gray-600">
                        {(q.payload as MultipleChoicePayload).choices
                          .map((c) => c.label || c.key)
                          .filter(Boolean)
                          .join(" | ") || "No choices"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingNew(false);
                        setEditingQuestion(q);
                      }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestion(null);
                        setAddingNew(false);
                        deleteQuestion(q.id);
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {questions.length === 0 && !addingNew && (
              <p className="text-gray-600">
                No questions yet. Add one to get started.
              </p>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
