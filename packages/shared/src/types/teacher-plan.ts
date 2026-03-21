/**
 * Ordered teaching plan for a live session (teacher-only subcollection).
 */

export interface TeacherPlanItem {
  order: number;
  title: string;
  lessonId?: string;
  externalUrl?: string;
  notes?: string;
}
