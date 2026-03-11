/**
 * submitQuizAttempt: Student submits quiz; computes score when correctionMode is "auto"
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface SubmitAttemptInput {
  quizId: string;
  answers: Array<{ questionId: string; answer: { type: string; value: unknown } }>;
}

function computeScoreFromAnswerKey(
  questions: Array<{ id: string; type: string; points?: number; payload: Record<string, unknown> }>,
  answerKeyByQuestion: Map<string, Record<string, unknown>>,
  answers: Record<string, { type: string; value: unknown }>
): { score: number; maxScore: number } {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    const points = (q.points ?? 1) as number;
    maxScore += points;
    const keyData = answerKeyByQuestion.get(q.id);
    const ans = answers[q.id];
    if (!ans || !keyData) continue;

    if (q.type === "multipleChoiceSingle" || q.type === "multipleChoiceMulti") {
      const correctKeys = (keyData.correctKeys ?? []) as string[];
      const selected = (ans.value as string[]) ?? [];
      if (keyData.partialCreditMap) {
        const map = keyData.partialCreditMap as Record<string, number>;
        for (const k of selected) score += map[k] ?? 0;
      } else {
        const correctSet = new Set(correctKeys);
        const selectedSet = new Set(selected);
        const isCorrect =
          correctSet.size === selectedSet.size &&
          [...correctSet].every((k) => selectedSet.has(k));
        if (isCorrect) score += points;
      }
    }
    // Add more question types as needed; MC is the only one supported for auto-score today
  }
  return { score, maxScore };
}

export const submitQuizAttempt = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    const data = request.data as SubmitAttemptInput;
    if (!data?.quizId || !Array.isArray(data?.answers)) {
      throw new HttpsError("invalid-argument", "quizId and answers required");
    }

    const db = admin.firestore();
    const quizRef = db.doc(`quizzes/${data.quizId}`);
    const quizSnap = await quizRef.get();
    if (!quizSnap.exists) {
      throw new HttpsError("not-found", "Quiz not found");
    }
    const quiz = quizSnap.data()!;
    const classId = quiz.classId as string;

    // Check user has class access (student with grant, or teacher, or admin)
    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    const role = userData?.role;
    if (role !== "student" && role !== "teacher" && role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Must be signed in with a valid role"
      );
    }
    if (role !== "student") {
      throw new HttpsError(
        "permission-denied",
        "Only students can submit quiz attempts"
      );
    }
    const classDoc = await db.doc(`classes/${classId}`).get();
    const grantSnap = await db.doc(`users/${uid}/accessGrants/${classId}`).get();
    const now = Date.now();
    const hasGrant =
      grantSnap.exists &&
      (grantSnap.data()?.validFrom ?? 0) <= now &&
      (grantSnap.data()?.validTo ?? 0) >= now;
    if (!hasGrant) {
      throw new HttpsError(
        "permission-denied",
        "No access to this class"
      );
    }

    const correctionMode = (quiz.correctionMode ?? "auto") as string;
    const answersMap: Record<string, { type: string; value: unknown }> = {};
    for (const a of data.answers) {
      answersMap[a.questionId] = a.answer;
    }

    const questionsSnap = await db
      .collection("quizzes")
      .doc(data.quizId)
      .collection("questions")
      .get();
    const questions = questionsSnap.docs.map((d) => ({
      id: d.id,
      type: d.data().type,
      points: d.data().points,
      payload: d.data().payload ?? {},
    }));

    let score: number | null = null;
    let maxScore = 0;
    let gradedBy: "auto" | "manual" | undefined;

    if (correctionMode === "auto") {
      const keySnap = await db
        .collection("quizzes")
        .doc(data.quizId)
        .collection("answerKey")
        .get();
      const answerKeyByQuestion = new Map<string, Record<string, unknown>>();
      for (const d of keySnap.docs) {
        answerKeyByQuestion.set(d.id, d.data());
      }
      const result = computeScoreFromAnswerKey(
        questions,
        answerKeyByQuestion,
        answersMap
      );
      score = result.score;
      maxScore = result.maxScore;
      gradedBy = "auto";
    } else {
      for (const q of questions) {
        maxScore += (q.points ?? 1) as number;
      }
    }

    const attemptData = {
      quizId: data.quizId,
      userId: uid,
      answers: data.answers,
      completedAt: Date.now(),
      ...(score != null && { score }),
      ...(maxScore > 0 && { maxScore }),
      ...(gradedBy && { gradedBy }),
    };

    const ref = await db
      .collection("quizzes")
      .doc(data.quizId)
      .collection("attempts")
      .add(attemptData);

    return { attemptId: ref.id, score, maxScore };
  }
);
