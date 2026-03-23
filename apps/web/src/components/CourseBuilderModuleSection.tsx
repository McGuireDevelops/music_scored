import { useState, useRef, useMemo, useCallback } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { doc, writeBatch } from "firebase/firestore";
import { storage, db } from "../firebase";
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
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableModuleContentRow } from "./SortableModuleContentRow";
import { ModuleProgressionPanel } from "./ModuleProgressionPanel";
import { LessonProgressionPanel } from "./LessonProgressionPanel";
import { LessonBuilderForm } from "./LessonBuilderForm";
import { InlineAssignmentForm } from "./InlineAssignmentForm";
import { InlineQuizForm } from "./InlineQuizForm";
import { DocumentViewer } from "./media/DocumentViewer";
import { useModuleLessons, type LessonWithId } from "../hooks/useModuleLessons";
import type { ModuleWithId } from "../hooks/useClassModules";
import type { AssignmentWithId } from "../hooks/useClassAssignments";
import type { QuizWithId } from "../hooks/useQuizzes";
import type { MediaReference, ModuleContentOrderItem } from "@learning-scores/shared";

type InlineForm = "lesson" | "assignment" | "quiz" | null;

function moduleContentKey(item: ModuleContentOrderItem): string {
  return `${item.kind}:${item.id}`;
}

function normalizeModuleContentOrder(
  stored: ModuleContentOrderItem[] | undefined,
  lessons: LessonWithId[],
  moduleAssignments: AssignmentWithId[],
  moduleQuizzes: QuizWithId[]
): ModuleContentOrderItem[] {
  const validLessonIds = new Set(lessons.map((l) => l.id));
  const validAssignmentIds = new Set(moduleAssignments.map((a) => a.id));
  const validQuizIds = new Set(moduleQuizzes.map((q) => q.id));
  const used = new Set<string>();
  const result: ModuleContentOrderItem[] = [];

  for (const item of stored ?? []) {
    const key = moduleContentKey(item);
    if (used.has(key)) continue;
    if (item.kind === "lesson" && validLessonIds.has(item.id)) {
      result.push(item);
      used.add(key);
    } else if (item.kind === "assignment" && validAssignmentIds.has(item.id)) {
      result.push(item);
      used.add(key);
    } else if (item.kind === "quiz" && validQuizIds.has(item.id)) {
      result.push(item);
      used.add(key);
    }
  }

  const sortedLessons = [...lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const l of sortedLessons) {
    const key = moduleContentKey({ kind: "lesson", id: l.id });
    if (!used.has(key)) {
      result.push({ kind: "lesson", id: l.id });
      used.add(key);
    }
  }

  for (const a of [...moduleAssignments].sort((x, y) => x.title.localeCompare(y.title))) {
    const key = moduleContentKey({ kind: "assignment", id: a.id });
    if (!used.has(key)) {
      result.push({ kind: "assignment", id: a.id });
      used.add(key);
    }
  }

  for (const q of [...moduleQuizzes].sort((x, y) => x.title.localeCompare(y.title))) {
    const key = moduleContentKey({ kind: "quiz", id: q.id });
    if (!used.has(key)) {
      result.push({ kind: "quiz", id: q.id });
      used.add(key);
    }
  }

  return result;
}

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
  enrollmentUserIds: string[];
  onDeleteModule: (id: string) => Promise<void>;
  onUpdateModule: (moduleId: string, data: Partial<ModuleWithId> & Record<string, unknown>) => Promise<void>;
  listModuleManualReleasedStudents: (moduleId: string) => Promise<string[]>;
  setModuleManualStudentRelease: (
    moduleId: string,
    studentId: string,
    released: boolean
  ) => Promise<void>;
  createAssignment: (data: {
    classId: string;
    moduleId: string;
    ownerId: string;
    title: string;
    brief: string;
    lessonId?: string;
  }, ownerId: string) => Promise<string>;
  createQuiz: (data: {
    classId: string;
    moduleId: string;
    ownerId: string;
    title: string;
  }, ownerId: string) => Promise<string>;
  assignQuizToModule: (quizId: string, moduleId: string) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  removeQuizFromModule: (quizId: string) => Promise<void>;
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
  enrollmentUserIds,
  onDeleteModule,
  onUpdateModule,
  listModuleManualReleasedStudents,
  setModuleManualStudentRelease,
  createAssignment,
  createQuiz,
  assignQuizToModule,
  deleteAssignment,
  removeQuizFromModule,
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
    refetchLessons,
    listLessonManualReleasedStudents,
    setLessonManualStudentRelease,
  } = useModuleLessons(classId, mod.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moduleAssignments = assignments.filter((a) => a.moduleId === mod.id);
  const moduleQuizzes = quizzes.filter((q) => q.moduleId === mod.id);

  const contentOrder = useMemo(
    () =>
      normalizeModuleContentOrder(
        mod.moduleContentOrder,
        lessons,
        moduleAssignments,
        moduleQuizzes
      ),
    [mod.moduleContentOrder, lessons, moduleAssignments, moduleQuizzes]
  );

  const sortableIds = useMemo(() => contentOrder.map(moduleContentKey), [contentOrder]);

  const persistContentOrder = useCallback(
    async (next: ModuleContentOrderItem[]) => {
      await onUpdateModule(mod.id, { moduleContentOrder: next });
      const lessonIdsInOrder = next.filter((x) => x.kind === "lesson").map((x) => x.id);
      if (lessonIdsInOrder.length > 0) {
        const batch = writeBatch(db);
        lessonIdsInOrder.forEach((id, i) => {
          batch.update(doc(db, "lessons", id), { order: i });
        });
        await batch.commit();
      }
      await refetchLessons();
    },
    [mod.id, onUpdateModule, refetchLessons]
  );

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

  const handleContentDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(contentOrder, oldIndex, newIndex);
    void persistContentOrder(next);
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

  const handleDeleteLesson = async (lesson: LessonWithId) => {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    if (editingLessonId === lesson.id) setEditingLessonId(null);
    await deleteLesson(lesson.id);
    const remainingLessons = lessons.filter((l) => l.id !== lesson.id);
    const next = normalizeModuleContentOrder(
      mod.moduleContentOrder,
      remainingLessons,
      moduleAssignments,
      moduleQuizzes
    );
    await persistContentOrder(next);
    onLessonCreated();
  };

  const handleDeleteAssignment = async (a: AssignmentWithId) => {
    if (!confirm(`Delete assignment "${a.title}"?`)) return;
    await deleteAssignment(a.id);
    const remaining = moduleAssignments.filter((x) => x.id !== a.id);
    const next = normalizeModuleContentOrder(
      mod.moduleContentOrder,
      lessons,
      remaining,
      moduleQuizzes
    );
    await persistContentOrder(next);
  };

  const handleRemoveQuizFromModule = async (q: QuizWithId) => {
    if (
      !confirm(
        `Remove quiz "${q.title}" from this module? The quiz will stay in your course library.`
      )
    )
      return;
    await removeQuizFromModule(q.id);
    const remaining = moduleQuizzes.filter((x) => x.id !== q.id);
    const next = normalizeModuleContentOrder(
      mod.moduleContentOrder,
      lessons,
      moduleAssignments,
      remaining
    );
    await persistContentOrder(next);
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
          <ModuleProgressionPanel
            module={mod}
            enrollmentUserIds={enrollmentUserIds}
            onUpdateModule={onUpdateModule}
            listModuleManualReleasedStudents={listModuleManualReleasedStudents}
            setModuleManualStudentRelease={setModuleManualStudentRelease}
          />
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

          {/* Module content: unified order (lessons, assignments, quizzes) */}
          {lessonsLoading ? (
            <p className="py-2 text-sm text-gray-500">Loading lessons...</p>
          ) : contentOrder.length === 0 && documentRefs.length === 0 ? (
            <p className="py-3 text-center text-sm text-gray-400">
              This module is empty. Use the buttons above to add content.
            </p>
          ) : (
            <div className="space-y-1">
              {contentOrder.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleContentDragEnd}
                >
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    {contentOrder.map((item, index) => {
                      const sid = moduleContentKey(item);
                      if (item.kind === "lesson") {
                        const lesson = lessons.find((l) => l.id === item.id);
                        if (!lesson) return null;
                        const lessonOrderIndex = lessons
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .findIndex((l) => l.id === lesson.id);
                        return (
                          <div key={sid}>
                            <div className="flex items-center gap-1">
                              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-600 bg-blue-50">
                                Lesson
                              </span>
                              <span
                                className="shrink-0 min-w-[1.5rem] rounded bg-blue-100/80 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-blue-800"
                                title="Order in this module"
                              >
                                {index + 1}
                              </span>
                              <SortableModuleContentRow
                                sortableId={sid}
                                titleContent={
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingLessonId(
                                        editingLessonId === lesson.id ? null : lesson.id
                                      )
                                    }
                                    className={`w-full px-2 py-3 text-left text-sm ${
                                      editingLessonId === lesson.id
                                        ? "font-medium text-gray-900"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {lesson.title}
                                  </button>
                                }
                                onDelete={() => void handleDeleteLesson(lesson)}
                                deleteAriaLabel={`Delete lesson ${index + 1}`}
                                presentHref={`/teacher/class/${classId}/present?lessonId=${lesson.id}`}
                              />
                            </div>
                            {editingLessonId === lesson.id && editingLesson && (
                              <div className="ml-6 mt-1 mb-2 rounded-lg border border-gray-200 bg-white p-4">
                                <LessonProgressionPanel
                                  lesson={editingLesson}
                                  lessonOrderIndex={lessonOrderIndex >= 0 ? lessonOrderIndex : 0}
                                  enrollmentUserIds={enrollmentUserIds}
                                  onUpdateLesson={updateLesson}
                                  listLessonManualReleasedStudents={listLessonManualReleasedStudents}
                                  setLessonManualStudentRelease={setLessonManualStudentRelease}
                                />
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
                        );
                      }
                      if (item.kind === "assignment") {
                        const a = moduleAssignments.find((x) => x.id === item.id);
                        if (!a) return null;
                        return (
                          <div key={sid} className="flex items-center gap-1">
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 bg-amber-50">
                              Assignment
                            </span>
                            <span
                              className="shrink-0 min-w-[1.5rem] rounded bg-amber-100/80 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-amber-900"
                              title="Order in this module"
                            >
                              {index + 1}
                            </span>
                            <SortableModuleContentRow
                              sortableId={sid}
                              titleContent={
                                <Link
                                  to={`/teacher/class/${classId}/assignment/${a.id}`}
                                  className="block truncate px-2 py-3 text-sm text-gray-900 no-underline hover:text-primary hover:underline"
                                >
                                  {a.title}
                                </Link>
                              }
                              onDelete={() => void handleDeleteAssignment(a)}
                              deleteAriaLabel={`Delete assignment ${index + 1}`}
                              presentHref={`/teacher/class/${classId}/assignment/${a.id}`}
                            />
                          </div>
                        );
                      }
                      const q = moduleQuizzes.find((x) => x.id === item.id);
                      if (!q) return null;
                      return (
                        <div key={sid} className="flex items-center gap-1">
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-purple-700 bg-purple-50">
                            Quiz
                          </span>
                          <span
                            className="shrink-0 min-w-[1.5rem] rounded bg-purple-100/80 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-purple-900"
                            title="Order in this module"
                          >
                            {index + 1}
                          </span>
                          <SortableModuleContentRow
                            sortableId={sid}
                            titleContent={
                              <Link
                                to={`/teacher/class/${classId}/quiz/${q.id}/edit`}
                                className="block truncate px-2 py-3 text-sm text-gray-900 no-underline hover:text-primary hover:underline"
                              >
                                {q.title}
                              </Link>
                            }
                            onDelete={() => void handleRemoveQuizFromModule(q)}
                            deleteAriaLabel={`Remove quiz from module ${index + 1}`}
                            presentHref={`/teacher/class/${classId}/quiz/${q.id}/edit`}
                          />
                        </div>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              )}

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
