/**
 * Curriculum, module, and lesson types
 */

import type { MediaReference } from "../media-reference.js";
import type { CompletionCriteria } from "./certificate.js";

export type ModuleReleaseMode = "time-released" | "mastery-based";

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
  classId: string;
  name?: string;
}

export interface Module {
  id: string;
  classId: string;
  curriculumId?: string;
  name: string;
  releaseMode: ModuleReleaseMode;
  releasedAt?: number; // for time-released
  order?: number;
  /** Module-level documents (PDF, Word, video, audio, images) */
  documentRefs?: MediaReference[];
}

export interface Lesson {
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
}
