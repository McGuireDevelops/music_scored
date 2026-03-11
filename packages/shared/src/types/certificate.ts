/**
 * Certificate template and course completion types
 */

export interface CertificateTemplateLayout {
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  logoRef?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface CertificateTemplate {
  id: string;
  classId: string;
  ownerId: string;
  name: string;
  layout: CertificateTemplateLayout;
  placeholders: string[];
  createdAt: number;
  updatedAt: number;
}

export type CompletionCriteriaType = "modules" | "assignments" | "quizzes" | "manual";

export interface CompletionCriteria {
  type: CompletionCriteriaType;
  config: {
    modulesComplete?: boolean;
    mandatoryAssignmentsSubmitted?: boolean;
    quizzesPassingThreshold?: number;
    manualApprovalRequired?: boolean;
  };
}

export interface ClassCompletion {
  id: string;
  userId: string;
  classId: string;
  completedAt: number;
  criteriaMet: string[];
  certificateId?: string;
}
