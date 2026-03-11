import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useStudentClasses } from "../hooks/useStudentClasses";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { classes, loading, error } = useStudentClasses(user?.uid);

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <h2>Student Dashboard</h2>
        {loading && <p>Loading your classes…</p>}
        {error && <p style={{ color: "#c00" }}>{error}</p>}
        {!loading && !error && classes.length === 0 && (
          <p>You don&apos;t have any classes yet. Ask your teacher for an access grant.</p>
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
                <Link to={`/student/class/${c.id}`} style={{ color: "#0066cc", textDecoration: "none", fontWeight: 600 }}>
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
