/**
 * Firestore-based rate limiter for expensive callables.
 * Uses rateLimits/{key} documents with a timestamps array.
 */
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

const COL = "rateLimits";
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CALLS = 10;

export async function checkRateLimit(
  callableName: string,
  userId: string,
  maxCalls = MAX_CALLS,
  windowMs = WINDOW_MS
): Promise<void> {
  const key = `${callableName}_${userId}`;
  const docRef = admin.firestore().collection(COL).doc(key);
  const now = Date.now();
  const cutoff = now - windowMs;

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = snap.exists ? snap.data() : null;
    const timestamps: number[] = (data?.timestamps ?? []).filter(
      (t: number) => t > cutoff
    );

    if (timestamps.length >= maxCalls) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${Math.ceil((timestamps[0] + windowMs - now) / 1000)} seconds.`
      );
    }

    timestamps.push(now);
    tx.set(docRef, { timestamps, updatedAt: now }, { merge: true });
  });
}
