/**
 * Auth and access control types
 */

export type UserRole = "student" | "teacher" | "admin";

export type AccessGrantType =
  | "individual"
  | "cohort"
  | "institution"
  | "tenant";

export interface AccessGrant {
  type: AccessGrantType;
  scope: string; // classId, cohortId, institutionId, or tenantId
  validFrom: number; // UTC ms
  validTo: number; // UTC ms
  paymentRef?: string; // for auditing only
  userId?: string; // for individual grants
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}
