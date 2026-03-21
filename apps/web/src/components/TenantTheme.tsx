import type { ReactNode } from "react";
import { useTenant } from "../contexts/TenantContext";
import { darkenHex } from "../utils/color";

const DEFAULT_PRIMARY = "#6366F1";

export function TenantTheme({ children }: { children: ReactNode }) {
  const { tenantId, branding } = useTenant();

  const primary = branding.primaryColor ?? DEFAULT_PRIMARY;
  const primaryDark = branding.accentColor ?? darkenHex(primary, 0.15);
  const primaryLight = branding.accentColor ?? primary; // approximate, accent often lighter
  const sidebar = darkenHex(primary, 0.6);
  const sidebarHover = darkenHex(primary, 0.5);
  const sidebarActive = darkenHex(primary, 0.4);

  const style: React.CSSProperties = {
    // @ts-expect-error CSS custom properties
    "--color-primary": primary,
    "--color-primary-dark": primaryDark,
    "--color-primary-light": primaryLight,
    "--color-sidebar": sidebar,
    "--color-sidebar-hover": sidebarHover,
    "--color-sidebar-active": sidebarActive,
  };

  return (
    <div data-tenant={tenantId ?? undefined} style={style}>
      {children}
    </div>
  );
}
