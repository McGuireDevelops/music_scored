import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { TeacherProfile } from "@learning-scores/shared";

export interface TenantBranding {
  tenantName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
}

const DEFAULT_BRANDING: TenantBranding = {
  tenantName: "Learning Scores",
  primaryColor: "#6366F1",
  accentColor: "#818CF8",
};

export function useTenantBranding(tenantId: string | null | undefined) {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(!!tenantId);

  useEffect(() => {
    if (!tenantId) {
      setBranding(DEFAULT_BRANDING);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, "teacherProfiles", tenantId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data() as TeacherProfile;
          setBranding({
            tenantName: d.tenantName ?? DEFAULT_BRANDING.tenantName,
            logoUrl: d.logoUrl,
            faviconUrl: d.faviconUrl,
            primaryColor: d.primaryColor ?? DEFAULT_BRANDING.primaryColor,
            accentColor: d.accentColor ?? DEFAULT_BRANDING.accentColor,
          });
        } else {
          setBranding(DEFAULT_BRANDING);
        }
      })
      .catch(() => {
        if (!cancelled) setBranding(DEFAULT_BRANDING);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return { branding, loading };
}
