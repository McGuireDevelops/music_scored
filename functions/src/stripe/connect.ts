/**
 * Stripe Connect: teacher onboarding to receive payments
 * getStripeConnectOnboardingLink: callable, returns URL for Stripe onboarding
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

/**
 * Callable: getStripeConnectOnboardingLink
 * Returns a URL for the teacher to complete Stripe Connect onboarding.
 * Creates a new Express connected account if none exists.
 */
export const getStripeConnectOnboardingLink = onCall(
  { enforceAppCheck: false },
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
      const account = await stripe.accounts.create({
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

    const origin = request.rawRequest.headers.origin ?? "http://localhost:5173";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/teacher/settings?stripe=refresh`,
      return_url: `${origin}/teacher/settings?stripe=success`,
      type: "account_onboarding",
    });

    return { url: accountLink.url, alreadyConnected: false };
  }
);
