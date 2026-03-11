/**
 * Assignment and submission types
 */

import type { MediaReference } from "../media-reference.js";

export interface Assignment {
  id: string;
  classId: string;
  moduleId: string;
  ownerId: string;
  title: string;
  brief: string;
  styleConstraints?: string;
  techConstraints?: string;
  deadline?: number; // UTC ms
  mediaRefs?: MediaReference[];
  rubricId?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  classId: string;
  mediaRefs?: MediaReference[]; // Storage paths
  decisionLog?: Record<string, unknown>;
  submittedAt: number;
}
