import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { useTenantBranding, type TenantBranding } from "../hooks/useTenantBranding";

interface TenantContextType {
  tenantId: string | null;
  branding: TenantBranding;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

/** Resolves tenantId from current route and auth. */
function useResolvedTenantId(): string | null {
  const { pathname } = useLocation();
  const params = useParams();
  const { user, profile } = useAuth();
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // /profile/:profileId — profileId is the tenant (teacher uid)
      const profileId = params.profileId;
      if (profileId && pathname.startsWith("/profile/")) {
        setResolvedId(profileId);
        return;
      }

      // / or /teacher/* — current user is tenant if they're a teacher (dashboard shows teacher branding)
      const isTeacherContext =
        (pathname === "/" || pathname.startsWith("/teacher")) &&
        user &&
        (profile?.role === "teacher" || profile?.role === "admin");
      if (isTeacherContext) {
        setResolvedId(user.uid);
        return;
      }

      // /student/class/:id, /teacher/class/:id — fetch class for teacherId
      const classId = params.id ?? params.classId;
      if (classId && (pathname.includes("/class/") || pathname.startsWith("/purchase/"))) {
        try {
          const snap = await getDoc(doc(db, "classes", classId));
          if (cancelled) return;
          if (snap.exists()) {
            const teacherId = snap.data().teacherId;
            setResolvedId(teacherId ?? null);
            return;
          }
        } catch {
          // ignore
        }
        setResolvedId(null);
        return;
      }

      setResolvedId(null);
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [pathname, params.profileId, params.id, params.classId, user?.uid, profile?.role]);

  return resolvedId;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const tenantId = useResolvedTenantId();
  const { branding, loading } = useTenantBranding(tenantId);

  const value = useMemo(
    () => ({
      tenantId,
      branding,
      loading,
    }),
    [tenantId, branding, loading]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
