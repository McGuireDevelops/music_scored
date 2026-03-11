/**
 * Teacher/Admin-only: list students across the teacher's classes. Uses Admin SDK to bypass security rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface TeacherStudent {
  userId: string;
  displayName: string | null;
  email: string | null;
  courses: { classId: string; className: string }[];
  status: string;
}

async function assertTeacherOrAdmin(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only teachers and admins can access student lists"
    );
  }
}

export const getTeacherStudents = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacherOrAdmin(uid);

  const classesSnap = await admin
    .firestore()
    .collection("classes")
    .where("teacherId", "==", uid)
    .get();

  const classes = classesSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name ?? "Unnamed class",
  }));

  const enrollmentByUser = new Map<
    string,
    { courses: { classId: string; className: string }[]; status: string }
  >();

  for (const cls of classes) {
    const enrollmentsSnap = await admin
      .firestore()
      .collection("classes")
      .doc(cls.id)
      .collection("enrollments")
      .get();

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

  for (const userId of userIds) {
    const userSnap = await admin.firestore().doc(`users/${userId}`).get();
    const data = userSnap.data();
    userProfiles.set(userId, {
      displayName: data?.displayName ?? null,
      email: data?.email ?? null,
    });
  }

  const students: TeacherStudent[] = userIds.map((userId) => {
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

  return { students };
});
