/**
 * Cloud Functions for Learning Scores
 * Auth trigger, AI analysis pipeline
 */

import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { onUserCreate } from "./auth/onUserCreate";
import {
  requestAnalysis,
  saveAnalysisSnapshot,
} from "./ai/analysis";
import { generateLessonSummary } from "./ai/lessonSummary";
import {
  createCheckoutSession,
  stripeWebhook,
} from "./stripe/checkout";
import { getStripeConnectOnboardingLink } from "./stripe/connect";
import { submitQuizAttempt } from "./quiz/submitAttempt";
import { listUsers } from "./admin/listUsers";
import { updateUserRole } from "./admin/updateUserRole";
import { getTeacherSettings, updateTeacherSettings } from "./admin/getTeacherSettings";
import {
  getTeacherLessons,
  createTeacherLesson,
  updateTeacherLesson,
  deleteTeacherLesson,
} from "./admin/getTeacherLessons";
import { getTeacherStudents } from "./admin/getTeacherStudents";
import { getTeacherCommunity } from "./admin/getTeacherCommunity";

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

export {
  onUserCreate,
  requestAnalysis,
  saveAnalysisSnapshot,
  generateLessonSummary,
  createCheckoutSession,
  stripeWebhook,
  getStripeConnectOnboardingLink,
  submitQuizAttempt,
  listUsers,
  updateUserRole,
  getTeacherSettings,
  updateTeacherSettings,
  getTeacherLessons,
  createTeacherLesson,
  updateTeacherLesson,
  deleteTeacherLesson,
  getTeacherStudents,
  getTeacherCommunity,
};
