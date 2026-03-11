import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { AssignmentReportSummary, QuizReportSummary } from "../types/reports";
import type { Submission } from "@learning-scores/shared";

interface ClassReportData {
  studentCount: number;
  assignmentSummaries: AssignmentReportSummary[];
  quizSummaries: QuizReportSummary[];
  overallCompletionRate: number;
}

export function useClassReport(classId: string | undefined) {
  const [data, setData] = useState<ClassReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchReport() {
      setLoading(true);
      setError(null);

      try {
        const [enrollmentsSnap, assignmentsSnap, quizzesSnap] = await Promise.all([
          getDocs(collection(db, "classes", classId, "enrollments")),
          getDocs(
            query(
              collection(db, "assignments"),
              where("classId", "==", classId)
            )
          ),
          getDocs(
            query(
              collection(db, "quizzes"),
              where("classId", "==", classId)
            )
          ),
        ]);

        if (cancelled) return;

        const studentCount = enrollmentsSnap.size;
        const assignments = assignmentsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          deadline: d.data().deadline,
        }));
        const quizzes = quizzesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          title: d.data().title,
        }));

        const assignmentSummaries: AssignmentReportSummary[] = [];
        let totalExpected = 0;
        let totalSubmitted = 0;

        for (const a of assignments) {
          const [submissionsSnap, feedbackSnap] = await Promise.all([
            getDocs(collection(db, "assignments", a.id, "submissions")),
            getDocs(
              query(
                collection(db, "feedback"),
                where("assignmentId", "==", a.id)
              )
            ),
          ]);

          if (cancelled) return;

          const submissions = submissionsSnap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as Submission)
          );
          const feedbackDocs = feedbackSnap.docs;
          const gradedSubIds = new Set(
            feedbackDocs.map((d) => d.data().submissionId)
          );

          const now = Date.now();
          const uniqueSubmitters = new Set(submissions.map((s) => s.userId)).size;
          const deadlinePassed = a.deadline ? now > a.deadline : false;
          const overdueCount =
            deadlinePassed && studentCount > 0
              ? Math.max(0, studentCount - uniqueSubmitters)
              : 0;

          totalExpected += studentCount;
          totalSubmitted += uniqueSubmitters;

          assignmentSummaries.push({
            assignmentId: a.id,
            title: a.title ?? "Assignment",
            deadline: a.deadline,
            totalStudents: studentCount,
            submittedCount: submissions.length,
            gradedCount: gradedSubIds.size,
            overdueCount,
            feedbackIds: feedbackDocs.map((d) => d.id),
          });
        }

        const quizSummaries: QuizReportSummary[] = [];
        for (const q of quizzes) {
          const attemptsSnap = await getDocs(
            collection(db, "quizzes", q.id, "attempts")
          );
          if (cancelled) return;

          const attempts = attemptsSnap.docs.map((d) => d.data());
          const withScores = attempts.filter(
            (a) => typeof a.score === "number" && typeof a.maxScore === "number"
          );
          const totalScore = withScores.reduce((sum, a) => sum + (a.score ?? 0), 0);
          const avgScore =
            withScores.length > 0 ? totalScore / withScores.length : 0;
          const maxScore =
            withScores.length > 0
              ? Math.max(...withScores.map((a) => a.maxScore ?? 0))
              : 0;

          quizSummaries.push({
            quizId: q.id,
            title: q.title ?? "Quiz",
            totalStudents: studentCount,
            attemptedCount: attempts.length,
            averageScore: avgScore,
            maxScore,
          });
        }

        const overallCompletionRate =
          totalExpected > 0 ? (totalSubmitted / totalExpected) * 100 : 0;

        setData({
          studentCount,
          assignmentSummaries,
          quizSummaries,
          overallCompletionRate,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReport();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  return { data, loading, error };
}
