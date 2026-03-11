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
import { formatUtcForDisplay } from "../utils/timezone";
import type { ModuleWithId } from "../hooks/useClassModules";
import type { LessonWithId } from "../hooks/useModuleLessons";

type Tab = "curriculum" | "assignments" | "quizzes" | "community" | "portfolio";

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
          style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to dashboard
        </Link>
        {loading && <p>Loading…</p>}
        {!loading && !className && <p>Class not found.</p>}
        {!loading && className && (
          <>
            <h2>{className}</h2>
            {isTeacherRoute && (
              <Link
                to={`/teacher/class/${id}/rubrics`}
                style={{ marginLeft: "1rem", fontSize: "0.9rem" }}
              >
                Manage rubrics
              </Link>
            )}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              {(["curriculum", "assignments", "quizzes", "community", "portfolio"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "0.5rem 1rem",
                      fontWeight: activeTab === tab ? 600 : 400,
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                )
              )}
            </div>

            {activeTab === "curriculum" && (
              <CurriculumTab
                isTeacher={isTeacherRoute}
                modules={modules}
                lessons={lessons}
                modulesLoading={modulesLoading}
                lessonsLoading={lessonsLoading}
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
              <p>
                Community: <Link to={`/${isTeacherRoute ? "teacher" : "student"}/class/${id}/community`}>View discussions</Link>
              </p>
            )}

            {activeTab === "portfolio" && !isTeacherRoute && (
              <p>
                Portfolio: <Link to="/student/portfolio">Manage portfolio</Link>
              </p>
            )}
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
  const [newModuleName, setNewModuleName] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<"video" | "audio" | "score" | "text">("text");
  const [creating, setCreating] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    setCreating(true);
    try {
      await createModule({ name: newModuleName.trim(), releaseMode: "time-released" });
      setNewModuleName("");
    } finally {
      setCreating(false);
    }
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
    <div style={{ display: "flex", gap: "2rem" }}>
      <div style={{ minWidth: 240 }}>
        <h3>Modules</h3>
        {modulesLoading && <p>Loading…</p>}
        {!modulesLoading && modules.length === 0 && (
          <p>No modules yet.</p>
        )}
        {!modulesLoading &&
          modules.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "0.5rem",
                marginBottom: "0.25rem",
                background: selectedModule?.id === m.id ? "#e8e8e8" : "#f5f5f5",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              <div
                onClick={() => {
                  setSelectedModule(m);
                  setSelectedLesson(null);
                }}
              >
                {m.name}
              </div>
              {isTeacher && (
                <button
                  onClick={() => deleteModule(m.id)}
                  style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        {isTeacher && (
          <form onSubmit={handleCreateModule} style={{ marginTop: "1rem" }}>
            <input
              placeholder="New module name"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              style={{ marginRight: "0.5rem", padding: "0.35rem" }}
            />
            <button type="submit" disabled={creating}>
              Add
            </button>
          </form>
        )}
      </div>
      <div style={{ flex: 1 }}>
        {selectedModule && (
          <>
            <h3>{selectedModule.name}</h3>
            {modulesError && <p style={{ color: "#c00" }}>{modulesError}</p>}
            {lessonsLoading && <p>Loading lessons…</p>}
            {!lessonsLoading && lessons.length === 0 && !isTeacher && (
              <p>No lessons in this module.</p>
            )}
            {isTeacher && selectedModule && (
              <form onSubmit={handleCreateLesson} style={{ marginBottom: "1rem" }}>
                <input
                  placeholder="Lesson title"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  style={{ marginRight: "0.5rem", padding: "0.35rem" }}
                />
                <select
                  value={newLessonType}
                  onChange={(e) => setNewLessonType(e.target.value as typeof newLessonType)}
                  style={{ marginRight: "0.5rem", padding: "0.35rem" }}
                >
                  <option value="text">Text</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="score">Score</option>
                </select>
                <button type="submit" disabled={creatingLesson}>
                  Add lesson
                </button>
              </form>
            )}
            {!lessonsLoading && lessons.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {lessons.map((l) => (
                  <li
                    key={l.id}
                    onClick={() => setSelectedLesson(l)}
                    style={{
                      padding: "0.5rem",
                      marginBottom: "0.25rem",
                      background: selectedLesson?.id === l.id ? "#e8e8e8" : "#f5f5f5",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {l.title}
                  </li>
                ))}
              </ul>
            )}
            {selectedLesson && (
              <div style={{ marginTop: "2rem", padding: "1rem", background: "#fafafa" }}>
                <LessonViewer lesson={selectedLesson} />
              </div>
            )}
          </>
        )}
        {!selectedModule && <p>Select a module.</p>}
      </div>
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
    <div>
      <h3>Quizzes</h3>
      {isTeacher && (
        <Link to={`/teacher/class/${classId}/quizzes`} style={{ display: "inline-block", marginBottom: "1rem" }}>
          Manage quizzes
        </Link>
      )}
      {loading && <p>Loading…</p>}
      {!loading && quizzes.length === 0 && <p>No quizzes yet.</p>}
      {!loading &&
        quizzes.map((q) => (
          <div
            key={q.id}
            style={{
              padding: "1rem",
              marginBottom: "0.5rem",
              background: "#f5f5f5",
              borderRadius: 8,
            }}
          >
            {isTeacher ? (
              <Link to={`/teacher/class/${classId}/quiz/${q.id}/edit`}>{q.title}</Link>
            ) : (
              <Link to={`/student/class/${classId}/quiz/${q.id}`}>{q.title}</Link>
            )}
          </div>
        ))}
    </div>
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
          moduleId: "", // could add module selector
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
    <div>
      <h3>Assignments</h3>
      {isTeacher && createAssignment && (
        <form onSubmit={handleCreate} style={{ marginBottom: "1rem" }}>
          <input
            placeholder="Assignment title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ display: "block", marginBottom: "0.5rem", padding: "0.35rem" }}
          />
          <textarea
            placeholder="Brief"
            value={newBrief}
            onChange={(e) => setNewBrief(e.target.value)}
            style={{ display: "block", marginBottom: "0.5rem", padding: "0.35rem", width: "100%", minHeight: 60 }}
          />
          <button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create assignment"}
          </button>
        </form>
      )}
      {loading && <p>Loading…</p>}
      {!loading && assignments.length === 0 && <p>No assignments yet.</p>}
      {!loading &&
        assignments.map((a) => (
          <div
            key={a.id}
            style={{
              padding: "1rem",
              marginBottom: "0.5rem",
              background: "#f5f5f5",
              borderRadius: 8,
            }}
          >
            <Link to={`${isTeacher ? "/teacher" : "/student"}/class/${classId}/assignment/${a.id}`}>
              <strong>{a.title}</strong>
            </Link>
            {a.deadline && (
              <p style={{ fontSize: "0.9rem", color: "#666", margin: 0 }}>
                Due: {formatUtcForDisplay(a.deadline)}
              </p>
            )}
            {a.brief && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                {a.brief.slice(0, 150)}
                {a.brief.length > 150 ? "…" : ""}
              </p>
            )}
          </div>
        ))}
    </div>
  );
}
