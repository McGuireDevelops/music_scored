import { useState, useCallback, useRef, useEffect } from "react";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { useClassModules } from "../hooks/useClassModules";
import { useClassAssignments } from "../hooks/useClassAssignments";
import { useClassQuizzes } from "../hooks/useQuizzes";
import { useClassLessons } from "../hooks/useClassLessons";
import { CourseBuilderModuleSection } from "./CourseBuilderModuleSection";
import type { Quiz } from "@learning-scores/shared";
import type { Class } from "../hooks/useTeacherClasses";

interface CourseBuilderProps {
  classId: string;
  className: string;
  classDescription?: string;
  userId: string;
  allClasses?: Class[];
  onSwitchClass?: (classId: string) => void;
  onClassCreated?: (newClass: Class) => void;
}

export function CourseBuilder({
  classId,
  className: courseName,
  classDescription,
  userId,
  allClasses,
  onSwitchClass,
  onClassCreated,
}: CourseBuilderProps) {
  const {
    modules,
    loading: modulesLoading,
    createModule,
    updateModule,
    deleteModule,
  } = useClassModules(classId);

  const {
    assignments,
    loading: assignmentsLoading,
    createAssignment,
  } = useClassAssignments(classId);

  const {
    quizzes,
    loading: quizzesLoading,
    createQuiz,
  } = useClassQuizzes(classId);

  const {
    lessons: allLessons,
    loading: allLessonsLoading,
    refetch: refetchLessons,
  } = useClassLessons(classId);

  const [newModuleName, setNewModuleName] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);
  const [moduleError, setModuleError] = useState("");
  const [editingCourse, setEditingCourse] = useState(false);
  const [editName, setEditName] = useState(courseName);
  const [editDescription, setEditDescription] = useState(classDescription ?? "");
  const [savingCourse, setSavingCourse] = useState(false);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newClassPaid, setNewClassPaid] = useState(false);
  const [newClassStripePriceId, setNewClassStripePriceId] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [createClassError, setCreateClassError] = useState("");
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    }
    if (selectorOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [selectorOpen]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setCreateClassError("");
    setCreatingClass(true);
    try {
      const classData: Record<string, unknown> = {
        name: newClassName.trim() || "New class",
        description: newClassDescription.trim() || null,
        teacherId: userId,
        createdAt: Date.now(),
      };
      if (newClassPaid && newClassStripePriceId.trim()) {
        classData.isPaid = true;
        classData.stripePriceId = newClassStripePriceId.trim();
      }
      const ref = await addDoc(collection(db, "classes"), classData);
      await addDoc(collection(db, "communities"), {
        classId: ref.id,
        ownerId: userId,
        name: "General",
        createdAt: Date.now(),
      });
      const created: Class = {
        id: ref.id,
        name: newClassName.trim() || "New class",
        description: newClassDescription.trim() || undefined,
        teacherId: userId,
      };
      onClassCreated?.(created);
      setNewClassName("");
      setNewClassDescription("");
      setNewClassPaid(false);
      setNewClassStripePriceId("");
      setShowCreateForm(false);
      setSelectorOpen(false);
      onSwitchClass?.(ref.id);
    } catch (err) {
      setCreateClassError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setCreatingClass(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    setCreatingModule(true);
    setModuleError("");
    try {
      await createModule({ name: newModuleName.trim(), releaseMode: "time-released" });
      setNewModuleName("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create module";
      setModuleError(msg);
      console.error("Module create error:", err);
    } finally {
      setCreatingModule(false);
    }
  };

  const handleSaveCourseDetails = async () => {
    setSavingCourse(true);
    try {
      await updateDoc(doc(db, "classes", classId), {
        name: editName.trim() || courseName,
        description: editDescription.trim() || null,
      });
      setEditingCourse(false);
    } finally {
      setSavingCourse(false);
    }
  };

  const handleCreateAssignment = useCallback(
    async (
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
    },
    [createAssignment]
  );

  const handleCreateQuiz = useCallback(
    async (
      data: {
        classId: string;
        moduleId: string;
        ownerId: string;
        title: string;
      },
      ownerId: string
    ) => {
      await createQuiz(
        {
          classId: data.classId,
          moduleId: data.moduleId,
          ownerId: data.ownerId,
          title: data.title,
        } as Omit<Quiz, "id">,
        ownerId
      );
    },
    [createQuiz]
  );

  const loading = modulesLoading || assignmentsLoading || quizzesLoading || allLessonsLoading;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Course selector + create */}
      {allClasses && allClasses.length > 0 && onSwitchClass && (
        <div className="relative mb-6" ref={selectorRef}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSelectorOpen(!selectorOpen); setShowCreateForm(false); }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
            >
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
              <span className="max-w-[200px] truncate">{courseName}</span>
              <svg className={`h-4 w-4 text-gray-400 transition-transform ${selectorOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(!showCreateForm); setSelectorOpen(false); }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New course
            </button>
          </div>

          {selectorOpen && (
            <div className="absolute left-0 z-20 mt-1 w-72 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Your courses
              </div>
              {allClasses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onSwitchClass(c.id); setSelectorOpen(false); }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                    c.id === classId ? "bg-primary/5 font-medium text-primary" : "text-gray-700"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    c.id === classId ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                  }`}>
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{c.name}</div>
                    {c.description && (
                      <div className="truncate text-xs text-gray-400">{c.description}</div>
                    )}
                  </div>
                  {c.id === classId && (
                    <svg className="h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create new course form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateClass}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-4 font-semibold text-gray-900">Create a new course</h3>
          <div className="mb-3">
            <label htmlFor="new-class-name" className="mb-1 block text-sm font-medium text-gray-700">
              Course name
            </label>
            <input
              id="new-class-name"
              type="text"
              placeholder="e.g. Film Scoring 101"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="new-class-desc" className="mb-1 block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <input
              id="new-class-desc"
              type="text"
              placeholder="Brief description of the course"
              value={newClassDescription}
              onChange={(e) => setNewClassDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mb-3">
            <label className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={newClassPaid}
                onChange={(e) => setNewClassPaid(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Paid class</span>
            </label>
            {newClassPaid && (
              <input
                type="text"
                placeholder="Stripe Price ID (e.g. price_...)"
                value={newClassStripePriceId}
                onChange={(e) => setNewClassStripePriceId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>
          {createClassError && (
            <p className="mb-3 text-sm text-red-600">{createClassError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creatingClass}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingClass ? "Creating..." : "Create course"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setCreateClassError(""); }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Course header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {editingCourse ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Course name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Brief description of the course"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveCourseDetails}
                disabled={savingCourse}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {savingCourse ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditName(courseName);
                  setEditDescription(classDescription ?? "");
                  setEditingCourse(false);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">{courseName}</h2>
              {classDescription && (
                <p className="mt-1 text-sm text-gray-600">{classDescription}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>{modules.length} modules</span>
                <span>{allLessons.length} lessons</span>
                <span>{assignments.length} assignments</span>
                <span>{quizzes.length} quizzes</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingCourse(true)}
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Edit details
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <p className="py-4 text-center text-sm text-gray-500">Loading course content...</p>
      )}

      {/* Module sections */}
      {!loading && (
        <div className="space-y-4">
          {modules.map((mod, index) => (
            <CourseBuilderModuleSection
              key={mod.id}
              module={mod}
              moduleIndex={index}
              classId={classId}
              userId={userId}
              assignments={assignments}
              quizzes={quizzes}
              onDeleteModule={deleteModule}
              onUpdateModule={updateModule}
              createAssignment={handleCreateAssignment}
              createQuiz={handleCreateQuiz}
              onLessonCreated={refetchLessons}
            />
          ))}

          {/* Add module */}
          <form
            onSubmit={handleCreateModule}
            className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 transition-colors hover:border-gray-300"
          >
            <input
              type="text"
              placeholder="New module name..."
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={creatingModule || !newModuleName.trim()}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingModule ? "Adding..." : "+ Add module"}
            </button>
          </form>
          {moduleError && (
            <p className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{moduleError}</p>
          )}

          {modules.length === 0 && !loading && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500">
                No modules yet. Add your first module above to start building the course.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
