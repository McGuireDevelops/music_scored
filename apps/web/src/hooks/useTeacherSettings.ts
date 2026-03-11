import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getPermissionErrorMessage, isFirebasePermissionError } from "../utils/firebaseErrors";
import type { TeacherSettings, TeacherFeatureFlags } from "@learning-scores/shared";

const DEFAULT_FEATURES: TeacherFeatureFlags = {
  quizzes: true,
  community: true,
  liveLessons: true,
  assignments: true,
  certificates: true,
  playlists: true,
  paidClasses: true,
};

function mergeWithDefaults(features: TeacherFeatureFlags | undefined): TeacherFeatureFlags {
  return {
    ...DEFAULT_FEATURES,
    ...features,
  };
}

export function useTeacherSettings(uid: string | undefined) {
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setPermissionError(null);
      return;
    }
    setPermissionError(null);
    getDoc(doc(db, "teacherSettings", uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setSettings({
            userId: d.userId ?? uid,
            features: mergeWithDefaults(d.features),
            stripeConnectAccountId: d.stripeConnectAccountId,
            stripeOnboardingComplete: d.stripeOnboardingComplete ?? false,
            updatedAt: d.updatedAt ?? Date.now(),
          });
        } else {
          setSettings({
            userId: uid,
            features: { ...DEFAULT_FEATURES },
            updatedAt: Date.now(),
          });
        }
      })
      .catch((err) => {
        setSettings({
          userId: uid,
          features: { ...DEFAULT_FEATURES },
          updatedAt: Date.now(),
        });
        if (isFirebasePermissionError(err)) {
          setPermissionError(getPermissionErrorMessage(err));
        }
      })
      .finally(() => setLoading(false));
  }, [uid]);

  const updateFeatures = useCallback(
    async (features: Partial<TeacherFeatureFlags>) => {
      if (!uid) return;
      const nextFeatures = {
        ...(settings?.features ?? DEFAULT_FEATURES),
        ...features,
      };
      const payload = {
        userId: uid,
        features: nextFeatures,
        stripeConnectAccountId: settings?.stripeConnectAccountId,
        stripeOnboardingComplete: settings?.stripeOnboardingComplete,
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, "teacherSettings", uid), payload, { merge: true });
      setSettings((prev) =>
        prev ? { ...prev, ...payload } : { ...payload, userId: uid }
      );
    },
    [uid, settings?.features, settings?.stripeConnectAccountId, settings?.stripeOnboardingComplete]
  );

  const updateSettings = useCallback(
    async (updates: Partial<Omit<TeacherSettings, "userId">>) => {
      if (!uid) return;
      const payload = {
        userId: uid,
        ...settings,
        ...updates,
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, "teacherSettings", uid), payload, { merge: true });
      setSettings((prev) => (prev ? { ...prev, ...payload } : payload));
    },
    [uid, settings]
  );

  const refetch = useCallback(async () => {
    if (!uid) return;
    const snap = await getDoc(doc(db, "teacherSettings", uid));
    if (snap.exists()) {
      const d = snap.data();
      setSettings({
        userId: d.userId ?? uid,
        features: mergeWithDefaults(d.features),
        stripeConnectAccountId: d.stripeConnectAccountId,
        stripeOnboardingComplete: d.stripeOnboardingComplete ?? false,
        updatedAt: d.updatedAt ?? Date.now(),
      });
    } else {
      setSettings({
        userId: uid,
        features: { ...DEFAULT_FEATURES },
        updatedAt: Date.now(),
      });
    }
  }, [uid]);

  const features = settings ? mergeWithDefaults(settings.features) : DEFAULT_FEATURES;

  return {
    settings,
    features,
    loading,
    permissionError,
    updateFeatures,
    updateSettings,
    refetch,
  };
}
