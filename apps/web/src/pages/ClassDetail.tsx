import { useParams, useLocation, Link, useSearchParams } from "react-router-dom";
import { useState, useRef } from "react";
import { useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useClassModules } from "../hooks/useClassModules";
import { useModuleLessons } from "../hooks/useModuleLessons";
import { useClassLessons } from "../hooks/useClassLessons";
import { useClassAssignments } from "../hooks/useClassAssignments";
import { useClassQuizzes } from "../hooks/useQuizzes";
import { useClassCohorts } from "../hooks/useCohorts";
import { useClassEnrollments } from "../hooks/useEnrollments";
import { useIssueCertification } from "../hooks/useCertifications";
import { usePlaylistProgress } from "../hooks/usePlaylistProgress";
import { LessonViewer } from "../components/LessonViewer";
import { LessonBuilderForm } from "../components/LessonBuilderForm";
import { DocumentViewer } from "../components/media/DocumentViewer";
import { SortableLessonItem } from "../components/SortableLessonItem";
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
import { ModuleNav } from "../components/dashboard/ModuleNav";
import { ContentPane } from "../components/dashboard/ContentPane";
import { formatUtcForDisplay } from "../utils/timezone";
import type { ModuleWithId } from "../hooks/useClassModules";
import type { LessonWithId } from "../hooks/useModuleLessons";
import { ClassReportsTab } from "../components/reports/ClassReportsTab";
import { PlaylistManager } from "../components/playlists/PlaylistManager";

const VALID_TABS = [
  "curriculum", "course", "modules", "lessons", "assignments", "documents", "quizzes",
  "roster", "reports", "playlists", "community", "portfolio",
] as const;
type Tab = (typeof VALID_TABS)[number];

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user } = useAuth();
  const isTeacherRoute = pathname.startsWith("/teacher");
  const tabParam = searchParams.get("tab");
  const activeTab: Tab =
    tabParam && VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "curriculum";
  const [className, setClassName] = useState<string | null>(null);
  const [classDescription, setClassDescription] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<ModuleWithId | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithId | null>(null);
  const [moduleForNewLesson, setModuleForNewLesson] = useState<string | null>(null);
  const {
    modules,
    loading: modulesLoading,
    error: modulesError,
    createModule,
    updateModule,
    deleteModule,
  } = useClassModules(id);

  const {
    lessons,
    loading: lessonsLoading,
    createLesson,
    updateLesson,
    reorderLessons,
  } = useModuleLessons(id, selectedModule?.id);
  const {
    createLesson: createLessonInModule,
    updateLesson: updateLessonInModule,
  } = useModuleLessons(id, moduleForNewLesson ?? undefined);

  const {
    assignments,
    loading: assignmentsLoading,
    createAssignment,
  } = useClassAssignments(id);

  const { quizzes, loading: quizzesLoading } = useClassQuizzes(id);
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
    if (!searchParams.get("tab")) setSearchParams({ tab: "curriculum" }, { replace: true });
  }, [id, searchParams, setSearchParams]);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "classes", id))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setClassName(data?.name ?? "Class");
          setClassDescription(data?.description);
        } else {
          setClassName(null);
          setClassDescription(undefined);
        }
      })
      .catch(() => {
        setClassName(null);
        setClassDescription(undefined);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const { lessons: allLessons, loading: allLessonsLoading, refetch: refetchClassLessons } = useClassLessons(id);

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
            <div className="mt-6">
              {activeTab === "curriculum" && (
                <CurriculumOverviewTab
                  className={className ?? ""}
                  modulesCount={modules.length}
                  lessonsCount={allLessons.length}
                  assignmentsCount={assignments.length}
                  quizzesCount={quizzes.length}
                  loading={modulesLoading || allLessonsLoading}
                />
              )}
              {activeTab === "course" && (
                <CourseTab
                  className={className ?? ""}
                  classDescription={classDescription}
                />
              )}
              {activeTab === "modules" && (
                <ModulesTab
                  isTeacher={isTeacherRoute}
                  modules={modules}
                  modulesLoading={modulesLoading}
                  modulesError={modulesError}
                  selectedModule={selectedModule}
                  setSelectedModule={setSelectedModule}
                  createModule={createModule}
                  updateModule={updateModule}
                  deleteModule={deleteModule}
                  classId={id!}
                  userId={user?.uid ?? ""}
                />
              )}
              {activeTab === "lessons" && (
                <LessonsTab
                  isTeacher={isTeacherRoute}
                  modules={modules}
                  allLessons={allLessons}
                  loading={allLessonsLoading}
                  moduleForNewLesson={moduleForNewLesson}
                  setModuleForNewLesson={setModuleForNewLesson}
                  createLesson={createLessonInModule}
                  updateLesson={updateLessonInModule}
                  refetchLessons={refetchClassLessons}
                  classId={id!}
                  userId={user?.uid ?? ""}
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
                  modules={modules}
                />
              )}
              {activeTab === "documents" && (
                <DocumentsTab
                  modules={modules}
                  lessons={allLessons}
                  loading={allLessonsLoading}
                  isTeacher={isTeacherRoute}
                  updateModule={updateModule}
                  classId={id!}
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

const MODULE_DOCUMENT_ACCEPT =
  "application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx";

function ModuleDocumentsBlock({
  module,
  classId,
  updateModule,
}: {
  module: ModuleWithId;
  classId: string;
  updateModule: (moduleId: string, data: Partial<ModuleWithId>) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRefs = module.documentRefs ?? [];

  const handleAddDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !classId || !module.id) return;
    e.target.value = "";
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `classes/${classId}/modules/${module.id}/documents/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      await updateModule(module.id, {
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
    await updateModule(module.id, { documentRefs: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Module documents:</span>
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
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Add PDF or Word"}
      </button>
      {documentRefs.map((r, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
        >
          {r.resourceId.split("/").pop()}
          <button
            type="button"
            onClick={() => handleRemoveDocument(i)}
            className="text-red-600 hover:underline"
            aria-label="Remove"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}

function CurriculumOverviewTab({
  className,
  modulesCount,
  lessonsCount,
  assignmentsCount,
  quizzesCount,
  loading,
}: {
  className: string;
  modulesCount: number;
  lessonsCount: number;
  assignmentsCount: number;
  quizzesCount: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <ContentPane title="Curriculum">
        <p className="text-gray-500">Loading…</p>
      </ContentPane>
    );
  }
  return (
    <ContentPane title="Curriculum">
      <p className="mb-4 text-gray-700">
        This course contains the following structure. Use the tabs to manage each part.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-semibold text-gray-900">{modulesCount}</div>
          <div className="text-sm text-gray-600">Modules</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-semibold text-gray-900">{lessonsCount}</div>
          <div className="text-sm text-gray-600">Lessons</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-semibold text-gray-900">{assignmentsCount}</div>
          <div className="text-sm text-gray-600">Assignments</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-semibold text-gray-900">{quizzesCount}</div>
          <div className="text-sm text-gray-600">Quizzes</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Hierarchy: Curriculum → Course ({className}) → Modules → Lessons & Assignments. Documents can be attached to lessons or modules; quizzes can be assigned to a lesson, module, or the whole course.
      </p>
    </ContentPane>
  );
}

function CourseTab({
  className,
  classDescription,
}: {
  className: string;
  classDescription?: string;
}) {
  return (
    <ContentPane title="Course">
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Course name</label>
          <p className="mt-1 text-gray-900">{className}</p>
        </div>
        {classDescription != null && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{classDescription}</p>
          </div>
        )}
        {classDescription == null && (
          <p className="text-sm text-gray-500">No description set for this course.</p>
        )}
      </div>
    </ContentPane>
  );
}

function ModulesTab({
  isTeacher,
  modules,
  modulesLoading,
  modulesError,
  selectedModule,
  setSelectedModule,
  createModule,
  updateModule,
  deleteModule,
  classId,
  userId,
}: {
  isTeacher: boolean;
  modules: ModuleWithId[];
  modulesLoading: boolean;
  modulesError: string | null;
  selectedModule: ModuleWithId | null;
  setSelectedModule: (m: ModuleWithId | null) => void;
  createModule: (data: { name: string; releaseMode: "time-released" | "mastery-based" }) => Promise<void>;
  updateModule: (moduleId: string, data: Partial<ModuleWithId>) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  classId: string;
  userId: string;
}) {
  const handleCreateModule = async (name: string) => {
    await createModule({ name, releaseMode: "time-released" });
  };

  return (
    <div className="flex min-w-0 w-full flex-col gap-6 overflow-hidden lg:flex-row lg:items-start lg:gap-8">
      <ModuleNav
        modules={modules}
        loading={modulesLoading}
        selectedModule={selectedModule}
        onSelectModule={setSelectedModule}
        isTeacher={isTeacher}
        onCreateModule={handleCreateModule}
        onDeleteModule={deleteModule}
      />
      <ContentPane
        breadcrumb={selectedModule ? "Module details" : undefined}
        title={selectedModule?.name}
      >
        {!selectedModule && (
          <p className="text-gray-600">Select a module to view its details and documents.</p>
        )}
        {selectedModule && (
          <>
            {modulesError && (
              <p className="mb-4 text-sm text-red-600">{modulesError}</p>
            )}
            <div className="mb-4">
              <span className="text-sm text-gray-600">Release mode: </span>
              <span className="text-sm font-medium text-gray-900">{selectedModule.releaseMode}</span>
            </div>
            <ModuleDocumentsBlock
              module={selectedModule}
              classId={classId}
              updateModule={updateModule}
            />
            {selectedModule.documentRefs && selectedModule.documentRefs.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-2 text-sm font-medium text-gray-700">Module documents</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedModule.documentRefs.map((docRef, i) => (
                    <DocumentViewer key={i} mediaRef={docRef} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </ContentPane>
    </div>
  );
}

function LessonsTab({
  isTeacher,
  modules,
  allLessons,
  loading,
  moduleForNewLesson,
  setModuleForNewLesson,
  createLesson,
  updateLesson,
  refetchLessons,
  classId,
  userId,
}: {
  isTeacher: boolean;
  modules: ModuleWithId[];
  allLessons: LessonWithId[];
  loading: boolean;
  moduleForNewLesson: string | null;
  setModuleForNewLesson: (id: string | null) => void;
  createLesson: (data: Omit<LessonWithId, "id">, ownerId: string) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<LessonWithId>, updateMode?: "push" | "newVersion") => Promise<void>;
  refetchLessons: () => Promise<void>;
  classId: string;
  userId: string;
}) {
  const [editingLesson, setEditingLesson] = useState<LessonWithId | null>(null);
  const [viewingLesson, setViewingLesson] = useState<LessonWithId | null>(null);
  const lessonsByModule = modules.map((m) => ({
    module: m,
    lessons: allLessons.filter((l) => l.moduleId === m.id),
  }));

  const handleSaveLesson = async (
    data: {
      title: string;
      content?: string;
      summary?: string;
      type: "video" | "audio" | "score" | "text";
      mediaRefs?: import("@learning-scores/shared").MediaReference[];
    },
    updateMode?: "push" | "newVersion"
  ) => {
    if (!moduleForNewLesson || !userId) return;
    const order = allLessons.filter((l) => l.moduleId === moduleForNewLesson).length;
    await createLesson(
      {
        classId,
        moduleId: moduleForNewLesson,
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
    setModuleForNewLesson(null);
    await refetchLessons();
  };

  const handleSaveEdit = async (
    data: {
      title: string;
      content?: string;
      summary?: string;
      type: "video" | "audio" | "score" | "text";
      mediaRefs?: import("@learning-scores/shared").MediaReference[];
    },
    updateMode?: "push" | "newVersion"
  ) => {
    if (!editingLesson || !userId) return;
    await updateLesson(editingLesson.id, {
      title: data.title,
      content: data.content,
      summary: data.summary,
      type: data.type,
      mediaRefs: data.mediaRefs,
    }, updateMode);
    setEditingLesson(null);
    await refetchLessons();
  };

  if (loading) {
    return (
      <ContentPane title="Lessons">
        <p className="text-gray-500">Loading lessons…</p>
      </ContentPane>
    );
  }

  return (
    <ContentPane title="Lessons">
      {isTeacher && (
        <div className="mb-6">
          {!moduleForNewLesson ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Add lesson to module:</span>
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  setModuleForNewLesson(v || null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              >
                <option value="">Select module</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
              <h4 className="mb-4 font-semibold text-gray-900">New lesson</h4>
              <LessonBuilderForm
                lesson={null}
                classId={classId}
                moduleId={moduleForNewLesson}
                userId={userId}
                onSave={handleSaveLesson}
                onCancel={() => setModuleForNewLesson(null)}
                isNew={true}
              />
            </div>
          )}
        </div>
      )}
      <div className="space-y-6">
        {lessonsByModule.map(({ module: m, lessons: modLessons }) => (
          <div key={m.id}>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">{m.name}</h3>
            {modLessons.length === 0 ? (
              <p className="text-sm text-gray-500">No lessons</p>
            ) : (
              <ul className="space-y-2">
                {modLessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <span className="font-medium text-gray-900">{l.title}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingLesson(l)}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingLesson(l)}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {viewingLesson && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setViewingLesson(null)}
            className="mb-4 text-sm text-gray-600 hover:underline"
          >
            ← Back to list
          </button>
          <LessonViewer lesson={viewingLesson} />
        </div>
      )}
      {editingLesson && (
        <div className="mt-6 rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h4 className="mb-4 font-semibold text-gray-900">Edit lesson</h4>
          <LessonBuilderForm
            lesson={editingLesson}
            classId={classId}
            moduleId={editingLesson.moduleId}
            userId={userId}
            onSave={handleSaveEdit}
            onCancel={() => setEditingLesson(null)}
            isNew={false}
          />
        </div>
      )}
    </ContentPane>
  );
}

function DocumentsTab({
  modules,
  lessons,
  loading,
  isTeacher,
  updateModule,
  classId,
}: {
  modules: ModuleWithId[];
  lessons: LessonWithId[];
  loading: boolean;
  isTeacher: boolean;
  updateModule: (moduleId: string, data: Partial<ModuleWithId>) => Promise<void>;
  classId: string;
}) {
  const moduleDocs = modules.flatMap((m) =>
    (m.documentRefs ?? []).map((ref, i) => ({ source: "module" as const, moduleName: m.name, ref, key: `${m.id}-${i}` }))
  );
  const lessonDocs = lessons.flatMap((l) =>
    (l.mediaRefs ?? []).filter((r) => r.type === "document").map((ref, i) => ({ source: "lesson" as const, lessonTitle: l.title, ref, key: `${l.id}-${i}` }))
  );

  if (loading) {
    return (
      <ContentPane title="Documents">
        <p className="text-gray-500">Loading…</p>
      </ContentPane>
    );
  }

  return (
    <ContentPane title="Documents">
      <p className="mb-4 text-sm text-gray-600">
        Documents attached to modules or lessons. Students can download from the Modules and Lessons tabs.
      </p>
      {moduleDocs.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold text-gray-900">Module documents</h3>
          <div className="flex flex-wrap gap-3">
            {moduleDocs.map((d) => (
              <div key={d.key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <span className="text-xs text-gray-500">{d.moduleName}</span>
                <div className="mt-1">
                  <DocumentViewer mediaRef={d.ref} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {lessonDocs.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-gray-900">Lesson documents</h3>
          <div className="flex flex-wrap gap-3">
            {lessonDocs.map((d) => (
              <div key={d.key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <span className="text-xs text-gray-500">{d.lessonTitle}</span>
                <div className="mt-1">
                  <DocumentViewer mediaRef={d.ref} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {moduleDocs.length === 0 && lessonDocs.length === 0 && (
        <p className="text-gray-500">No documents attached yet. Add documents in Modules or when editing a Lesson.</p>
      )}
    </ContentPane>
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

function AssignmentsTab({
  assignments,
  loading,
  classId,
  isTeacher,
  createAssignment,
  userId,
  modules,
}: {
  assignments: { id: string; title: string; brief?: string; deadline?: number; moduleId?: string; lessonId?: string }[];
  loading: boolean;
  classId: string;
  isTeacher: boolean;
  createAssignment?: (data: { classId: string; moduleId: string; ownerId: string; title: string; brief: string; lessonId?: string }, ownerId: string) => Promise<void>;
  userId: string;
  modules: { id: string; name: string }[];
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newBrief, setNewBrief] = useState("");
  const [newModuleId, setNewModuleId] = useState("");
  const [newLessonId, setNewLessonId] = useState("");
  const [creating, setCreating] = useState(false);
  const { lessons: moduleLessons } = useModuleLessons(
    classId,
    newModuleId || undefined
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAssignment || !newTitle.trim() || !userId || !newModuleId) return;
    setCreating(true);
    try {
      await createAssignment(
        {
          classId,
          moduleId: newModuleId,
          ownerId: userId,
          title: newTitle.trim(),
          brief: newBrief.trim() || "No brief provided.",
          lessonId: newLessonId || undefined,
        },
        userId
      );
      setNewTitle("");
      setNewBrief("");
      setNewModuleId("");
      setNewLessonId("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ContentPane title="Assignments">
      {isTeacher && createAssignment && (
        <form onSubmit={handleCreate} className="mb-6 max-w-md space-y-4">
          <div>
            <label htmlFor="assign-module" className="mb-1.5 block text-sm font-medium text-gray-700">
              Module (required)
            </label>
            <select
              id="assign-module"
              value={newModuleId}
              onChange={(e) => {
                setNewModuleId(e.target.value);
                setNewLessonId("");
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Select module</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          {newModuleId && (
            <div>
              <label htmlFor="assign-lesson" className="mb-1.5 block text-sm font-medium text-gray-700">
                Based on lesson (optional)
              </label>
              <select
                id="assign-lesson"
                value={newLessonId}
                onChange={(e) => setNewLessonId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">None (module-level assignment)</option>
                {moduleLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            disabled={creating || !newModuleId}
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
