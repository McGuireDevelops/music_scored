/**
 * Teacher/Admin-only: list lessons owned by the caller. Uses Admin SDK to bypass security rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface TeacherLessonEnriched {
  id: string;
  classId: string;
  moduleId: string;
  ownerId: string;
  title: string;
  type: string;
  content?: string;
  summary?: string;
  mediaRefs?: unknown[];
  order?: number;
  version?: number;
  moduleName?: string;
  className?: string;
}

async function assertTeacherOrAdmin(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only teachers and admins can access lessons"
    );
  }
}

export const getTeacherLessons = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacherOrAdmin(uid);

  const lessonsSnap = await admin
    .firestore()
    .collection("lessons")
    .where("ownerId", "==", uid)
    .get();

  const lessonList: TeacherLessonEnriched[] = lessonsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as TeacherLessonEnriched[];

  lessonList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const moduleIds = [...new Set(lessonList.map((l) => l.moduleId).filter(Boolean))];
  const classIds = [...new Set(lessonList.map((l) => l.classId).filter(Boolean))];

  const modulesMap = new Map<string, string>();
  const classesMap = new Map<string, string>();

  for (const mid of moduleIds) {
    const modSnap = await admin.firestore().doc(`modules/${mid}`).get();
    if (modSnap.exists) {
      modulesMap.set(mid, modSnap.data()?.name ?? "Module");
    }
  }

  for (const cid of classIds) {
    const classSnap = await admin.firestore().doc(`classes/${cid}`).get();
    if (classSnap.exists) {
      classesMap.set(cid, classSnap.data()?.name ?? "Class");
    }
  }

  const enriched: TeacherLessonEnriched[] = lessonList.map((l) => ({
    ...l,
    moduleName: l.moduleId ? modulesMap.get(l.moduleId) : undefined,
    className: l.classId ? classesMap.get(l.classId) : undefined,
  }));

  return { lessons: enriched };
});

/** Teacher/Admin-only: create a lesson. */
export const createTeacherLesson = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacherOrAdmin(uid);

  const data = request.data as Record<string, unknown>;
  const ownerId = data.ownerId as string;
  if (ownerId !== uid) {
    throw new HttpsError("permission-denied", "Can only create lessons for yourself");
  }

  const ref = await admin.firestore().collection("lessons").add(data);
  return { id: ref.id };
});

/** Teacher/Admin-only: update a lesson. */
export const updateTeacherLesson = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacherOrAdmin(uid);

  const { lessonId, data } = request.data as { lessonId: string; data: Record<string, unknown> };
  if (!lessonId || !data) {
    throw new HttpsError("invalid-argument", "lessonId and data are required");
  }

  const lessonDoc = await admin.firestore().doc(`lessons/${lessonId}`).get();
  if (!lessonDoc.exists || lessonDoc.data()?.ownerId !== uid) {
    throw new HttpsError("permission-denied", "Can only update your own lessons");
  }

  await admin.firestore().doc(`lessons/${lessonId}`).update(data);
  return { success: true };
});

/** Teacher/Admin-only: delete a lesson. */
export const deleteTeacherLesson = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacherOrAdmin(uid);

  const lessonId = request.data as string;
  if (!lessonId) {
    throw new HttpsError("invalid-argument", "lessonId is required");
  }

  const lessonDoc = await admin.firestore().doc(`lessons/${lessonId}`).get();
  if (!lessonDoc.exists || lessonDoc.data()?.ownerId !== uid) {
    throw new HttpsError("permission-denied", "Can only delete your own lessons");
  }

  await admin.firestore().doc(`lessons/${lessonId}`).delete();
  return { success: true };
});
