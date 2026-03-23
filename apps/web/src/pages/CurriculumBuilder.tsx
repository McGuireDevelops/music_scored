import { useState } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import { useTeacherCurricula } from "../hooks/useCurricula";
import type { CurriculumWithId } from "../hooks/useCurricula";

export default function CurriculumBuilder() {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useTeacherClasses(user?.uid);
  const {
    curricula,
    loading: curriculaLoading,
    createCurriculum,
    updateCurriculum,
    deleteCurriculum,
  } = useTeacherCurricula(user?.uid);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loading = classesLoading || curriculaLoading;
  const selected = curricula.find((c) => c.id === selectedId) ?? null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const id = await createCurriculum({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewName("");
      setNewDescription("");
      setShowCreateForm(false);
      setSelectedId(id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Curricula
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Group multiple courses into an overarching curriculum.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setSelectedId(null);
            }}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {showCreateForm ? "Cancel" : "+ New curriculum"}
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h3 className="mb-4 font-semibold text-gray-900">Create curriculum</h3>
            <div className="mb-3">
              <label htmlFor="curr-name" className="mb-1 block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                id="curr-name"
                type="text"
                placeholder="e.g. Film Scoring Certificate Program"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="curr-desc" className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="curr-desc"
                placeholder="Describe what this curriculum covers..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        {loading && <p className="text-gray-500">Loading...</p>}

        {!loading && !selectedId && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {curricula.length === 0 && !showCreateForm && (
              <div className="col-span-full rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="text-gray-500">
                  No curricula yet. Create one to link your courses together.
                </p>
              </div>
            )}
            {curricula.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {c.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {c.courseIds.length} course{c.courseIds.length !== 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>
        )}

        {!loading && selected && (
          <CurriculumDetail
            curriculum={selected}
            classes={classes}
            onUpdate={updateCurriculum}
            onDelete={deleteCurriculum}
            onBack={() => setSelectedId(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

function CurriculumDetail({
  curriculum,
  classes,
  onUpdate,
  onDelete,
  onBack,
}: {
  curriculum: CurriculumWithId;
  classes: { id: string; name: string; description?: string }[];
  onUpdate: (id: string, data: Partial<Pick<CurriculumWithId, "name" | "description" | "courseIds">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState(curriculum.name);
  const [editDescription, setEditDescription] = useState(curriculum.description ?? "");
  const [saving, setSaving] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const linkedCourses = curriculum.courseIds
    .map((id) => classes.find((c) => c.id === id))
    .filter(Boolean) as { id: string; name: string; description?: string }[];

  const availableCourses = classes.filter(
    (c) => !curriculum.courseIds.includes(c.id)
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await onUpdate(curriculum.id, {
        name: editName.trim() || curriculum.name,
        description: editDescription.trim() || undefined,
      });
      setEditingDetails(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCourse = async (courseId: string) => {
    await onUpdate(curriculum.id, {
      courseIds: [...curriculum.courseIds, courseId],
    });
    setShowCourseSelector(false);
  };

  const handleRemoveCourse = async (courseId: string) => {
    await onUpdate(curriculum.id, {
      courseIds: curriculum.courseIds.filter((id) => id !== courseId),
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = curriculum.courseIds.indexOf(active.id as string);
    const newIndex = curriculum.courseIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...curriculum.courseIds];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);
    await onUpdate(curriculum.id, { courseIds: reordered });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(curriculum.id);
      onBack();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
      >
        &larr; Back to curricula
      </button>

      {/* Curriculum header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {editingDetails ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditName(curriculum.name);
                  setEditDescription(curriculum.description ?? "");
                  setEditingDetails(false);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{curriculum.name}</h2>
              {curriculum.description && (
                <p className="mt-1 text-sm text-gray-600">{curriculum.description}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {curriculum.courseIds.length} course{curriculum.courseIds.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/teacher/curriculum/${curriculum.id}/program-timeline`}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-primary no-underline hover:bg-gray-50"
              >
                Program timeline
              </Link>
              <button
                type="button"
                onClick={() => setEditingDetails(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Linked courses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Linked courses</h3>
          <button
            type="button"
            onClick={() => setShowCourseSelector(!showCourseSelector)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {showCourseSelector ? "Cancel" : "+ Add course"}
          </button>
        </div>

        {showCourseSelector && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Select a course to add:</p>
            {availableCourses.length === 0 ? (
              <p className="text-sm text-gray-500">All courses are already linked.</p>
            ) : (
              <div className="space-y-1">
                {availableCourses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleAddCourse(c.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <span className="font-medium text-gray-900">{c.name}</span>
                    <span className="text-xs text-primary">Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {linkedCourses.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
            <p className="text-sm text-gray-500">
              No courses linked yet. Add courses to build this curriculum.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={curriculum.courseIds}
              strategy={verticalListSortingStrategy}
            >
              {linkedCourses.map((course, index) => (
                <SortableCourseItem
                  key={course.id}
                  course={course}
                  index={index}
                  onRemove={() => handleRemoveCourse(course.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SortableCourseItem({
  course,
  index,
  onRemove,
}: {
  course: { id: string; name: string; description?: string };
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/teacher/class/${course.id}?tab=builder`}
          className="font-medium text-gray-900 no-underline hover:text-primary hover:underline"
        >
          {course.name}
        </Link>
        {course.description && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{course.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
        aria-label="Remove course"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
