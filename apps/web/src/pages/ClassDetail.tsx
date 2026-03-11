import { useParams, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useClassModules } from "../hooks/useClassModules";
import { useModuleLessons } from "../hooks/useModuleLessons";
import { useClassAssignments } from "../hooks/useClassAssignments";
import { useClassQuizzes } from "../hooks/useQuizzes";
import { LessonViewer } from "../components/LessonViewer";
import { TabBar } from "../components/dashboard/TabBar";
import { ModuleNav } from "../components/dashboard/ModuleNav";
import { ContentPane } from "../components/dashboard/ContentPane";
import { formatUtcForDisplay } from "../utils/timezone";
import type { ModuleWithId } from "../hooks/useClassModules";
import type { LessonWithId } from "../hooks/useModuleLessons";

type Tab = "curriculum" | "assignments" | "quizzes" | "community" | "portfolio";

const TABS: { id: Tab; label: string }[] = [
  { id: "curriculum", label: "Modules" },
  { id: "assignments", label: "Assignments" },
  { id: "quizzes", label: "Quizzes" },
  { id: "community", label: "Community" },
  { id: "portfolio", label: "Portfolio" },
];

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const { profile, user } = useAuth();
  const isTeacherRoute = pathname.startsWith("/teacher");
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("curriculum");
  const [selectedModule, setSelectedModule] = useState<ModuleWithId | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithId | null>(null);

  const {
    modules,
    loading: modulesLoading,
    error: modulesError,
    createModule,
    deleteModule,
  } = useClassModules(id);

  const { lessons, loading: lessonsLoading, createLesson } = useModuleLessons(
    id,
    selectedModule?.id
  );

  const {
    assignments,
    loading: assignmentsLoading,
    createAssignment,
  } = useClassAssignments(id);

  const { quizzes, loading: quizzesLoading } = useClassQuizzes(id);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "classes", id))
      .then((snap) => {
        if (snap.exists()) setClassName(snap.data().name ?? "Class");
        else setClassName(null);
      })
      .catch(() => setClassName(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <ProtectedRoute requiredRole={isTeacherRoute ? "teacher" : "student"}>
      <div>
        <Link
          to={isTeacherRoute ? "/teacher" : "/student"}
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && !className && (
          <p className="text-gray-600">Class not found.</p>
        )}
        {!loading && className && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                {className}
              </h1>
              {isTeacherRoute && (
                <Link
                  to={`/teacher/class/${id}/rubrics`}
                  className="text-sm font-medium text-primary no-underline hover:underline"
                >
                  Manage rubrics
                </Link>
              )}
            </div>
            <TabBar
              tabs={TABS.filter((t) => t.id !== "portfolio" || !isTeacherRoute)}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as Tab)}
            />
            <div className="mt-6">
              {activeTab === "curriculum" && (
                <CurriculumTab
                  isTeacher={isTeacherRoute}
                  modules={modules}
                  lessons={lessons}
                  modulesLoading={modulesLoading}
                  lessonsLoading={lessonsLoading}
                  modulesError={modulesError}
                  selectedModule={selectedModule}
                  setSelectedModule={setSelectedModule}
                  selectedLesson={selectedLesson}
                  setSelectedLesson={setSelectedLesson}
                  createModule={createModule}
                  createLesson={createLesson}
                  deleteModule={deleteModule}
                  classId={id!}
                  userId={user?.uid ?? ""}
                />
              )}
              {activeTab === "quizzes" && (
                <QuizzesTab
                  quizzes={quizzes}
                  loading={quizzesLoading}
                  classId={id!}
                  isTeacher={isTeacherRoute}
                />
              )}
              {activeTab === "assignments" && (
                <AssignmentsTab
                  assignments={assignments}
                  loading={assignmentsLoading}
                  classId={id!}
                  isTeacher={isTeacherRoute}
                  createAssignment={createAssignment}
                  userId={user?.uid ?? ""}
                />
              )}
              {activeTab === "community" && (
                <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
                  <Link
                    to={`/${isTeacherRoute ? "teacher" : "student"}/class/${id}/community`}
                    className="font-medium text-primary no-underline hover:underline"
                  >
                    View discussions →
                  </Link>
                </div>
              )}
              {activeTab === "portfolio" && !isTeacherRoute && (
                <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
                  <Link
                    to="/student/portfolio"
                    className="font-medium text-primary no-underline hover:underline"
                  >
                    Manage portfolio →
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function CurriculumTab({
  isTeacher,
  modules,
  lessons,
  modulesLoading,
  lessonsLoading,
  modulesError,
  selectedModule,
  setSelectedModule,
  selectedLesson,
  setSelectedLesson,
  createModule,
  createLesson,
  deleteModule,
  classId,
  userId,
}: {
  isTeacher: boolean;
  modules: ModuleWithId[];
  lessons: LessonWithId[];
  modulesLoading: boolean;
  lessonsLoading: boolean;
  modulesError: string | null;
  selectedModule: ModuleWithId | null;
  setSelectedModule: (m: ModuleWithId | null) => void;
  selectedLesson: LessonWithId | null;
  setSelectedLesson: (l: LessonWithId | null) => void;
  createModule: (data: { name: string; releaseMode: "time-released" | "mastery-based" }) => Promise<void>;
  createLesson: (data: Omit<LessonWithId, "id">, ownerId: string) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  classId: string;
  userId: string;
}) {
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<"video" | "audio" | "score" | "text">("text");
  const [creatingLesson, setCreatingLesson] = useState(false);

  const handleCreateModule = async (name: string) => {
    await createModule({ name, releaseMode: "time-released" });
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !newLessonTitle.trim() || !userId) return;
    setCreatingLesson(true);
    try {
      await createLesson(
        {
          classId,
          moduleId: selectedModule.id,
          ownerId: userId,
          title: newLessonTitle.trim(),
          type: newLessonType,
        },
        userId
      );
      setNewLessonTitle("");
    } finally {
      setCreatingLesson(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <ModuleNav
        modules={modules}
        loading={modulesLoading}
        selectedModule={selectedModule}
        onSelectModule={(m) => {
          setSelectedModule(m);
          setSelectedLesson(null);
        }}
        isTeacher={isTeacher}
        onCreateModule={handleCreateModule}
        onDeleteModule={deleteModule}
      />
      <ContentPane
        breadcrumb={selectedModule ? "Course content" : undefined}
        title={selectedModule?.name}
      >
        {!selectedModule && (
          <p className="text-gray-600">Select a module to view its content.</p>
        )}
        {selectedModule && (
          <>
            {modulesError && (
              <p className="mb-4 text-sm text-red-600">{modulesError}</p>
            )}
            {lessonsLoading && <p className="text-gray-500">Loading lessons…</p>}
            {!lessonsLoading && lessons.length === 0 && !isTeacher && (
              <p className="text-gray-600">No lessons in this module.</p>
            )}
            {isTeacher && selectedModule && (
              <form onSubmit={handleCreateLesson} className="mb-6 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Lesson title"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={newLessonType}
                  onChange={(e) => setNewLessonType(e.target.value as typeof newLessonType)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="text">Text</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="score">Score</option>
                </select>
                <button
                  type="submit"
                  disabled={creatingLesson}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingLesson ? "Adding…" : "Add lesson"}
                </button>
              </form>
            )}
            {!lessonsLoading && lessons.length > 0 && (
              <div className="space-y-2">
                {lessons.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedLesson(l)}
                    className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition-colors ${
                      selectedLesson?.id === l.id
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {l.title}
                  </button>
                ))}
              </div>
            )}
            {selectedLesson && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <LessonViewer lesson={selectedLesson} />
              </div>
            )}
          </>
        )}
      </ContentPane>
    </div>
  );
}

function QuizzesTab({
  quizzes,
  loading,
  classId,
  isTeacher,
}: {
  quizzes: { id: string; title: string }[];
  loading: boolean;
  classId: string;
  isTeacher: boolean;
}) {
  return (
    <ContentPane title="Quizzes">
      {isTeacher && (
        <Link
          to={`/teacher/class/${classId}/quizzes`}
          className="mb-4 inline-block font-medium text-primary no-underline hover:underline"
        >
          Manage quizzes →
        </Link>
      )}
      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && quizzes.length === 0 && (
        <p className="text-gray-600">No quizzes yet.</p>
      )}
      {!loading && quizzes.length > 0 && (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <Link
              key={q.id}
              to={isTeacher ? `/teacher/class/${classId}/quizzes` : `/student/class/${classId}/quiz/${q.id}`}
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary/20 hover:shadow-card"
            >
              <span className="font-medium text-gray-900">{q.title}</span>
            </Link>
          ))}
        </div>
      )}
    </ContentPane>
  );
}

function AssignmentsTab({
  assignments,
  loading,
  classId,
  isTeacher,
  createAssignment,
  userId,
}: {
  assignments: { id: string; title: string; brief?: string; deadline?: number }[];
  loading: boolean;
  classId: string;
  isTeacher: boolean;
  createAssignment?: (data: { classId: string; moduleId: string; ownerId: string; title: string; brief: string }, ownerId: string) => Promise<void>;
  userId: string;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newBrief, setNewBrief] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAssignment || !newTitle.trim() || !userId) return;
    setCreating(true);
    try {
      await createAssignment(
        {
          classId,
          moduleId: "",
          ownerId: userId,
          title: newTitle.trim(),
          brief: newBrief.trim() || "No brief provided.",
        },
        userId
      );
      setNewTitle("");
      setNewBrief("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ContentPane title="Assignments">
      {isTeacher && createAssignment && (
        <form onSubmit={handleCreate} className="mb-6 max-w-md space-y-4">
          <div>
            <label htmlFor="assign-title" className="mb-1.5 block text-sm font-medium text-gray-700">
              Assignment title
            </label>
            <input
              id="assign-title"
              type="text"
              placeholder="e.g. Film Score Analysis"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="assign-brief" className="mb-1.5 block text-sm font-medium text-gray-700">
              Brief
            </label>
            <textarea
              id="assign-brief"
              placeholder="Assignment instructions..."
              value={newBrief}
              onChange={(e) => setNewBrief(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create assignment"}
          </button>
        </form>
      )}
      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && assignments.length === 0 && (
        <p className="text-gray-600">No assignments yet.</p>
      )}
      {!loading && assignments.length > 0 && (
        <div className="space-y-4">
          {assignments.map((a) => (
            <Link
              key={a.id}
              to={`${isTeacher ? "/teacher" : "/student"}/class/${classId}/assignment/${a.id}`}
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary/20 hover:shadow-card"
            >
              <strong className="text-gray-900">{a.title}</strong>
              {a.deadline && (
                <p className="mt-1 text-sm text-gray-600">
                  Due: {formatUtcForDisplay(a.deadline)}
                </p>
              )}
              {a.brief && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {a.brief}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </ContentPane>
  );
}
