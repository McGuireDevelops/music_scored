import { useState, useEffect, useCallback } from "react";
import { functions, httpsCallable } from "../firebase";
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
  officeHours: true,
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
    const getSettings = httpsCallable<unknown, TeacherSettings>(functions, "getTeacherSettings");
    getSettings({})
      .then((res) => {
        const data = res.data as TeacherSettings;
        setSettings({
          userId: data.userId ?? uid,
          features: mergeWithDefaults(data.features),
          stripeConnectAccountId: data.stripeConnectAccountId,
          stripeOnboardingComplete: data.stripeOnboardingComplete ?? false,
          zoomAccountId: data.zoomAccountId,
          zoomClientId: data.zoomClientId,
          zoomClientSecret: data.zoomClientSecret,
          presentationPresets: data.presentationPresets ?? [],
          updatedAt: data.updatedAt ?? Date.now(),
        });
      })
      .catch((err) => {
        setSettings({
          userId: uid,
          features: { ...DEFAULT_FEATURES },
          presentationPresets: [],
          updatedAt: Date.now(),
        });
        if (isFirebasePermissionError(err)) {
          setPermissionError(getPermissionErrorMessage(err));
        }
      })
      .finally(() => setLoading(false));
  }, [uid]);

  const updateTeacherSettingsFn = httpsCallable<
    Record<string, unknown>,
    { success: boolean }
  >(functions, "updateTeacherSettings");

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
      await updateTeacherSettingsFn(payload);
      setSettings((prev) =>
        prev ? { ...prev, ...payload } : { ...payload, userId: uid }
      );
    },
    [uid, settings?.features, settings?.stripeConnectAccountId, settings?.stripeOnboardingComplete]
  );

  const updateSettings = useCallback(
    async (updates: Partial<Omit<TeacherSettings, "userId">>) => {
      if (!uid) return;
      const payload: TeacherSettings = {
        ...(settings ?? {}),
        userId: uid,
        features: settings?.features ?? DEFAULT_FEATURES,
        updatedAt: Date.now(),
        ...updates,
      };
      const toSend = { ...payload } as Record<string, unknown>;
      if (toSend.zoomClientSecret === "••••••••") {
        delete toSend.zoomClientSecret;
      }
      await updateTeacherSettingsFn(toSend);
      setSettings((prev) => (prev ? { ...prev, ...payload } : payload));
    },
    [uid, settings]
  );

  const refetch = useCallback(async () => {
    if (!uid) return;
    const getSettings = httpsCallable<unknown, TeacherSettings>(functions, "getTeacherSettings");
    const res = await getSettings({});
    const data = res.data as TeacherSettings;
    setSettings({
      userId: data.userId ?? uid,
      features: mergeWithDefaults(data.features),
      stripeConnectAccountId: data.stripeConnectAccountId,
      stripeOnboardingComplete: data.stripeOnboardingComplete ?? false,
      zoomAccountId: data.zoomAccountId,
      zoomClientId: data.zoomClientId,
      zoomClientSecret: data.zoomClientSecret,
      presentationPresets: data.presentationPresets ?? [],
      updatedAt: data.updatedAt ?? Date.now(),
    });
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
