import { useState, useRef } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";
import { Link } from "react-router-dom";
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
import { SortableLessonItem } from "./SortableLessonItem";
import { LessonBuilderForm } from "./LessonBuilderForm";
import { InlineAssignmentForm } from "./InlineAssignmentForm";
import { InlineQuizForm } from "./InlineQuizForm";
import { DocumentViewer } from "./media/DocumentViewer";
import { useModuleLessons } from "../hooks/useModuleLessons";
import type { ModuleWithId } from "../hooks/useClassModules";
import type { AssignmentWithId } from "../hooks/useClassAssignments";
import type { QuizWithId } from "../hooks/useQuizzes";
import type { MediaReference } from "@learning-scores/shared";

type InlineForm = "lesson" | "assignment" | "quiz" | null;

const MODULE_DOCUMENT_ACCEPT =
  "application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx";

interface CourseBuilderModuleSectionProps {
  module: ModuleWithId;
  moduleIndex: number;
  classId: string;
  userId: string;
  allModules: { id: string; name: string }[];
  assignments: AssignmentWithId[];
  quizzes: QuizWithId[];
  onDeleteModule: (id: string) => Promise<void>;
  onUpdateModule: (moduleId: string, data: Partial<ModuleWithId>) => Promise<void>;
  createAssignment: (data: {
    classId: string;
    moduleId: string;
    ownerId: string;
    title: string;
    brief: string;
    lessonId?: string;
  }, ownerId: string) => Promise<void>;
  createQuiz: (data: {
    classId: string;
    moduleId: string;
    ownerId: string;
    title: string;
  }, ownerId: string) => Promise<void>;
  assignQuizToModule: (quizId: string, moduleId: string) => Promise<void>;
  onLessonCreated: () => void;
}

export function CourseBuilderModuleSection({
  module: mod,
  moduleIndex,
  classId,
  userId,
  allModules,
  assignments,
  quizzes,
  onDeleteModule,
  onUpdateModule,
  createAssignment,
  createQuiz,
  assignQuizToModule,
  onLessonCreated,
}: CourseBuilderModuleSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeForm, setActiveForm] = useState<InlineForm>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [moduleName, setModuleName] = useState(mod.name);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    lessons,
    loading: lessonsLoading,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
  } = useModuleLessons(classId, mod.id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moduleAssignments = assignments.filter((a) => a.moduleId === mod.id);
  const moduleQuizzes = quizzes.filter((q) => q.moduleId === mod.id);
  const moduleNameById = new Map(allModules.map((m) => [m.id, m.name] as const));
  const assignableQuizzes = quizzes
    .filter((q) => q.ownerId === userId && q.moduleId !== mod.id)
    .sort((a, b) => a.title.localeCompare(b.title));
  const assignableQuizOptions = assignableQuizzes.map((q) => {
    let where: string;
    if (!q.moduleId) {
      where = "Course library";
    } else {
      const name = moduleNameById.get(q.moduleId);
      where = name ? `Module: ${name}` : "Another module";
    }
    if (q.lessonId) {
      where = `${where} · lesson quiz`;
    }
    return { id: q.id, label: `${q.title} (${where})` };
  });
  const documentRefs = mod.documentRefs ?? [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderLessons(oldIndex, newIndex);
    }
  };

  const handleSaveNewLesson = async (
    data: {
      title: string;
      content?: string;
      summary?: string;
      type: "video" | "audio" | "score" | "text";
      mediaRefs?: MediaReference[];
    },
  ) => {
    const order = lessons.length;
    await createLesson(
      {
        classId,
        moduleId: mod.id,
        ownerId: userId,
        title: data.title,
        type: data.type,
        content: data.content,
        summary: data.summary,
        mediaRefs: data.mediaRefs,
        order,
      },
      userId
    );
    setActiveForm(null);
    onLessonCreated();
  };

  const handleDeleteLesson = async (lesson: (typeof lessons)[number]) => {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    if (editingLessonId === lesson.id) setEditingLessonId(null);
    await deleteLesson(lesson.id);
    onLessonCreated();
  };

  const handleSaveEditLesson = async (
    data: {
      title: string;
      content?: string;
      summary?: string;
      type: "video" | "audio" | "score" | "text";
      mediaRefs?: MediaReference[];
    },
    updateMode?: "push" | "newVersion"
  ) => {
    if (!editingLessonId) return;
    await updateLesson(
      editingLessonId,
      {
        title: data.title,
        content: data.content,
        summary: data.summary,
        type: data.type,
        mediaRefs: data.mediaRefs,
      },
      updateMode
    );
    setEditingLessonId(null);
    onLessonCreated();
  };

  const handleSaveAssignment = async (
    data: {
      classId: string;
      moduleId: string;
      ownerId: string;
      title: string;
      brief: string;
      lessonId?: string;
    },
    ownerId: string
  ) => {
    await createAssignment(data, ownerId);
    setActiveForm(null);
  };

  const handleSaveQuiz = async (
    data: {
      classId: string;
      moduleId: string;
      ownerId: string;
      title: string;
    },
    ownerId: string
  ) => {
    await createQuiz(data, ownerId);
    setActiveForm(null);
  };

  const handleAssignExistingQuiz = async (quizId: string) => {
    await assignQuizToModule(quizId, mod.id);
    setActiveForm(null);
  };

  const handleModuleRename = async () => {
    if (moduleName.trim() && moduleName.trim() !== mod.name) {
      await onUpdateModule(mod.id, { name: moduleName.trim() });
    }
    setEditingName(false);
  };

  const handleAddDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `classes/${classId}/modules/${mod.id}/documents/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      await onUpdateModule(mod.id, {
        documentRefs: [
          ...documentRefs,
          { type: "document" as const, resourceId: path },
        ],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async (index: number) => {
    const next = documentRefs.filter((_, i) => i !== index);
    await onUpdateModule(mod.id, { documentRefs: next });
  };

  const editingLesson = editingLessonId
    ? lessons.find((l) => l.id === editingLessonId) ?? null
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Module header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label={expanded ? "Collapse module" : "Expand module"}
        >
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {moduleIndex + 1}
          </span>
          {editingName ? (
            <input
              type="text"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onBlur={handleModuleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleModuleRename();
                if (e.key === "Escape") {
                  setModuleName(mod.name);
                  setEditingName(false);
                }
              }}
              autoFocus
              className="min-w-0 flex-1 rounded border border-primary px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="min-w-0 truncate text-left text-sm font-semibold text-gray-900 hover:text-primary"
              title="Click to rename"
            >
              {mod.name}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-2 text-xs text-gray-400">
            {lessons.length}L · {moduleAssignments.length}A · {moduleQuizzes.length}Q
          </span>
          <button
            type="button"
            onClick={() => onDeleteModule(mod.id)}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete module"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-3">
          {/* Quick-add action bar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveForm(activeForm === "lesson" ? null : "lesson")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeForm === "lesson"
                  ? "bg-primary text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              + Lesson
            </button>
            <button
              type="button"
              onClick={() => setActiveForm(activeForm === "assignment" ? null : "assignment")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeForm === "assignment"
                  ? "bg-primary text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              + Assignment
            </button>
            <button
              type="button"
              onClick={() => setActiveForm(activeForm === "quiz" ? null : "quiz")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeForm === "quiz"
                  ? "bg-primary text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              + Quiz
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={MODULE_DOCUMENT_ACCEPT}
              className="hidden"
              onChange={handleAddDocument}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "+ Document"}
            </button>
          </div>

          {/* Inline creation forms */}
          {activeForm === "lesson" && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-900">New lesson</h4>
              <LessonBuilderForm
                lesson={null}
                classId={classId}
                moduleId={mod.id}
                userId={userId}
                onSave={handleSaveNewLesson}
                onCancel={() => setActiveForm(null)}
                isNew
              />
            </div>
          )}
          {activeForm === "assignment" && (
            <div className="mb-4">
              <InlineAssignmentForm
                classId={classId}
                moduleId={mod.id}
                userId={userId}
                lessons={lessons}
                onSave={handleSaveAssignment}
                onCancel={() => setActiveForm(null)}
              />
            </div>
          )}
          {activeForm === "quiz" && (
            <div className="mb-4">
              <InlineQuizForm
                classId={classId}
                moduleId={mod.id}
                userId={userId}
                assignableQuizOptions={assignableQuizOptions}
                onSave={handleSaveQuiz}
                onAssignExisting={handleAssignExistingQuiz}
                onCancel={() => setActiveForm(null)}
              />
            </div>
          )}

          {/* Lessons list with drag-and-drop */}
          {lessonsLoading ? (
            <p className="py-2 text-sm text-gray-500">Loading lessons...</p>
          ) : lessons.length === 0 && moduleAssignments.length === 0 && moduleQuizzes.length === 0 && documentRefs.length === 0 ? (
            <p className="py-3 text-center text-sm text-gray-400">
              This module is empty. Use the buttons above to add content.
            </p>
          ) : (
            <div className="space-y-1">
              {/* Lessons */}
              {lessons.length > 0 && (
                <div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={lessons.map((l) => l.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id}>
                          <div className="flex items-center gap-1">
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-600 bg-blue-50">
                              Lesson
                            </span>
                            <span
                              className="shrink-0 min-w-[1.5rem] rounded bg-blue-100/80 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-blue-800"
                              title="Lesson order in this module"
                            >
                              {lessonIndex + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <SortableLessonItem
                                lesson={lesson}
                                isSelected={editingLessonId === lesson.id}
                                onSelect={() =>
                                  setEditingLessonId(
                                    editingLessonId === lesson.id ? null : lesson.id
                                  )
                                }
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDeleteLesson(lesson)}
                              className="shrink-0 rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                              aria-label={`Delete lesson ${lessonIndex + 1}`}
                            >
                              &times;
                            </button>
                            <Link
                              to={`/teacher/class/${classId}/present?lessonId=${lesson.id}`}
                              className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-primary no-underline hover:bg-gray-50"
                            >
                              Present
                            </Link>
                          </div>
                          {editingLessonId === lesson.id && editingLesson && (
                            <div className="ml-6 mt-1 mb-2 rounded-lg border border-gray-200 bg-white p-4">
                              <LessonBuilderForm
                                lesson={editingLesson}
                                classId={classId}
                                moduleId={mod.id}
                                userId={userId}
                                onSave={handleSaveEditLesson}
                                onCancel={() => setEditingLessonId(null)}
                                isNew={false}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Assignments */}
              {moduleAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 bg-amber-50">
                    Assignment
                  </span>
                  <Link
                    to={`/teacher/class/${classId}/assignment/${a.id}`}
                    className="min-w-0 flex-1 truncate text-gray-900 no-underline hover:text-primary hover:underline"
                  >
                    {a.title}
                  </Link>
                </div>
              ))}

              {/* Quizzes */}
              {moduleQuizzes.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-purple-700 bg-purple-50">
                    Quiz
                  </span>
                  <Link
                    to={`/teacher/class/${classId}/quiz/${q.id}/edit`}
                    className="min-w-0 flex-1 truncate text-gray-900 no-underline hover:text-primary hover:underline"
                  >
                    {q.title}
                  </Link>
                </div>
              ))}

              {/* Documents */}
              {documentRefs.length > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <p className="mb-1 text-xs font-medium text-gray-500">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {documentRefs.map((docRef, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
                      >
                        <DocumentViewer mediaRef={docRef} />
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(i)}
                          className="ml-1 text-red-500 hover:text-red-700"
                          aria-label="Remove document"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
