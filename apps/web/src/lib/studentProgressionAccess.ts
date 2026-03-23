import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  resolveLessonAccess,
  type RawProgressionDoc,
} from "@learning-scores/shared";
import { isStudentManuallyReleased } from "./progressionFirestore";
import type { ModuleWithId } from "../hooks/useClassModules";
import type { LessonWithId } from "../hooks/useModuleLessons";

async function loadModulesForClass(classId: string): Promise<ModuleWithId[]> {
  const snap = await getDocs(
    query(collection(db, "modules"), where("classId", "==", classId))
  );
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ModuleWithId));
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

async function loadLessonsForModule(
  classId: string,
  moduleId: string
): Promise<LessonWithId[]> {
  const snap = await getDocs(
    query(
      collection(db, "lessons"),
      where("classId", "==", classId),
      where("moduleId", "==", moduleId)
    )
  );
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LessonWithId));
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

export async function getStudentEnrollmentEnrolledAt(
  classId: string,
  studentId: string
): Promise<number | undefined> {
  const snap = await getDoc(doc(db, "classes", classId, "enrollments", studentId));
  if (!snap.exists()) return undefined;
  const d = snap.data();
  return d.enrolledAt as number | undefined;
}

/** Course-level content (no module) is not progression-gated here. */
export async function evaluateStudentModuleLessonAccess(params: {
  classId: string;
  studentId: string;
  isTeacher: boolean;
  moduleId?: string | null;
  lessonId?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { classId, studentId, isTeacher, moduleId, lessonId } = params;
  if (isTeacher) return { ok: true };
  if (!moduleId) return { ok: true };

  const modules = await loadModulesForClass(classId);
  const moduleDoc = modules.find((m) => m.id === moduleId);
  if (!moduleDoc) return { ok: false, reason: "This content is not available." };

  const moduleIndex = modules.findIndex((m) => m.id === moduleId);
  const enrolledAt = await getStudentEnrollmentEnrolledAt(classId, studentId);
  const moduleManual = await isStudentManuallyReleased("modules", moduleId, studentId);

  let lessonDoc: LessonWithId | undefined;
  let lessonOrderIndex = 0;
  if (lessonId) {
    const lessons = await loadLessonsForModule(classId, moduleId);
    lessonDoc = lessons.find((l) => l.id === lessonId);
    const idx = lessons.findIndex((l) => l.id === lessonId);
    if (idx >= 0) lessonOrderIndex = idx;
  }

  const lessonManual = lessonId
    ? await isStudentManuallyReleased("lessons", lessonId, studentId)
    : false;

  const r = resolveLessonAccess(
    moduleDoc as RawProgressionDoc,
    (lessonDoc ?? null) as RawProgressionDoc | null,
    {
      now: Date.now(),
      moduleOrderIndex: moduleIndex >= 0 ? moduleIndex : 0,
      lessonOrderIndex,
      enrolledAt,
      moduleManualStudent: moduleManual,
      lessonManualStudent: lessonManual,
      isTeacherView: false,
    }
  );

  return { ok: r.accessible, reason: r.reason };
}
