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
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Courses
        </h1>
        <p className="mb-8 text-gray-600">
          Your enrolled classes and learning materials
        </p>
        {loading && (
          <p className="text-gray-500">Loading your classes…</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && classes.length === 0 && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              You don&apos;t have any classes yet. Ask your teacher for an access grant.
            </p>
          </div>
        )}
        {!loading && classes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                to={`/student/class/${c.id}`}
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
