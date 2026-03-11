import { useParams, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const isTeacherRoute = pathname.startsWith("/teacher");
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "classes", id))
      .then((snap) => {
        if (snap.exists()) {
          setClassName(snap.data().name ?? "Class");
        } else {
          setClassName(null);
        }
      })
      .catch(() => setClassName(null))
      .finally(() => setLoading(false));
  }, [id]);

  const requiredRole = isTeacherRoute ? "teacher" : "student";

  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <div>
        <Link to={isTeacherRoute ? "/teacher" : "/student"} style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}>
          ← Back to dashboard
        </Link>
        {loading && <p>Loading…</p>}
        {!loading && className && (
          <>
            <h2>{className}</h2>
            <p>Class content coming soon.</p>
          </>
        )}
        {!loading && !className && <p>Class not found.</p>}
      </div>
    </ProtectedRoute>
  );
}
