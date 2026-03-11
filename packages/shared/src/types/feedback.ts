/**
 * Rubric, criterion, and feedback types
 */

import type { MediaReference } from "../media-reference.js";

export interface PartialSatisfactionLevel {
  id: string;
  label: string;
  description?: string;
}

export interface Criterion {
  id: string;
  description: string;
  partialSatisfactionLevels: PartialSatisfactionLevel[];
  exampleRef?: MediaReference;
}

export interface RubricAxis {
  id: string;
  name: string;
  criteria: Criterion[];
}

export interface RubricEditRecord {
  timestamp: number;
  changedBy: string;
  changes: string;
}

export interface Rubric {
  id: string;
  name: string;
  ownerId: string;
  axes: RubricAxis[];
  version: number;
  editHistory: RubricEditRecord[];
}

export interface FeedbackCriterionResult {
  criterionId: string;
  axisId: string;
  levelId: string;
}

export interface Feedback {
  id: string;
  userId: string;
  teacherId: string;
  submissionId: string;
  assignmentId: string;
  rubricId: string;
  criterionResults: FeedbackCriterionResult[];
  comment?: string;
  mediaRefs?: MediaReference[];
  createdAt: number;
  updatedAt: number;
}
