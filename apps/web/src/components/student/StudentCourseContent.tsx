import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useClassModules } from "../../hooks/useClassModules";
import { useClassLessons } from "../../hooks/useClassLessons";
import {
  resolveLessonAccess,
  type RawProgressionDoc,
} from "@learning-scores/shared";
import { isStudentManuallyReleased } from "../../lib/progressionFirestore";
import { getStudentEnrollmentEnrolledAt } from "../../lib/studentProgressionAccess";

export function StudentCourseContent({ classId }: { classId: string }) {
  const { user } = useAuth();
  const { modules, loading: modLoading } = useClassModules(classId);
  const { lessons: allLessons, loading: lesLoading } = useClassLessons(classId);
  const [enrolledAt, setEnrolledAt] = useState<number | undefined>();
  const [moduleManual, setModuleManual] = useState<Record<string, boolean>>({});
  const [lessonManual, setLessonManual] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.uid) return;
    void getStudentEnrollmentEnrolledAt(classId, user.uid).then(setEnrolledAt);
  }, [classId, user?.uid]);

  useEffect(() => {
    if (!user?.uid || modules.length === 0) {
      setModuleManual({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        modules.map(
          async (m) =>
            [m.id, await isStudentManuallyReleased("modules", m.id, user.uid)] as const
        )
      );
      if (!cancelled) setModuleManual(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, modules]);

  useEffect(() => {
    if (!user?.uid || allLessons.length === 0) {
      setLessonManual({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        allLessons.map(
          async (l) =>
            [l.id, await isStudentManuallyReleased("lessons", l.id, user.uid)] as const
        )
      );
      if (!cancelled) setLessonManual(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, allLessons]);

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, typeof allLessons>();
    for (const l of allLessons) {
      const arr = map.get(l.moduleId) ?? [];
      arr.push(l);
      map.set(l.moduleId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return map;
  }, [allLessons]);

  const loading = modLoading || lesLoading;

  if (!user) return null;
  if (loading) {
    return <p className="text-sm text-gray-500">Loading course…</p>;
  }

  if (modules.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Your teacher hasn&apos;t published modules for this course yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Open items are available now. Locked items follow your teacher&rsquo;s progression settings.
      </p>
      {modules.map((mod, mi) => {
        const modLessons = lessonsByModule.get(mod.id) ?? [];
        return (
          <div
            key={mod.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-gray-900">
              Module {mi + 1}: {mod.name}
            </h3>
            {modLessons.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No lessons in this module yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {modLessons.map((lesson, li) => {
                  const r = resolveLessonAccess(
                    mod as RawProgressionDoc,
                    lesson as RawProgressionDoc,
                    {
                      now: Date.now(),
                      moduleOrderIndex: mi,
                      lessonOrderIndex: li,
                      enrolledAt,
                      moduleManualStudent: moduleManual[mod.id] ?? false,
                      lessonManualStudent: lessonManual[lesson.id] ?? false,
                      isTeacherView: false,
                    }
                  );
                  return (
                    <li
                      key={lesson.id}
                      className="rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm"
                    >
                      <div
                        className={
                          r.accessible ? "font-medium text-gray-900" : "text-gray-400"
                        }
                      >
                        {lesson.title}
                      </div>
                      {!r.accessible && r.reason && (
                        <p className="mt-1 text-xs text-gray-500">{r.reason}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
