/**
 * Curriculum, module, and lesson types
 */

import type { MediaReference } from "../media-reference.js";
import type { CompletionCriteria } from "./certificate.js";

/** @deprecated Legacy Firestore field; use progressionMode. */
export type ModuleReleaseMode = "time-released" | "mastery-based";

/** How students unlock this module or lesson. */
export type ProgressionMode = "open" | "scheduled" | "automatic" | "manual";

export type ProgressAutoInterval = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export type ProgressAutoAnchor = "course_start" | "enrollment";

/** Stored on module and lesson documents for progression gating. */
export interface ContentProgressionFields {
  progressionMode?: ProgressionMode;
  /** When mode is scheduled: content is available at or after this UTC ms. */
  availableFrom?: number;
  autoInterval?: ProgressAutoInterval;
  autoAnchor?: ProgressAutoAnchor;
  /** When autoAnchor is course_start: UTC ms for sibling index 0. */
  autoStartAt?: number;
  /** Manual mode: visible to all enrolled students when true. */
  manualReleasedToClass?: boolean;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  isPublic?: boolean;
  isPaid?: boolean;
  createdAt?: number;
  certificateTemplateId?: string;
  completionCriteria?: CompletionCriteria;
}

export interface Cohort {
  id: string;
  classId: string;
  name: string;
  limit?: number;
}

export interface Curriculum {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  courseIds: string[];
  createdAt?: number;
  updatedAt?: number;
}

/** Single entry in a module’s ordered mix of lessons, assignments, and quizzes (course builder). */
export type ModuleContentKind = "lesson" | "assignment" | "quiz";

export interface ModuleContentOrderItem {
  kind: ModuleContentKind;
  id: string;
}

export interface Module extends ContentProgressionFields {
  id: string;
  classId: string;
  curriculumId?: string;
  name: string;
  /** @deprecated Prefer progressionMode + availableFrom */
  releaseMode?: ModuleReleaseMode;
  /** @deprecated Prefer availableFrom for scheduled mode */
  releasedAt?: number;
  order?: number;
  /** Module-level documents (PDF, Word, video, audio, images) */
  documentRefs?: MediaReference[];
  /** Unified ordering of lessons, assignments, and module-level quizzes in the builder. */
  moduleContentOrder?: ModuleContentOrderItem[];
}

export interface Lesson extends ContentProgressionFields {
  id: string;
  classId: string;
  moduleId: string;
  ownerId: string;
  title: string;
  type: "video" | "audio" | "score" | "text";
  content?: string;
  summary?: string;
  mediaRefs?: MediaReference[];
  order?: number;
  version?: number;
}

export type LessonPlacementLinkType = "owned" | "attached" | "cloned";

export interface LessonPlacement {
  id: string;
  moduleId: string;
  classId: string;
  order: number;
  linkType: LessonPlacementLinkType;
  lessonId?: string;
  sourceLessonId?: string;
  sourceClassId?: string;
}

export interface ZoomRecordingFile {
  fileType: string;
  downloadUrl: string;
  playUrl?: string;
  shareUrl?: string;
  fileSize?: number;
}

export interface ZoomRecording {
  recordingId: string;
  meetingId: number;
  recordingFiles: ZoomRecordingFile[];
  transcriptUrl?: string;
  duration?: number;
  recordingStart?: number;
  recordingEnd?: number;
}

export type RecordingShareTarget =
  | { type: "class"; classId: string }
  | { type: "cohort"; cohortId: string; classId: string }
  | { type: "student"; studentId: string };

export interface RecordingShare {
  id: string;
  sourceType: "liveLesson" | "booking";
  sourceId: string;
  classId?: string;
  ownerId: string;
  recording: ZoomRecording;
  sharedWith: RecordingShareTarget[];
  sharedAt: number;
  updatedAt: number;
}

export type LiveLessonStatus = "scheduled" | "live" | "ended";

export interface LiveLesson {
  id: string;
  classId: string;
  moduleId?: string;
  ownerId: string;
  title: string;
  scheduledAt: number; // UTC ms
  duration?: number; // minutes
  cohortIds?: string[];
  topics?: string[];
  chapterMarkers?: Array<{ timecode: number; label: string }>;
  zoomMeetingId?: number;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  status?: LiveLessonStatus;
  isTimeManaged?: boolean;
  recording?: ZoomRecording;
}

/** In-session Q&A on a live lesson (`liveLessons/{id}/classQuestions`) */
export type ClassQuestionStatus = "open" | "answered" | "returnTo";

export interface ClassQuestion {
  authorId: string;
  text: string;
  createdAt: number;
  status: ClassQuestionStatus;
  updatedAt?: number;
}

/** Must match Firestore rules max length for `classQuestions.text`. */
export const CLASS_QUESTION_TEXT_MAX_LENGTH = 2000;
