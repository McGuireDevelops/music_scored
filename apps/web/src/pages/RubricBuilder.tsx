import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useRubrics, createDefaultAxis, createDefaultCriterion } from "../hooks/useRubrics";
import type { RubricAxis, Criterion } from "@learning-scores/shared";

export default function RubricBuilder() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const { rubrics, loading, createRubric } = useRubrics(user?.uid);
  const [className, setClassName] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAxes, setNewAxes] = useState<RubricAxis[]>([
    createDefaultAxis(`axis-${Date.now()}`),
  ]);

  useEffect(() => {
    if (classId)
      getDoc(doc(db, "classes", classId)).then((s) =>
        setClassName(s.exists() ? s.data().name : "Class")
      );
  }, [classId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    await createRubric({ name: newName.trim(), axes: newAxes });
    setNewName("");
    setNewAxes([createDefaultAxis(`axis-${Date.now()}`)]);
    setShowForm(false);
  };

  const addAxis = () => {
    setNewAxes((prev) => [...prev, createDefaultAxis(`axis-${Date.now()}`)]);
  };

  const updateAxis = (idx: number, data: Partial<RubricAxis>) => {
    setNewAxes((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, ...data } : a))
    );
  };

  const addCriterion = (axisIdx: number) => {
    setNewAxes((prev) =>
      prev.map((a, i) =>
        i === axisIdx
          ? {
              ...a,
              criteria: [
                ...a.criteria,
                createDefaultCriterion(`criterion-${Date.now()}`),
              ],
            }
          : a
      )
    );
  };

  const updateCriterion = (
    axisIdx: number,
    criterionIdx: number,
    data: Partial<Criterion>
  ) => {
    setNewAxes((prev) =>
      prev.map((a, i) =>
        i === axisIdx
          ? {
              ...a,
              criteria: a.criteria.map((c, j) =>
                j === criterionIdx ? { ...c, ...data } : c
              ),
            }
          : a
      )
    );
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to={`/teacher/class/${classId}`}
          style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to {className || "class"}
        </Link>
        <h2>Rubrics</h2>
        {loading && <p>Loading…</p>}
        {!loading && rubrics.length === 0 && !showForm && (
          <p>No rubrics yet. Create one to get started.</p>
        )}
        {!loading && rubrics.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {rubrics.map((r) => (
              <li
                key={r.id}
                style={{
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <strong>{r.name}</strong> – {r.axes.length} axes
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ marginTop: "1rem" }}
        >
          {showForm ? "Cancel" : "Create rubric"}
        </button>
        {showForm && (
          <form onSubmit={handleCreate} style={{ marginTop: "1rem", maxWidth: 600 }}>
            <div style={{ marginBottom: "1rem" }}>
              <label>Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Rubric name"
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </div>
            {newAxes.map((axis, ai) => (
              <div
                key={axis.id}
                style={{
                  padding: "1rem",
                  marginBottom: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                }}
              >
                <input
                  value={axis.name}
                  onChange={(e) => updateAxis(ai, { name: e.target.value })}
                  placeholder="Axis name"
                  style={{ marginBottom: "0.5rem", padding: "0.35rem" }}
                />
                {axis.criteria.map((c, ci) => (
                  <div key={c.id} style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
                    <input
                      value={c.description}
                      onChange={(e) =>
                        updateCriterion(ai, ci, { description: e.target.value })
                      }
                      placeholder="Criterion description"
                      style={{ width: "100%", padding: "0.35rem" }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addCriterion(ai)}
                  style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}
                >
                  + Criterion
                </button>
              </div>
            ))}
            <button type="button" onClick={addAxis} style={{ marginRight: "0.5rem" }}>
              + Axis
            </button>
            <button type="submit">Create</button>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
