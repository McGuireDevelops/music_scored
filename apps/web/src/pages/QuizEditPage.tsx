import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import ProtectedRoute from "../components/ProtectedRoute";
import { useQuizQuestions, useQuiz } from "../hooks/useQuizzes";
import { useClassModules } from "../hooks/useClassModules";
import { useModuleLessons } from "../hooks/useModuleLessons";
import type { QuizQuestionWithId } from "../hooks/useQuizzes";
import type { QuizQuestion, QuizCorrectionMode } from "@learning-scores/shared";
import {
  QuizTeacherQuestionEditor,
  QUESTION_TYPES,
} from "../components/quiz/QuizTeacherQuestionEditor";
import { QuizGenerateModal } from "../components/quiz/QuizGenerateModal";
import { SortableQuizQuestionItem } from "../components/quiz/SortableQuizQuestionItem";
import { summarizeQuestion } from "../components/quiz/questionPayloadDefaults";

type QuizAttachLevel = "course" | "module" | "lesson";

function questionTypeLabel(type: string): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function QuizEditPage() {
  const { classId, quizId } = useParams<{ classId: string; quizId: string }>();
  const { quiz, loading: quizLoading, updateQuiz } = useQuiz(quizId);
  const { modules } = useClassModules(classId);
  const [editingQuestion, setEditingQuestion] =
    useState<QuizQuestionWithId | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const effectiveAttachLevel: QuizAttachLevel = quiz?.lessonId
    ? "lesson"
    : quiz?.moduleId
      ? "module"
      : "course";
  const selectedModuleId = effectiveAttachLevel !== "course" ? quiz?.moduleId ?? "" : "";
  const { lessons: moduleLessons } = useModuleLessons(
    classId,
    selectedModuleId || undefined
  );
  const selectedLessonId = quiz?.lessonId ?? "";

  const {
    questions,
    loading: questionsLoading,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    refetch,
    reorderQuestions,
  } = useQuizQuestions(quizId, { forTeacher: true });

  const loading = quizLoading || questionsLoading;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortableLocked = Boolean(editingQuestion || addingNew);

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    if (sortableLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      void reorderQuestions(oldIndex, newIndex).catch(() => void refetch());
    }
  };

  const handleAttachLevelChange = (level: QuizAttachLevel) => {
    if (level === "course") {
      updateQuiz({ moduleId: "", lessonId: "" });
    } else if (level === "module") {
      updateQuiz({ lessonId: "" });
    }
  };

  const handleModuleChange = (moduleId: string) => {
    updateQuiz({ moduleId: moduleId || "", lessonId: "" });
  };

  const handleLessonChange = (lessonId: string) => {
    updateQuiz({ lessonId: lessonId || "" });
  };

  const handleSaveNew = async (data: Omit<QuizQuestion, "id">) => {
    await addQuestion(data);
    setAddingNew(false);
  };

  const handleSaveEdit = async (
    data: Omit<QuizQuestion, "id">,
    meta?: { removedMedia?: boolean }
  ) => {
    if (!editingQuestion) return;
    await updateQuestion(editingQuestion.id, {
      ...data,
      ...(meta?.removedMedia ? { mediaRef: null } : {}),
    });
    setEditingQuestion(null);
  };

  const handleDelete = async () => {
    if (!editingQuestion) return;
    await deleteQuestion(editingQuestion.id);
    setEditingQuestion(null);
  };

  if (!classId) {
    return (
      <ProtectedRoute requiredRole="teacher">
        <p className="text-gray-600">Missing class.</p>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-4 flex items-center gap-4">
          <Link
            to={`/teacher/class/${classId}/quizzes`}
            className="text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
          >
            ← Back to quizzes
          </Link>
          <Link
            to={`/teacher/class/${classId}/quiz/${quizId}/attempts`}
            className="text-sm font-medium text-primary no-underline transition-colors hover:underline"
          >
            View attempts
          </Link>
          <Link
            to={`/teacher/class/${classId}/quiz/${quizId}/print`}
            className="text-sm font-medium text-gray-700 no-underline transition-colors hover:text-gray-900 hover:underline"
          >
            Print / PDF
          </Link>
        </div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight text-gray-900">
          Edit quiz {quiz?.title ?? "(loading…)"}
        </h2>
        {quiz && (
          <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Attach to
              </label>
              <select
                value={effectiveAttachLevel}
                onChange={(e) => handleAttachLevelChange(e.target.value as QuizAttachLevel)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="course">Course (final quiz)</option>
                <option value="module">Module (end-of-module quiz)</option>
                <option value="lesson">Lesson (lesson quiz)</option>
              </select>
            </div>
            {(effectiveAttachLevel === "module" || effectiveAttachLevel === "lesson") && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Module
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => handleModuleChange(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select module</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {effectiveAttachLevel === "lesson" && selectedModuleId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Lesson
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => handleLessonChange(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select lesson</option>
                  {moduleLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Correction mode
              </label>
              <select
                value={quiz.correctionMode ?? "auto"}
                onChange={(e) =>
                  updateQuiz({
                    correctionMode: e.target.value as QuizCorrectionMode,
                  })
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="auto">Auto-correct after submission</option>
                <option value="manual">Manual correction by teacher</option>
              </select>
            </div>
          </div>
        )}
        {loading && <p className="text-gray-500">Loading questions…</p>}
        {!loading && (
          <>
            <div className="mb-6">
              {addingNew ? (
                <QuizTeacherQuestionEditor
                  key="new"
                  classId={classId}
                  question={null}
                  onSave={(data) => handleSaveNew(data)}
                  onCancel={() => setAddingNew(false)}
                />
              ) : editingQuestion ? (
                <QuizTeacherQuestionEditor
                  key={editingQuestion.id}
                  classId={classId}
                  question={editingQuestion}
                  onSave={(data, meta) => handleSaveEdit(data, meta)}
                  onCancel={() => setEditingQuestion(null)}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setAddingNew(true)}
                    className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-4 font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary"
                  >
                    + Add question
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerateOpen(true)}
                    className="rounded-xl border border-gray-300 bg-white px-6 py-4 font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary"
                  >
                    Generate questions
                  </button>
                </div>
              )}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleQuestionDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <SortableQuizQuestionItem
                      key={q.id}
                      question={q}
                      index={idx}
                      disabled={sortableLocked}
                      typeLabel={questionTypeLabel(q.type)}
                      summary={summarizeQuestion(q)}
                      onEdit={() => {
                        setAddingNew(false);
                        setEditingQuestion(q);
                      }}
                      onDelete={() => {
                        setEditingQuestion(null);
                        setAddingNew(false);
                        void deleteQuestion(q.id);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {questions.length === 0 && !addingNew && (
              <p className="text-gray-600">
                No questions yet. Add one to get started.
              </p>
            )}
            {generateOpen && quizId && (
              <QuizGenerateModal
                quizId={quizId}
                onClose={() => setGenerateOpen(false)}
                onAdded={() => void refetch()}
                addQuestion={addQuestion}
              />
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
