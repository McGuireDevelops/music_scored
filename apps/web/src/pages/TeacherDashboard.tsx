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
        <h2>Teacher Dashboard</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ marginBottom: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          {showForm ? "Cancel" : "Create class"}
        </button>
        {showForm && (
          <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem", maxWidth: "400px" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                placeholder="Class name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
            {createError && <p style={{ color: "#c00", fontSize: "0.9rem" }}>{createError}</p>}
            <button type="submit" disabled={creating} style={{ padding: "0.5rem 1rem", cursor: creating ? "not-allowed" : "pointer" }}>
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        )}
        {loading && <p>Loading your classes…</p>}
        {error && <p style={{ color: "#c00" }}>{error}</p>}
        {!loading && !error && classes.length === 0 && !showForm && (
          <p>You don&apos;t have any classes yet. Create one to get started.</p>
        )}
        {!loading && classes.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {classes.map((c) => (
              <li
                key={c.id}
                style={{
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  background: "#f5f5f5",
                  borderRadius: "8px",
                }}
              >
                <Link to={`/teacher/class/${c.id}`} style={{ color: "#0066cc", textDecoration: "none", fontWeight: 600 }}>
                  {c.name}
                </Link>
                {c.description && (
                  <p style={{ margin: "0.25rem 0 0", color: "#666", fontSize: "0.9rem" }}>
                    {c.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
