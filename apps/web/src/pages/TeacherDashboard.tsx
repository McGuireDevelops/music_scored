import { useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { classes, loading, error, setClasses } = useTeacherClasses(user?.uid);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [stripePriceId, setStripePriceId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreateError("");
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, "classes"), {
        name: name.trim() || "New class",
        description: description.trim() || null,
        teacherId: user.uid,
        createdAt: Date.now(),
      });
      await addDoc(collection(db, "communities"), {
        classId: ref.id,
        ownerId: user.uid,
        name: "General",
        createdAt: Date.now(),
      });
      setClasses((prev) => [
        ...prev,
        {
          id: ref.id,
          name: name.trim() || "New class",
          description: description.trim() || undefined,
          teacherId: user.uid,
        },
      ]);
      setName("");
      setDescription("");
      setIsPaid(false);
      setStripePriceId("");
      setShowForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
              Teaching
            </h1>
            <p className="text-gray-600">
              Manage your classes and course content
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {showForm ? "Cancel" : "Create class"}
          </button>
        </div>
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 max-w-md rounded-card border border-gray-200 bg-white p-6 shadow-card"
          >
            <h3 className="mb-4 font-semibold text-gray-900">New class</h3>
            <div className="mb-4">
              <label htmlFor="class-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Class name
              </label>
              <input
                id="class-name"
                type="text"
                placeholder="e.g. Film Scoring 101"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Paid class</span>
              </label>
              {isPaid && (
                <input
                  type="text"
                  placeholder="Stripe Price ID (e.g. price_...)"
                  value={stripePriceId}
                  onChange={(e) => setStripePriceId(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="class-desc" className="mb-1.5 block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <input
                id="class-desc"
                type="text"
                placeholder="Brief description of the course"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {createError && (
              <p className="mb-4 text-sm text-red-600">{createError}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        )}
        {loading && (
          <p className="text-gray-500">Loading your classes…</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && classes.length === 0 && !showForm && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              You don&apos;t have any classes yet. Create one to get started.
            </p>
          </div>
        )}
        {!loading && classes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                to={`/teacher/class/${c.id}`}
                className="group rounded-card border border-gray-200 bg-white p-6 shadow-card transition-all duration-200 hover:border-primary/20 hover:shadow-cardHover"
              >
                <h3 className="mb-2 font-semibold text-gray-900 transition-colors group-hover:text-primary">
                  {c.name}
                </h3>
                {c.description && (
                  <p className="line-clamp-2 text-sm text-gray-600">
                    {c.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
