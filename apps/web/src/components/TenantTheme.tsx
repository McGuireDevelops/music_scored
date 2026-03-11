import type { ReactNode } from "react";
import { useTenant } from "../contexts/TenantContext";
import { darkenHex } from "../utils/color";

const DEFAULT_PRIMARY = "#6366F1";
const DEFAULT_SIDEBAR = "#1D0D37";
const DEFAULT_SIDEBAR_HOVER = "#2A1247";
const DEFAULT_SIDEBAR_ACTIVE = "#3D1E5C";

export function TenantTheme({ children }: { children: ReactNode }) {
  const { tenantId, branding } = useTenant();

  const primary = branding.primaryColor ?? DEFAULT_PRIMARY;
  const primaryDark = branding.accentColor ?? darkenHex(primary, 0.15);
  const primaryLight = branding.accentColor ?? primary; // approximate, accent often lighter
  const sidebar = tenantId ? darkenHex(primary, 0.6) : DEFAULT_SIDEBAR;
  const sidebarHover = tenantId ? darkenHex(primary, 0.5) : DEFAULT_SIDEBAR_HOVER;
  const sidebarActive = tenantId ? darkenHex(primary, 0.4) : DEFAULT_SIDEBAR_ACTIVE;

  const style: React.CSSProperties = tenantId
    ? {
        // @ts-expect-error CSS custom properties
        "--color-primary": primary,
        "--color-primary-dark": primaryDark,
        "--color-primary-light": primaryLight,
        "--color-sidebar": sidebar,
        "--color-sidebar-hover": sidebarHover,
        "--color-sidebar-active": sidebarActive,
      }
    : {};

  return (
    <div data-tenant={tenantId ?? undefined} style={style}>
      {children}
    </div>
  );
}
