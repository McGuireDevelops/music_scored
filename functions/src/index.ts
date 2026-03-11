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
import {
  createCheckoutSession,
  stripeWebhook,
} from "./stripe/checkout";
import { submitQuizAttempt } from "./quiz/submitAttempt";

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

export {
  onUserCreate,
  requestAnalysis,
  saveAnalysisSnapshot,
  createCheckoutSession,
  stripeWebhook,
  submitQuizAttempt,
};
