/**
 * Teacher/Admin-only: list classes with communities for the teacher. Uses Admin SDK to bypass security rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface ClassWithCommunities {
  id: string;
  name: string;
  communities: { id: string; name: string }[];
}

async function assertTeacherOrAdmin(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only teachers and admins can access community hub"
    );
  }
}

export const getTeacherCommunity = onCall(async (request) => {
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

  const results: ClassWithCommunities[] = [];

  for (const classDoc of classesSnap.docs) {
    const classData = classDoc.data();
    const classId = classDoc.id;
    const className = classData.name ?? "Unnamed class";

    const communitiesSnap = await admin
      .firestore()
      .collection("communities")
      .where("classId", "==", classId)
      .get();

    const communities = communitiesSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? "Community",
    }));

    results.push({
      id: classId,
      name: className,
      communities,
    });
  }

  return { classes: results };
});
