/**
 * Teacher/Admin-only: cross-course analytics (revenue, enrollments, at-risk).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { validateInput } from "../validation";
import { getTeacherAnalyticsSchema } from "../validation/schemas";

const MS_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_INACTIVITY_DAYS = 7;
const DEFAULT_NO_SUBMISSION_DAYS = 14;
const AT_RISK_MAX_STUDENTS = 250;

async function assertTeacherOrAdmin(
  uid: string
): Promise<{ role: "teacher" | "admin"; uid: string }> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role === "teacher" || role === "admin") {
    return { role, uid };
  }
  throw new HttpsError(
    "permission-denied",
    "Only teachers and admins can access analytics"
  );
}

function periodRange(
  preset: "month" | "quarter" | "year",
  anchorMs: number
): { startMs: number; endMs: number } {
  const d = new Date(anchorMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();

  if (preset === "year") {
    const startMs = Date.UTC(y, 0, 1, 0, 0, 0, 0);
    const endMs = Date.UTC(y + 1, 0, 1, 0, 0, 0, 0) - 1;
    return { startMs, endMs };
  }

  if (preset === "quarter") {
    const qStartMonth = Math.floor(m / 3) * 3;
    const startMs = Date.UTC(y, qStartMonth, 1, 0, 0, 0, 0);
    const endMs = Date.UTC(y, qStartMonth + 3, 1, 0, 0, 0, 0) - 1;
    return { startMs, endMs };
  }

  const startMs = Date.UTC(y, m, 1, 0, 0, 0, 0);
  const endMs = Date.UTC(y, m + 1, 1, 0, 0, 0, 0) - 1;
  return { startMs, endMs };
}

function enrollmentTimestamp(data: Record<string, unknown> | undefined): number {
  if (!data) return 0;
  const en = data.enrolledAt;
  const up = data.updatedAt;
  if (typeof en === "number" && en > 0) return en;
  if (typeof up === "number" && up > 0) return up;
  return 0;
}

export const getTeacherAnalytics = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { role, uid: callerUid } = await assertTeacherOrAdmin(request.auth.uid);
  const input = validateInput(getTeacherAnalyticsSchema, request.data ?? {});

  let teacherId = callerUid;
  if (role === "admin" && input.forTeacherId) {
    teacherId = input.forTeacherId;
  }

  const anchorMs = input.anchor ?? Date.now();
  const { startMs, endMs } = periodRange(input.preset, anchorMs);
  const db = admin.firestore();

  const settingsSnap = await db.doc(`teacherSettings/${teacherId}`).get();
  const settings = settingsSnap.data();
  const atRiskInactivityDays = Math.max(
    1,
    Number(settings?.atRiskInactivityDays ?? DEFAULT_INACTIVITY_DAYS)
  );
  const atRiskNoSubmissionDays = Math.max(
    1,
    Number(settings?.atRiskNoSubmissionDays ?? DEFAULT_NO_SUBMISSION_DAYS)
  );

  const classesSnap = await db
    .collection("classes")
    .where("teacherId", "==", teacherId)
    .get();

  const classes = classesSnap.docs.map((d) => ({
    id: d.id,
    name: (d.data().name as string) ?? "Unnamed class",
  }));
  const classIdSet = new Set(classes.map((c) => c.id));
  const classNameById = new Map(classes.map((c) => [c.id, c.name]));

  type EnrollRow = {
    userId: string;
    classId: string;
    enrolledAt: number;
  };
  const enrollRows: EnrollRow[] = [];
  const coursesByUser = new Map<
    string,
    { classId: string; className: string; enrolledAt: number }[]
  >();

  for (const cls of classes) {
    const enSnap = await db
      .collection("classes")
      .doc(cls.id)
      .collection("enrollments")
      .get();
    for (const docSnap of enSnap.docs) {
      const data = docSnap.data();
      const userId = docSnap.id;
      const enrolledAt = enrollmentTimestamp(data);
      enrollRows.push({ userId, classId: cls.id, enrolledAt });
      const list = coursesByUser.get(userId) ?? [];
      list.push({
        classId: cls.id,
        className: cls.name,
        enrolledAt,
      });
      coursesByUser.set(userId, list);
    }
  }

  const studentUserIds = Array.from(coursesByUser.keys());
  const repeatLearnerCount = studentUserIds.filter(
    (u) => (coursesByUser.get(u)?.length ?? 0) >= 2
  ).length;

  const newEnrollmentsByClass = new Map<string, number>();
  for (const c of classes) newEnrollmentsByClass.set(c.id, 0);
  for (const row of enrollRows) {
    if (row.enrolledAt >= startMs && row.enrolledAt <= endMs) {
      newEnrollmentsByClass.set(
        row.classId,
        (newEnrollmentsByClass.get(row.classId) ?? 0) + 1
      );
    }
  }
  const newEnrollmentsCount = Array.from(newEnrollmentsByClass.values()).reduce(
    (a, b) => a + b,
    0
  );

  const ledgerSnap = await db
    .collection("paymentLedger")
    .where("teacherId", "==", teacherId)
    .where("paidAt", ">=", startMs)
    .where("paidAt", "<=", endMs)
    .get();

  const revenueByCurrency = new Map<string, number>();
  const purchaseCountByClass = new Map<string, number>();
  const revenueByClass = new Map<string, Map<string, number>>();

  for (const docSnap of ledgerSnap.docs) {
    const data = docSnap.data();
    const classId = data.classId as string;
    const amount = Number(data.amount ?? 0);
    const currency = String(data.currency ?? "usd").toLowerCase();
    revenueByCurrency.set(currency, (revenueByCurrency.get(currency) ?? 0) + amount);
    purchaseCountByClass.set(classId, (purchaseCountByClass.get(classId) ?? 0) + 1);
    const perClassCur = revenueByClass.get(classId) ?? new Map();
    perClassCur.set(currency, (perClassCur.get(currency) ?? 0) + amount);
    revenueByClass.set(classId, perClassCur);
  }

  const purchaseCount = ledgerSnap.size;

  const curriculaSnap = await db
    .collection("curricula")
    .where("teacherId", "==", teacherId)
    .get();

  const curricula = curriculaSnap.docs.map((d) => {
    const data = d.data();
    const courseIds = (data.courseIds as string[] | undefined)?.filter((id) =>
      classIdSet.has(id)
    ) ?? [];
    let enrolls = 0;
    let purchases = 0;
    const rev = new Map<string, number>();
    for (const cid of courseIds) {
      enrolls += newEnrollmentsByClass.get(cid) ?? 0;
      purchases += purchaseCountByClass.get(cid) ?? 0;
      const classRev = revenueByClass.get(cid);
      if (classRev) {
        for (const [cur, amt] of classRev) {
          rev.set(cur, (rev.get(cur) ?? 0) + amt);
        }
      }
    }
    return {
      curriculumId: d.id,
      name: (data.name as string) ?? "Curriculum",
      courseIds,
      newEnrollments: enrolls,
      purchaseCount: purchases,
      revenueByCurrency: Object.fromEntries(rev),
    };
  });

  const byClass = classes.map((c) => ({
    classId: c.id,
    className: c.name,
    newEnrollments: newEnrollmentsByClass.get(c.id) ?? 0,
    purchaseCount: purchaseCountByClass.get(c.id) ?? 0,
    revenueByCurrency: Object.fromEntries(revenueByClass.get(c.id) ?? new Map()),
  }));

  const assignmentsByClass = new Map<
    string,
    admin.firestore.QueryDocumentSnapshot[]
  >();
  const quizzesByClass = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();
  const classIds = classes.map((c) => c.id);

  for (const cid of classIds) {
    const [aSnap, qSnap] = await Promise.all([
      db.collection("assignments").where("classId", "==", cid).get(),
      db.collection("quizzes").where("classId", "==", cid).get(),
    ]);
    assignmentsByClass.set(cid, aSnap.docs);
    quizzesByClass.set(cid, qSnap.docs);
  }

  const lastSubmissionByUser = new Map<string, number>();
  const lastQuizAttemptByUser = new Map<string, number>();

  for (const cid of classIds) {
    const assigns = assignmentsByClass.get(cid) ?? [];
    for (const adoc of assigns) {
      const subSnap = await adoc.ref.collection("submissions").get();
      for (const s of subSnap.docs) {
        const d = s.data();
        const uid = d.userId as string;
        const ts = Number(d.submittedAt ?? 0);
        if (!uid || !ts) continue;
        const prev = lastSubmissionByUser.get(uid) ?? 0;
        if (ts > prev) lastSubmissionByUser.set(uid, ts);
      }
    }
    const quizzes = quizzesByClass.get(cid) ?? [];
    for (const qdoc of quizzes) {
      const attSnap = await qdoc.ref.collection("attempts").get();
      for (const a of attSnap.docs) {
        const d = a.data();
        const uid = d.userId as string;
        const ts = Number(d.completedAt ?? 0);
        if (!uid || !ts) continue;
        const prev = lastQuizAttemptByUser.get(uid) ?? 0;
        if (ts > prev) lastQuizAttemptByUser.set(uid, ts);
      }
    }
  }

  const now = Date.now();
  const atRisk: Array<{
    userId: string;
    displayName: string | null;
    email: string | null;
    reasons: string[];
    primaryClassId: string;
  }> = [];

  const slice = studentUserIds.slice(0, AT_RISK_MAX_STUDENTS);

  for (const userId of slice) {
    const userSnap = await db.doc(`users/${userId}`).get();
    const udata = userSnap.data();
    const lastActiveAt =
      typeof udata?.lastActiveAt === "number" ? udata.lastActiveAt : undefined;
    const displayName = (udata?.displayName as string) ?? null;
    const email = (udata?.email as string) ?? null;

    const courses = coursesByUser.get(userId) ?? [];
    if (courses.length === 0) continue;

    const minEnrolledAt = Math.min(...courses.map((c) => c.enrolledAt || now));
    const primaryClassId = courses[0]!.classId;

    const reasons: string[] = [];

    for (const c of courses) {
      const enAt = c.enrolledAt || 0;
      if (
        enAt > 0 &&
        now - enAt >= atRiskInactivityDays * MS_DAY &&
        (lastActiveAt == null || lastActiveAt < enAt)
      ) {
        if (!reasons.includes("inactive_after_enroll")) {
          reasons.push("inactive_after_enroll");
        }
        break;
      }
    }

    const hasAssignmentsInEnrolledClasses = courses.some(
      (c) => (assignmentsByClass.get(c.classId)?.length ?? 0) > 0
    );
    if (hasAssignmentsInEnrolledClasses && minEnrolledAt > 0) {
      const lastSub = lastSubmissionByUser.get(userId) ?? 0;
      const threshold = atRiskNoSubmissionDays * MS_DAY;
      if (
        now - minEnrolledAt >= threshold &&
        (lastSub === 0 || now - lastSub >= threshold)
      ) {
        reasons.push("no_recent_submission");
      }
    }

    const hasQuizzesInEnrolledClasses = courses.some(
      (c) => (quizzesByClass.get(c.classId)?.length ?? 0) > 0
    );
    if (hasQuizzesInEnrolledClasses && minEnrolledAt > 0) {
      const lastQz = lastQuizAttemptByUser.get(userId) ?? 0;
      const threshold = atRiskNoSubmissionDays * MS_DAY;
      if (
        now - minEnrolledAt >= threshold &&
        (lastQz === 0 || now - lastQz >= threshold)
      ) {
        reasons.push("no_recent_quiz");
      }
    }

    if (reasons.length > 0) {
      atRisk.push({
        userId,
        displayName,
        email,
        reasons,
        primaryClassId,
      });
    }
  }

  return {
    period: {
      preset: input.preset,
      startMs,
      endMs,
      anchorMs,
    },
    thresholds: {
      atRiskInactivityDays,
      atRiskNoSubmissionDays,
    },
    summary: {
      revenueByCurrency: Object.fromEntries(revenueByCurrency),
      purchaseCount,
      newEnrollmentsCount,
      repeatLearnerCount,
      enrolledStudentCount: studentUserIds.length,
    },
    byClass,
    curricula,
    atRisk,
    atRiskTruncated: studentUserIds.length > AT_RISK_MAX_STUDENTS,
    liveAttendanceNote:
      "Live session attendance is not recorded in the app yet; at-risk signals use logins, assignments, and quizzes only.",
  };
});
