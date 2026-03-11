/**
 * Stripe integration for paid class access
 * createCheckoutSession: callable, returns Stripe Checkout URL
 * stripeWebhook: HTTP, handles checkout.session.completed, account.updated
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { getSafeOrigin } from "../utils/origin";
import { checkRateLimit } from "../utils/rateLimit";
import { validateInput } from "../validation";
import { createCheckoutSessionSchema } from "../validation/schemas";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

const GRANT_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Callable: createCheckoutSession
 * Creates Stripe Checkout Session for a paid class. Returns URL to redirect.
 */
export const createCheckoutSession = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    await checkRateLimit("createCheckoutSession", uid);
    const email = request.auth.token.email as string | undefined;

    const { classId } = validateInput(createCheckoutSessionSchema, request.data);

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new HttpsError(
        "failed-precondition",
        "Stripe is not configured. Set STRIPE_SECRET_KEY."
      );
    }

    const classDoc = await admin.firestore().doc(`classes/${classId}`).get();
    if (!classDoc.exists) {
      throw new HttpsError("not-found", "Class not found");
    }
    const classData = classDoc.data()!;
    const stripePriceId = classData.stripePriceId as string | undefined;
    const teacherId = classData.teacherId as string | undefined;
    if (!stripePriceId) {
      throw new HttpsError(
        "failed-precondition",
        "This class is not set up for payment. Ask the teacher to add a Stripe price."
      );
    }

    const origin = getSafeOrigin(
      request.rawRequest.headers.origin as string | undefined
    );
    const successUrl = `${origin}/student?checkout=success`;
    const cancelUrl = `${origin}/purchase/${classId}?checkout=cancelled`;

    let stripeAccount: string | undefined;
    if (teacherId) {
      const settingsSnap = await admin
        .firestore()
        .doc(`teacherSettings/${teacherId}`)
        .get();
      const settings = settingsSnap.data();
      if (
        settings?.stripeConnectAccountId &&
        settings?.stripeOnboardingComplete === true
      ) {
        stripeAccount = settings.stripeConnectAccountId as string;
      }
    }

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email ?? undefined,
      client_reference_id: uid,
      metadata: {
        classId,
        userId: uid,
      },
    };

    const stripe = getStripe();
    const session = stripeAccount
      ? await stripe.checkout.sessions.create(sessionOptions, {
          stripeAccount,
        })
      : await stripe.checkout.sessions.create(sessionOptions);

    return {
      url: session.url,
      sessionId: session.id,
      className: classData.name ?? "Class",
    };
  }
);

/**
 * HTTP: stripeWebhook
 * Handles Stripe webhook events. Verify signature with STRIPE_WEBHOOK_SECRET.
 */
export const stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !sig) {
    res.status(400).send("Webhook secret or signature missing");
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(400).send("Raw body required for signature verification");
      return;
    }
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).send(`Webhook signature verification failed: ${message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const classId = session.metadata?.classId;
    const userId = session.metadata?.userId ?? session.client_reference_id;

    if (classId && userId) {
      const now = Date.now();
      const validTo = now + GRANT_DURATION_MS;
      await admin.firestore().doc(`users/${userId}/accessGrants/${classId}`).set(
        {
          validFrom: now,
          validTo,
          paymentRef: session.payment_intent ?? session.id,
          updatedAt: now,
        },
        { merge: true }
      );
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    if (account.charges_enabled === true) {
      const settingsSnap = await admin
        .firestore()
        .collection("teacherSettings")
        .where("stripeConnectAccountId", "==", account.id)
        .limit(1)
        .get();
      if (!settingsSnap.empty) {
        const docRef = settingsSnap.docs[0].ref;
        await docRef.update({
          stripeOnboardingComplete: true,
          updatedAt: Date.now(),
        });
      }
    }
  }

  res.status(200).send("OK");
});
