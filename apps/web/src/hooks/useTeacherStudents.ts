import { useState, useEffect } from "react";
import { functions, httpsCallable } from "../firebase";

export interface TeacherStudent {
  userId: string;
  displayName: string | null;
  email: string | null;
  courses: { classId: string; className: string }[];
  status: string;
}

export function useTeacherStudents(teacherId: string | undefined) {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchStudents() {
      setLoading(true);
      setError(null);

      try {
        const getStudents = httpsCallable<unknown, { students: TeacherStudent[] }>(
          functions,
          "getTeacherStudents"
        );
        const res = await getStudents({});
        if (cancelled) return;
        setStudents(res.data.students);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load students";
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

    fetchStudents();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  return { students, loading, error };
}
