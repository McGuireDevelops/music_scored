/**
 * Report types for class, student, and assignment metrics
 */

export interface AssignmentReportSummary {
  assignmentId: string;
  title: string;
  deadline?: number;
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  overdueCount: number;
  feedbackIds: string[];
}

export interface QuizReportSummary {
  quizId: string;
  title: string;
  totalStudents: number;
  attemptedCount: number;
  averageScore: number;
  maxScore: number;
}

export interface StudentAssignmentStatus {
  assignmentId: string;
  assignmentTitle: string;
  status: "not_started" | "submitted" | "graded";
  submittedAt?: number;
  feedbackId?: string;
}

export interface StudentQuizStatus {
  quizId: string;
  quizTitle: string;
  score?: number;
  maxScore?: number;
  completedAt?: number;
}
