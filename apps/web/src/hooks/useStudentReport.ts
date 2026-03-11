import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  StudentAssignmentStatus,
  StudentQuizStatus,
} from "../types/reports";
import type { Submission, Feedback } from "@learning-scores/shared";

interface StudentReportData {
  assignmentStatuses: StudentAssignmentStatus[];
  quizStatuses: StudentQuizStatus[];
  submittedCount: number;
  gradedCount: number;
  totalAssignments: number;
  totalQuizzes: number;
}

export function useStudentReport(
  classId: string | undefined,
  studentId: string | undefined
) {
  const [data, setData] = useState<StudentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId || !studentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchReport() {
      setLoading(true);
      setError(null);

      try {
        const [assignmentsSnap, quizzesSnap] = await Promise.all([
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

        const assignments = assignmentsSnap.docs.map((d) => ({
          id: d.id,
          title: d.data().title ?? "Assignment",
          deadline: d.data().deadline,
        }));
        const quizzes = quizzesSnap.docs.map((d) => ({
          id: d.id,
          title: d.data().title ?? "Quiz",
        }));

        const assignmentStatuses: StudentAssignmentStatus[] = [];
        let submittedCount = 0;
        let gradedCount = 0;

        for (const a of assignments) {
          const [subSnap, feedbackSnap] = await Promise.all([
            getDocs(
              query(
                collection(db, "assignments", a.id, "submissions"),
                where("userId", "==", studentId)
              )
            ),
            getDocs(
              query(
                collection(db, "feedback"),
                where("assignmentId", "==", a.id),
                where("userId", "==", studentId)
              )
            ),
          ]);

          if (cancelled) return;

          const submission = subSnap.empty
            ? null
            : (subSnap.docs[0].data() as Submission & { submittedAt: number });
          const feedback = feedbackSnap.empty
            ? null
            : (feedbackSnap.docs[0].data() as Feedback & { id: string });

          let status: StudentAssignmentStatus["status"] = "not_started";
          if (feedback) {
            status = "graded";
            gradedCount++;
          } else if (submission) {
            status = "submitted";
            submittedCount++;
          }

          assignmentStatuses.push({
            assignmentId: a.id,
            assignmentTitle: a.title,
            status,
            submittedAt: submission?.submittedAt,
            feedbackId: feedback ? feedbackSnap.docs[0].id : undefined,
          });
        }

        const quizStatuses: StudentQuizStatus[] = [];
        for (const q of quizzes) {
          const attemptsSnap = await getDocs(
            query(
              collection(db, "quizzes", q.id, "attempts"),
              where("userId", "==", studentId)
            )
          );
          if (cancelled) return;

          const attempt = attemptsSnap.empty
            ? null
            : attemptsSnap.docs[0].data();

          const att = attemptsSnap.docs[0]?.data();
          quizStatuses.push({
            quizId: q.id,
            quizTitle: q.title,
            score: att?.score,
            maxScore: att?.maxScore,
            completedAt: att?.completedAt,
            sharedWithStudentAt: att?.sharedWithStudentAt,
          });
        }

        setData({
          assignmentStatuses,
          quizStatuses,
          submittedCount,
          gradedCount,
          totalAssignments: assignments.length,
          totalQuizzes: quizzes.length,
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
  }, [classId, studentId]);

  return { data, loading, error };
}
