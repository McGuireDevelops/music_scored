import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Submission } from "@learning-scores/shared";

interface AssignmentReportRow {
  userId: string;
  submitted: boolean;
  submittedAt?: number;
  graded: boolean;
  submissionId?: string;
}

interface AssignmentReportData {
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  overdueCount: number;
  rows: AssignmentReportRow[];
}

export function useAssignmentReport(
  classId: string | undefined,
  assignmentId: string | undefined
) {
  const [data, setData] = useState<AssignmentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId || !assignmentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchReport() {
      setLoading(true);
      setError(null);

      try {
        const [enrollmentsSnap, assignmentSnap, submissionsSnap, feedbackSnap] =
          await Promise.all([
            getDocs(collection(db, "classes", classId, "enrollments")),
            getDoc(doc(db, "assignments", assignmentId)),
            getDocs(collection(db, "assignments", assignmentId, "submissions")),
            getDocs(
              query(
                collection(db, "feedback"),
                where("assignmentId", "==", assignmentId)
              )
            ),
          ]);

        if (cancelled) return;

        const assignment = assignmentSnap.exists()
          ? assignmentSnap.data()
          : null;
        const deadline = assignment?.deadline;
        const now = Date.now();
        const deadlinePassed = deadline ? now > deadline : false;

        const enrollments = enrollmentsSnap.docs.map((d) => d.id);
        const submissions = submissionsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as (Submission & { id: string })[];
        const feedbackByUser = new Map<string, { submissionId: string }>();
        feedbackSnap.docs.forEach((d) => {
          const data = d.data();
          feedbackByUser.set(data.userId, { submissionId: data.submissionId });
        });

        const submittedUserIds = new Set(submissions.map((s) => s.userId));
        const gradedCount = feedbackByUser.size;
        const enrolledNotSubmitted = enrollments.filter(
          (e) => !submittedUserIds.has(e)
        ).length;
        const overdueCount = deadlinePassed ? enrolledNotSubmitted : 0;

        const rows: AssignmentReportRow[] = enrollments.map((userId) => {
          const submission = submissions.find((s) => s.userId === userId);
          const feedback = feedbackByUser.get(userId);

          return {
            userId,
            submitted: !!submission,
            submittedAt: submission?.submittedAt,
            graded: !!feedback,
            submissionId: submission?.id,
          };
        });

        setData({
          totalStudents: enrollments.length,
          submittedCount: submittedUserIds.size,
          gradedCount,
          overdueCount,
          rows,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load report"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReport();
    return () => {
      cancelled = true;
    };
  }, [classId, assignmentId]);

  return { data, loading, error };
}
