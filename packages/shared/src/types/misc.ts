/**
 * Community, portfolio, certification, analysis, teacher profile types
 */

import type { MediaReference } from "../media-reference.js";

export type ThreadType = "critique" | "discussion" | "reference" | "announcement";

export interface Community {
  id: string;
  classId: string;
  ownerId: string;
  name: string;
  cohortIds?: string[];
}

export interface Thread {
  id: string;
  communityId: string;
  authorId: string;
  type: ThreadType;
  title: string;
  content: string;
  isAnonymous?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PortfolioItem {
  id: string;
  userId: string;
  classId: string;
  submissionIds: string[];
  feedbackIds?: string[];
  label?: string;
  createdAt: number;
}

export interface Certification {
  id: string;
  userId: string;
  issuedBy: string;
  classId: string;
  criteriaMet: string[];
  issuedAt: number;
  revokedAt?: number;
}

export interface AnalysisSnapshot {
  id: string;
  source: string; // e.g. "submission", "lesson"
  sourceId: string;
  createdBy: string;
  confidence?: number;
  timestamp: number;
  editedByTeacher: boolean;
  payload: Record<string, unknown>; // type-specific: segments, tags, etc.
}

export interface TeacherProfile {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  headline?: string;
  publicClasses?: string[];
  /** White-label branding */
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  tenantName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeacherFeatureFlags {
  quizzes?: boolean;
  community?: boolean;
  liveLessons?: boolean;
  assignments?: boolean;
  certificates?: boolean;
  playlists?: boolean;
  paidClasses?: boolean;
}

export interface TeacherSettings {
  userId: string;
  features: TeacherFeatureFlags;
  stripeConnectAccountId?: string;
  stripeOnboardingComplete?: boolean;
  updatedAt: number;
}
