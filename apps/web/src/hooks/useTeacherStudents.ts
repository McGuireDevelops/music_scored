import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

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
        const classesSnap = await getDocs(
          query(
            collection(db, "classes"),
            where("teacherId", "==", teacherId)
          )
        );

        if (cancelled) return;

        const classes = classesSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "Unnamed class",
        }));

        const enrollmentByUser = new Map<
          string,
          { courses: { classId: string; className: string }[]; status: string }
        >();

        for (const cls of classes) {
          const enrollmentsSnap = await getDocs(
            collection(db, "classes", cls.id, "enrollments")
          );

          if (cancelled) return;

          for (const docSnap of enrollmentsSnap.docs) {
            const data = docSnap.data();
            const userId = docSnap.id;
            const status = data.status ?? "enrolled";

            const existing = enrollmentByUser.get(userId);
            const courseInfo = { classId: cls.id, className: cls.name };

            if (existing) {
              existing.courses.push(courseInfo);
            } else {
              enrollmentByUser.set(userId, {
                courses: [courseInfo],
                status,
              });
            }
          }
        }

        const userIds = Array.from(enrollmentByUser.keys());
        const userProfiles = new Map<
          string,
          { displayName: string | null; email: string | null }
        >();

        for (const uid of userIds) {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (cancelled) return;
          const data = userSnap.data();
          userProfiles.set(uid, {
            displayName: data?.displayName ?? null,
            email: data?.email ?? null,
          });
        }

        const result: TeacherStudent[] = userIds.map((userId) => {
          const enrollment = enrollmentByUser.get(userId)!;
          const profile = userProfiles.get(userId);
          return {
            userId,
            displayName: profile?.displayName ?? null,
            email: profile?.email ?? null,
            courses: enrollment.courses,
            status: enrollment.status,
          };
        });

        setStudents(result);
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
