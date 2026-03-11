import { useState, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useClassModules } from "../hooks/useClassModules";
import { useClassAssignments } from "../hooks/useClassAssignments";
import { useClassQuizzes } from "../hooks/useQuizzes";
import { useClassLessons } from "../hooks/useClassLessons";
import { CourseBuilderModuleSection } from "./CourseBuilderModuleSection";
import type { Quiz } from "@learning-scores/shared";

interface CourseBuilderProps {
  classId: string;
  className: string;
  classDescription?: string;
  userId: string;
}

export function CourseBuilder({
  classId,
  className: courseName,
  classDescription,
  userId,
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
  const [editingCourse, setEditingCourse] = useState(false);
  const [editName, setEditName] = useState(courseName);
  const [editDescription, setEditDescription] = useState(classDescription ?? "");
  const [savingCourse, setSavingCourse] = useState(false);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    setCreatingModule(true);
    try {
      await createModule({ name: newModuleName.trim(), releaseMode: "time-released" });
      setNewModuleName("");
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
