import { useParams, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useClassModules } from "../hooks/useClassModules";
import { useModuleLessonsWithAttached } from "../hooks/useModuleLessonsWithAttached";
import { useTeacherLessons } from "../hooks/useTeacherLessons";
import { useClassAssignments } from "../hooks/useClassAssignments";
import { useClassQuizzes } from "../hooks/useQuizzes";
import { useClassLiveLessons } from "../hooks/useLiveLessons";
import { useClassCohorts } from "../hooks/useCohorts";
import { useClassEnrollments } from "../hooks/useEnrollments";
import { useIssueCertification } from "../hooks/useCertifications";
import { usePlaylistProgress } from "../hooks/usePlaylistProgress";
import { LessonViewer } from "../components/LessonViewer";
import { LessonBuilderForm } from "../components/LessonBuilderForm";
import { SortableLessonItem } from "../components/SortableLessonItem";
import { AddExistingLessonModal } from "../components/AddExistingLessonModal";
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
import { TabBar } from "../components/dashboard/TabBar";
import { ModuleNav } from "../components/dashboard/ModuleNav";
import { ContentPane } from "../components/dashboard/ContentPane";
import { formatUtcForDisplay } from "../utils/timezone";
import type { ModuleWithId } from "../hooks/useClassModules";
import type { LessonWithId } from "../hooks/useModuleLessons";
import { ClassReportsTab } from "../components/reports/ClassReportsTab";
import { PlaylistManager } from "../components/playlists/PlaylistManager";

type Tab = "curriculum" | "assignments" | "quizzes" | "live" | "roster" | "reports" | "playlists" | "community" | "portfolio";

const TABS: { id: Tab; label: string }[] = [
  { id: "curriculum", label: "Modules" },
  { id: "assignments", label: "Assignments" },
  { id: "quizzes", label: "Quizzes" },
  { id: "live", label: "Live" },
  { id: "roster", label: "Roster" },
  { id: "reports", label: "Reports" },
  { id: "playlists", label: "Playlists" },
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

  const {
    lessons,
    allItems,
    loading: lessonsLoading,
    createLesson,
    updateLesson,
    reorderLessons,
    attachLesson,
  } = useModuleLessonsWithAttached(id, selectedModule?.id);

  const { lessons: teacherLessons } = useTeacherLessons(
    isTeacherRoute ? user?.uid : undefined
  );

  const {
    assignments,
    loading: assignmentsLoading,
    createAssignment,
  } = useClassAssignments(id);

  const { quizzes, loading: quizzesLoading } = useClassQuizzes(id);
  const {
    lessons: liveLessons,
    loading: liveLoading,
    createLiveLesson,
    deleteLiveLesson,
  } = useClassLiveLessons(id);
  const {
    cohorts,
    loading: cohortsLoading,
    createCohort,
    deleteCohort,
  } = useClassCohorts(id);
  const {
    enrollments,
    loading: enrollmentsLoading,
    addEnrollment,
    removeEnrollment,
  } = useClassEnrollments(id);
  const { issueCertification } = useIssueCertification(user?.uid);
  const {
    getStatus: getPlaylistStatus,
    addToDoList: addPlaylistToDo,
    setStatus: setPlaylistStatus,
    removeFromDoList: removePlaylistFromDo,
  } = usePlaylistProgress(user?.uid);

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
          to={isTeacherRoute ? "/" : "/student"}
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
                <div className="flex gap-4">
                  <Link
                    to={`/teacher/class/${id}/rubrics`}
                    className="text-sm font-medium text-primary no-underline hover:underline"
                  >
                    Manage rubrics
                  </Link>
                  <Link
                    to={`/teacher/class/${id}/certificate`}
                    className="text-sm font-medium text-primary no-underline hover:underline"
                  >
                    Certificate
                  </Link>
                </div>
              )}
            </div>
            <TabBar
              tabs={TABS.filter((t) => {
                if (t.id === "portfolio") return !isTeacherRoute;
                if (t.id === "roster" || t.id === "reports") return isTeacherRoute;
                return true;
              })}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as Tab)}
            />
            <div className="mt-6">
              {activeTab === "curriculum" && (
                <CurriculumTab
                  isTeacher={isTeacherRoute}
                  modules={modules}
                  lessons={lessons}
                  allItems={allItems}
                  teacherLessons={teacherLessons}
                  modulesLoading={modulesLoading}
                  lessonsLoading={lessonsLoading}
                  modulesError={modulesError}
                  selectedModule={selectedModule}
                  setSelectedModule={setSelectedModule}
                  selectedLesson={selectedLesson}
                  setSelectedLesson={setSelectedLesson}
                  createModule={createModule}
                  createLesson={createLesson}
                  updateLesson={updateLesson}
                  reorderLessons={reorderLessons}
                  attachLesson={attachLesson}
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
              {activeTab === "live" && (
                <LiveLessonsTab
                  lessons={liveLessons}
                  loading={liveLoading}
                  isTeacher={isTeacherRoute}
                  createLiveLesson={createLiveLesson}
                  deleteLiveLesson={deleteLiveLesson}
                  classId={id!}
                  userId={user?.uid ?? ""}
                />
              )}
              {activeTab === "reports" && isTeacherRoute && (
                <ClassReportsTab classId={id!} />
              )}
              {activeTab === "playlists" && (
                <PlaylistManager
                  classId={id!}
                  isTeacher={isTeacherRoute}
                  ownerId={user?.uid ?? ""}
                  progressHandlers={
                    !isTeacherRoute && user?.uid
                      ? {
                          getStatus: getPlaylistStatus,
                          addToDoList: addPlaylistToDo,
                          setStatus: setPlaylistStatus,
                          removeFromDoList: removePlaylistFromDo,
                        }
                      : undefined
                  }
                />
              )}
              {activeTab === "roster" && isTeacherRoute && (
                <RosterTab
                  cohorts={cohorts}
                  enrollments={enrollments}
                  cohortsLoading={cohortsLoading}
                  enrollmentsLoading={enrollmentsLoading}
                  createCohort={createCohort}
                  deleteCohort={deleteCohort}
                  addEnrollment={addEnrollment}
                  removeEnrollment={removeEnrollment}
                  issueCertification={issueCertification}
                  classId={id!}
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
  allItems,
  teacherLessons,
  modulesLoading,
  lessonsLoading,
  modulesError,
  selectedModule,
  setSelectedModule,
  selectedLesson,
  setSelectedLesson,
  createModule,
  createLesson,
  updateLesson,
  reorderLessons,
  attachLesson,
  deleteModule,
  classId,
  userId,
}: {
  isTeacher: boolean;
  modules: ModuleWithId[];
  lessons: LessonWithId[];
  allItems: import("../hooks/useModuleLessonsWithAttached").ModuleLessonItem[];
  teacherLessons: import("../hooks/useTeacherLessons").TeacherLessonEnriched[];
  modulesLoading: boolean;
  lessonsLoading: boolean;
  modulesError: string | null;
  selectedModule: ModuleWithId | null;
  setSelectedModule: (m: ModuleWithId | null) => void;
  selectedLesson: LessonWithId | null;
  setSelectedLesson: (l: LessonWithId | null) => void;
  createModule: (data: { name: string; releaseMode: "time-released" | "mastery-based" }) => Promise<void>;
  createLesson: (data: Omit<LessonWithId, "id">, ownerId: string) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<LessonWithId>) => Promise<void>;
  reorderLessons: (fromIndex: number, toIndex: number) => Promise<void>;
  attachLesson: (sourceLessonId: string, sourceClassId: string) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  classId: string;
  userId: string;
}) {
  const [showLessonForm, setShowLessonForm] = useState<"create" | "edit" | null>(null);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreateModule = async (name: string) => {
    await createModule({ name, releaseMode: "time-released" });
  };

  const handleCloneLesson = async (source: LessonWithId) => {
    if (!selectedModule || !userId) return;
    await createLesson(
      {
        classId,
        moduleId: selectedModule.id,
        ownerId: userId,
        title: source.title,
        type: source.type,
        content: source.content,
        summary: source.summary,
        mediaRefs: source.mediaRefs,
        order: lessons.length,
      },
      userId
    );
  };

  const handleSaveLesson = async (
    data: {
      title: string;
      content?: string;
      summary?: string;
      type: "video" | "audio" | "score" | "text";
      mediaRefs?: import("@learning-scores/shared").MediaReference[];
    },
    updateMode?: import("../components/LessonBuilderForm").LessonUpdateMode
  ) => {
    if (!selectedModule || !userId) return;
    if (showLessonForm === "create" || !selectedLesson) {
      await createLesson(
        {
          classId,
          moduleId: selectedModule.id,
          ownerId: userId,
          title: data.title,
          type: data.type,
          content: data.content,
          summary: data.summary,
          mediaRefs: data.mediaRefs,
          order: lessons.length,
        },
        userId
      );
    } else {
      await updateLesson(selectedLesson.id, {
        title: data.title,
        content: data.content,
        summary: data.summary,
        type: data.type,
        mediaRefs: data.mediaRefs,
      }, updateMode);
    }
    setShowLessonForm(null);
    setSelectedLesson(null);
  };

  const contentPaneTitle = selectedModule
    ? (() => {
        const idx = modules.findIndex((m) => m.id === selectedModule.id);
        return idx >= 0 ? `Module ${idx + 1}: ${selectedModule.name}` : selectedModule.name;
      })()
    : undefined;

  return (
    <div className="flex min-w-0 w-full flex-col gap-6 overflow-hidden lg:flex-row lg:items-start lg:gap-8">
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
      <ContentPane breadcrumb={selectedModule ? "Course content" : undefined} title={contentPaneTitle}>
        {!selectedModule && (
          <p className="text-gray-600">Select a module to view its content.</p>
        )}
        {selectedModule && (
          <>
            {modulesError && (
              <p className="mb-4 text-sm text-red-600">{modulesError}</p>
            )}
            {lessonsLoading && <p className="text-gray-500">Loading lessons…</p>}
            {!lessonsLoading && allItems.length === 0 && !isTeacher && (
              <p className="text-gray-600">No lessons in this module.</p>
            )}
            {isTeacher && selectedModule && (
              <div className="mb-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLessonForm("create");
                    setSelectedLesson(null);
                  }}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  Add lesson
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddExistingModal(true)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Add existing lesson
                </button>
              </div>
            )}
            <AddExistingLessonModal
              isOpen={showAddExistingModal}
              onClose={() => setShowAddExistingModal(false)}
              teacherLessons={teacherLessons}
              currentModuleLessonIds={allItems.map((i) => i.lesson.id)}
              onAttach={attachLesson}
              onClone={handleCloneLesson}
            />
            {((showLessonForm === "create") || (showLessonForm === "edit" && selectedLesson)) && selectedModule && isTeacher && (
              <div className="mb-6 rounded-card border border-gray-200 bg-white p-6 shadow-card">
                <h4 className="mb-4 font-semibold text-gray-900">
                  {showLessonForm === "create" ? "New lesson" : "Edit lesson"}
                </h4>
                <LessonBuilderForm
                  lesson={showLessonForm === "edit" ? selectedLesson : null}
                  classId={classId}
                  moduleId={selectedModule.id}
                  userId={userId}
                  onSave={handleSaveLesson}
                  onCancel={() => {
                    setShowLessonForm(null);
                    if (showLessonForm === "create") setSelectedLesson(null);
                  }}
                  isNew={showLessonForm === "create"}
                />
              </div>
            )}
            {!lessonsLoading && allItems.length > 0 && showLessonForm !== "create" && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    const ownedIds = lessons.map((l) => l.id);
                    const oldIndex = ownedIds.indexOf(active.id as string);
                    const newIndex = ownedIds.indexOf(over.id as string);
                    if (oldIndex >= 0 && newIndex >= 0) {
                      reorderLessons(oldIndex, newIndex);
                    }
                  }
                }}
              >
                <SortableContext
                  items={lessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {allItems.map((item) =>
                      item.type === "owned" ? (
                        <SortableLessonItem
                          key={item.id}
                          lesson={item.lesson}
                          isSelected={selectedLesson?.id === item.lesson.id}
                          onSelect={() => {
                            setSelectedLesson(item.lesson);
                            setShowLessonForm(null);
                          }}
                          disabled={!isTeacher}
                        />
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedLesson(item.lesson);
                            setShowLessonForm(null);
                          }}
                          className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition-colors ${
                            selectedLesson?.id === item.lesson.id
                              ? "bg-gray-100 font-medium text-gray-900"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-primary/80">↗ {item.lesson.title}</span>
                        </button>
                      )
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {selectedLesson && showLessonForm !== "edit" && showLessonForm !== "create" && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                {isTeacher && (
                  <button
                    type="button"
                    onClick={() => setShowLessonForm("edit")}
                    className="mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit lesson
                  </button>
                )}
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

function RosterTab({
  cohorts,
  enrollments,
  cohortsLoading,
  enrollmentsLoading,
  createCohort,
  deleteCohort,
  addEnrollment,
  removeEnrollment,
  issueCertification,
  classId,
}: {
  cohorts: import("../hooks/useCohorts").CohortWithId[];
  enrollments: import("../hooks/useEnrollments").EnrollmentWithId[];
  cohortsLoading: boolean;
  enrollmentsLoading: boolean;
  createCohort: (data: { name: string; limit?: number }) => Promise<void>;
  deleteCohort: (id: string) => Promise<void>;
  addEnrollment: (userId: string, cohortId?: string, status?: string) => Promise<void>;
  removeEnrollment: (userId: string) => Promise<void>;
  classId: string;
}) {
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortCreating, setNewCohortCreating] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addCohortId, setAddCohortId] = useState("");
  const [addingEnrollment, setAddingEnrollment] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [issuingFor, setIssuingFor] = useState<string | null>(null);

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    setNewCohortCreating(true);
    try {
      await createCohort({ name: newCohortName.trim() });
      setNewCohortName("");
    } finally {
      setNewCohortCreating(false);
    }
  };

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddingEnrollment(true);
    setEnrollmentError(null);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "users"),
          where("email", "==", addEmail.trim().toLowerCase())
        )
      );
      if (snapshot.empty) {
        setEnrollmentError("No user found with that email");
        return;
      }
      const userDoc = snapshot.docs[0];
      await addEnrollment(userDoc.id, addCohortId || undefined);
      setAddEmail("");
      setAddCohortId("");
    } catch (err) {
      setEnrollmentError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAddingEnrollment(false);
    }
  };

  const handleIssueCert = async (userId: string) => {
    if (!issueCertification) return;
    setIssuingFor(userId);
    try {
      await issueCertification({ userId, classId });
    } finally {
      setIssuingFor(null);
    }
  };

  return (
    <ContentPane title="Roster">
      <section className="mb-8">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Cohorts</h3>
        {cohortsLoading && <p className="text-gray-500">Loading…</p>}
        {!cohortsLoading && (
          <>
            <form onSubmit={handleCreateCohort} className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Cohort name"
                value={newCohortName}
                onChange={(e) => setNewCohortName(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={newCohortCreating}
                className="rounded-lg bg-primary px-4 py-2 text-white"
              >
                {newCohortCreating ? "Creating…" : "Create cohort"}
              </button>
            </form>
            <div className="space-y-2">
              {cohorts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span>{c.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteCohort(c.id)}
                    className="text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section>
        <h3 className="mb-4 text-lg font-medium text-gray-900">Enrollments</h3>
        {enrollmentsLoading && <p className="text-gray-500">Loading…</p>}
        <form onSubmit={handleAddEnrollment} className="mb-4 flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="Student email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <select
            value={addCohortId}
            onChange={(e) => setAddCohortId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">No cohort</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addingEnrollment}
            className="rounded-lg bg-primary px-4 py-2 text-white"
          >
            {addingEnrollment ? "Adding…" : "Add student"}
          </button>
        </form>
        {enrollmentError && (
          <p className="mb-2 text-sm text-red-600">{enrollmentError}</p>
        )}
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <Link
                to={`/teacher/class/${classId}/student/${e.userId}`}
                className="font-medium text-primary no-underline hover:underline"
              >
                {e.userId}
              </Link>
              <div className="flex items-center gap-2">
                {e.cohortId && (
                  <span className="text-sm text-gray-500">
                    {cohorts.find((c) => c.id === e.cohortId)?.name ?? e.cohortId}
                  </span>
                )}
                {issueCertification && (
                  <button
                    type="button"
                    onClick={() => handleIssueCert(e.userId)}
                    disabled={issuingFor === e.userId}
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {issuingFor === e.userId ? "Issuing…" : "Issue certification"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeEnrollment(e.userId)}
                  className="text-sm text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ContentPane>
  );
}

function LiveLessonsTab({
  lessons,
  loading,
  isTeacher,
  createLiveLesson,
  deleteLiveLesson,
  classId,
  userId,
}: {
  lessons: import("../hooks/useLiveLessons").LiveLessonWithId[];
  loading: boolean;
  isTeacher: boolean;
  createLiveLesson: (data: {
    classId: string;
    ownerId: string;
    title: string;
    scheduledAt: number;
    duration?: number;
  }) => Promise<void>;
  deleteLiveLesson: (id: string) => Promise<void>;
  classId: string;
  userId: string;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newScheduledAt || !userId) return;
    setCreating(true);
    try {
      const scheduledAt = new Date(newScheduledAt).getTime();
      const duration = newDuration ? parseInt(newDuration, 10) : undefined;
      await createLiveLesson({
        classId,
        ownerId: userId,
        title: newTitle.trim(),
        scheduledAt,
        duration,
      });
      setNewTitle("");
      setNewScheduledAt("");
      setNewDuration("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ContentPane title="Live lessons">
      {isTeacher && (
        <form onSubmit={handleCreate} className="mb-6 max-w-md space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly Q&A"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Scheduled at
            </label>
            <input
              type="datetime-local"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Duration (minutes, optional)
            </label>
            <input
              type="number"
              min={1}
              placeholder="60"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white"
          >
            {creating ? "Creating…" : "Create live lesson"}
          </button>
        </form>
      )}
      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && lessons.length === 0 && (
        <p className="text-gray-600">No live lessons scheduled.</p>
      )}
      {!loading && lessons.length > 0 && (
        <div className="space-y-3">
          {lessons.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div>
                <span className="font-medium text-gray-900">{l.title}</span>
                <p className="mt-1 text-sm text-gray-600">
                  {formatUtcForDisplay(l.scheduledAt)}
                  {l.duration ? ` • ${l.duration} min` : ""}
                </p>
              </div>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => deleteLiveLesson(l.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
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
