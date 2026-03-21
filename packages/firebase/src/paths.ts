/**
 * Firestore collection paths and Storage layout constants
 */

export const COLLECTIONS = {
  users: "users",
  accessGrants: "accessGrants",
  classes: "classes",
  curricula: "curricula",
  modules: "modules",
  lessons: "lessons",
  liveLessons: "liveLessons",
  assignments: "assignments",
  rubrics: "rubrics",
  feedback: "feedback",
  quizzes: "quizzes",
  analysisSnapshots: "analysisSnapshots",
  communities: "communities",
  portfolioItems: "portfolioItems",
  certifications: "certifications",
  teacherProfiles: "teacherProfiles",
  enrollments: "enrollments",
  playlists: "playlists",
  certificateTemplates: "certificateTemplates",
  classCompletions: "classCompletions",
} as const;

export const SUBCOLLECTIONS = {
  accessGrants: "accessGrants",
  cohorts: "cohorts",
  enrollments: "enrollments",
  entryRequirements: "entryRequirements",
  requirementCompletions: "requirementCompletions",
  questions: "questions",
  attempts: "attempts",
  threads: "threads",
  submissions: "submissions",
  editHistory: "editHistory",
  items: "items",
  playlistItemProgress: "playlistItemProgress",
  teacherPlanItems: "teacherPlanItems",
} as const;

/** Path helper: users/{uid} */
export function userPath(uid: string): string {
  return `${COLLECTIONS.users}/${uid}`;
}

/** Path helper: users/{uid}/accessGrants/{classId} */
export function userAccessGrantPath(uid: string, classId: string): string {
  return `${userPath(uid)}/${SUBCOLLECTIONS.accessGrants}/${classId}`;
}

/** Path helper: classes/{classId} */
export function classPath(classId: string): string {
  return `${COLLECTIONS.classes}/${classId}`;
}

/** Path helper: classes/{classId}/cohorts/{cohortId} */
export function cohortPath(classId: string, cohortId: string): string {
  return `${classPath(classId)}/${SUBCOLLECTIONS.cohorts}/${cohortId}`;
}

/** Path helper: classes/{classId}/enrollments/{enrollmentId} */
export function enrollmentPath(classId: string, enrollmentId: string): string {
  return `${classPath(classId)}/${SUBCOLLECTIONS.enrollments}/${enrollmentId}`;
}

/** Path helper: assignments/{assignmentId}/submissions/{submissionId} */
export function submissionPath(assignmentId: string, submissionId: string): string {
  return `${COLLECTIONS.assignments}/${assignmentId}/${SUBCOLLECTIONS.submissions}/${submissionId}`;
}

/** Path helper: quizzes/{quizId}/questions/{questionId} */
export function quizQuestionPath(quizId: string, questionId: string): string {
  return `${COLLECTIONS.quizzes}/${quizId}/${SUBCOLLECTIONS.questions}/${questionId}`;
}

/** Path helper: quizzes/{quizId}/attempts/{attemptId} */
export function quizAttemptPath(quizId: string, attemptId: string): string {
  return `${COLLECTIONS.quizzes}/${quizId}/${SUBCOLLECTIONS.attempts}/${attemptId}`;
}

/** Path helper: communities/{communityId}/threads/{threadId} */
export function threadPath(communityId: string, threadId: string): string {
  return `${COLLECTIONS.communities}/${communityId}/${SUBCOLLECTIONS.threads}/${threadId}`;
}

/** Path helper: rubrics/{rubricId}/editHistory/{editId} */
export function rubricEditHistoryPath(rubricId: string, editId: string): string {
  return `${COLLECTIONS.rubrics}/${rubricId}/${SUBCOLLECTIONS.editHistory}/${editId}`;
}

/** Path helper: playlists/{playlistId} */
export function playlistPath(playlistId: string): string {
  return `${COLLECTIONS.playlists}/${playlistId}`;
}

/** Path helper: playlists/{playlistId}/items/{itemId} */
export function playlistItemPath(playlistId: string, itemId: string): string {
  return `${playlistPath(playlistId)}/${SUBCOLLECTIONS.items}/${itemId}`;
}

/** Path helper: users/{userId}/playlistItemProgress/{docId} */
export function userPlaylistProgressPath(userId: string, docId: string): string {
  return `${userPath(userId)}/${SUBCOLLECTIONS.playlistItemProgress}/${docId}`;
}

/** Path helper: liveLessons/{liveLessonId}/teacherPlanItems/{itemId} */
export function teacherPlanItemPath(liveLessonId: string, itemId: string): string {
  return `${COLLECTIONS.liveLessons}/${liveLessonId}/${SUBCOLLECTIONS.teacherPlanItems}/${itemId}`;
}
