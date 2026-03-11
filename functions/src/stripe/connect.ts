/**
 * Stripe Connect: teacher onboarding to receive payments
 * getStripeConnectOnboardingLink: callable, returns URL for Stripe onboarding
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { getSafeOrigin } from "../utils/origin";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

/**
 * Callable: getStripeConnectOnboardingLink
 * Returns a URL for the teacher to complete Stripe Connect onboarding.
 * Creates a new Express connected account if none exists.
 */
export const getStripeConnectOnboardingLink = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    const role = userDoc.data()?.role;
    if (role !== "teacher" && role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only teachers can connect Stripe"
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new HttpsError(
        "failed-precondition",
        "Stripe is not configured. Set STRIPE_SECRET_KEY."
      );
    }

    const settingsRef = admin.firestore().doc(`teacherSettings/${uid}`);
    const settingsSnap = await settingsRef.get();
    const settings = settingsSnap.data();
    const existingAccountId = settings?.stripeConnectAccountId as string | undefined;
    const onboardingComplete = settings?.stripeOnboardingComplete === true;

    if (existingAccountId && onboardingComplete) {
      return { alreadyConnected: true, url: null };
    }

    let accountId = existingAccountId;

    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: "express",
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await settingsRef.set(
        {
          userId: uid,
          stripeConnectAccountId: accountId,
          stripeOnboardingComplete: false,
          features: settings?.features ?? {},
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    const origin = getSafeOrigin(
      request.rawRequest.headers.origin as string | undefined
    );
    const accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/teacher/settings?stripe=refresh`,
      return_url: `${origin}/teacher/settings?stripe=success`,
      type: "account_onboarding",
    });

    return { url: accountLink.url, alreadyConnected: false };
  }
);
