import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { functions, httpsCallable } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";

interface ClassWithCommunities {
  id: string;
  name: string;
  communities: { id: string; name: string }[];
}

export default function TeacherCommunityHub() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassWithCommunities[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      try {
        const getCommunity = httpsCallable<unknown, { classes: ClassWithCommunities[] }>(
          functions,
          "getTeacherCommunity"
        );
        const res = await getCommunity({});
        if (cancelled) return;
        setClasses(res.data.classes);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load communities";
          const isPermissionDenied = typeof msg === "string" && msg.toLowerCase().includes("permission");
          setError(
            isPermissionDenied
              ? "Permission denied. Ensure your account has the teacher role. Contact an administrator."
              : msg
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
              Community
            </h1>
            <p className="text-gray-600">
              Your class communities – discussions, critiques, and announcements
            </p>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading…</p>}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && classes.length === 0 && (
          <div className="rounded-card border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              No classes yet. Create a class to get a community space.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block font-medium text-primary no-underline hover:underline"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {!loading && !error && classes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="rounded-card border border-gray-200 bg-white p-6 shadow-card transition-colors hover:border-primary/20"
              >
                <h3 className="mb-2 font-semibold text-gray-900">{cls.name}</h3>
                <p className="mb-4 text-sm text-gray-600">
                  {cls.communities.length === 0
                    ? "No community"
                    : cls.communities.map((c) => c.name).join(", ")}
                </p>
                <Link
                  to={`/teacher/class/${cls.id}/community`}
                  className="font-medium text-primary no-underline hover:underline"
                >
                  View community →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
