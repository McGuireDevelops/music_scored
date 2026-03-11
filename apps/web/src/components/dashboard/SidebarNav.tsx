import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { useTeacherSettings } from "../../hooks/useTeacherSettings";
import { useTeacherClasses } from "../../hooks/useTeacherClasses";
import type { TeacherFeatureFlags } from "@learning-scores/shared";

const navItems: {
  to: string;
  label: string;
  roles?: string[];
  featureKey?: keyof TeacherFeatureFlags;
}[] = [
  { to: "/", label: "Dashboard" },
  { to: "/teacher/students", label: "Students", roles: ["teacher", "admin"] },
  { to: "/teacher/community", label: "Community", roles: ["teacher", "admin"], featureKey: "community" },
  { to: "/student", label: "Courses", roles: ["student", "admin"] },
  { to: "/admin", label: "Admin", roles: ["admin"] },
  { to: "/student/portfolio", label: "Library", roles: ["student", "teacher", "admin"] },
  { to: "/student/todo", label: "To-do", roles: ["student", "admin"] },
  { to: "/student/certifications", label: "Certifications", roles: ["student", "teacher", "admin"] },
];

const curriculumTabs: { id: string; label: string }[] = [
  { id: "builder", label: "Course Builder" },
  { id: "roster", label: "Roster" },
];

const documentsNavItems: {
  to?: string;
  label: string;
  tab?: string;
  roles?: string[];
  featureKey?: keyof TeacherFeatureFlags;
}[] = [
  { to: "/teacher/quizzes", label: "Quizzes", roles: ["teacher", "admin"], featureKey: "quizzes" },
  { tab: "playlists", label: "Playlists", roles: ["teacher", "admin"] },
  { to: "/student/portfolio", label: "Library", roles: ["teacher", "admin"] },
  { tab: "live", label: "Live", roles: ["teacher", "admin"], featureKey: "liveLessons" },
  { to: "/student/certifications", label: "Certifications", roles: ["teacher", "admin"] },
  { to: "/teacher/curricula", label: "Curricula", roles: ["teacher", "admin"] },
];

export const classNavTabs: { id: string; label: string }[] = [
  { id: "builder", label: "Course Builder" },
  { id: "quizzes", label: "Quizzes" },
  { id: "live", label: "Live" },
  { id: "roster", label: "Roster" },
  { id: "reports", label: "Reports" },
  { id: "playlists", label: "Playlists" },
  { id: "community", label: "Community" },
];

interface SidebarNavProps {
  open?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarNav({ open = false, collapsed = false, onToggleCollapse }: SidebarNavProps) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { branding } = useTenant();
  const isTeacherOrAdmin = profile?.role === "teacher" || profile?.role === "admin";
  const { features, permissionError } = useTeacherSettings(isTeacherOrAdmin ? user?.uid : undefined);
  const { classes: teacherClasses } = useTeacherClasses(isTeacherOrAdmin ? user?.uid : undefined);

  const classMatch = location.pathname.match(/^\/(teacher|student)\/class\/([^/]+)/);
  const classBasePath = classMatch ? `/${classMatch[1]}/class/${classMatch[2]}` : null;
  const firstClassId = teacherClasses[0]?.id;
  const courseSectionBasePath =
    classBasePath ??
    (isTeacherOrAdmin ? (firstClassId ? `/teacher/class/${firstClassId}` : "/teacher") : null);
  const currentTab = courseSectionBasePath
    ? new URLSearchParams(location.search).get("tab") || "builder"
    : null;
  const showCourseSection = !!courseSectionBasePath;

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user || !profile) return false;
    if (!item.roles.includes(profile.role)) return false;
    if (item.featureKey !== undefined && features[item.featureKey] === false) return false;
    return true;
  });

  const teacherTopItems = [
    { to: "/", label: "Dashboard" },
    ...(isTeacherOrAdmin ? [{ to: "/teacher/students", label: "Students" as const }] : []),
    ...(isTeacherOrAdmin && features.community !== false
      ? [{ to: "/teacher/community", label: "Community" as const }]
      : []),
  ].filter(Boolean) as { to: string; label: string }[];

  const visibleDocumentsItems = documentsNavItems
    .filter((item) => {
      if (!item.roles?.includes(profile?.role ?? "")) return false;
      if (item.featureKey !== undefined && features[item.featureKey] === false) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      to: item.to ?? (item.tab && courseSectionBasePath ? `${courseSectionBasePath}?tab=${item.tab}` : "#"),
    }));

  const bottomItems: { to: string; label: string }[] = [
    { to: "/calendar", label: "Calendar" },
    { to: "/help", label: "Help" },
    ...(profile?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  const isCurrent = (to: string, tab?: string) => {
    if (to === "#") return false;
    if (to === "/") return location.pathname === "/" && !location.search;
    const pathOnly = to.replace(/#.*/, "").split("?")[0];
    if (tab && classBasePath) {
      const currentTab = new URLSearchParams(location.search).get("tab");
      return location.pathname === classBasePath && currentTab === tab;
    }
    return location.pathname === pathOnly || location.pathname.startsWith(pathOnly + "/");
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col bg-sidebar transition-all duration-200 ${
        collapsed ? "lg:w-16" : "lg:w-60"
      } w-60 ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <Link
        to="/"
        className={`flex items-center gap-3 py-5 text-lg font-semibold text-white no-underline transition-colors hover:text-white ${
          collapsed ? "justify-center px-2" : "px-5"
        }`}
        title={collapsed ? (branding.tenantName ?? "Learning Scores") : undefined}
      >
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="h-8 w-auto shrink-0 object-contain" />
        ) : null}
        {!collapsed && (branding.tenantName ?? "Learning Scores")}
        {collapsed && !branding.logoUrl && (
          <span className="text-base font-bold">{(branding.tenantName ?? "LS").charAt(0)}</span>
        )}
      </Link>
      <nav className={`flex flex-1 flex-col gap-0.5 overflow-y-auto py-2 ${collapsed ? "px-1.5" : "px-3"}`}>
        {teacherTopItems.map((item) => (
          <SidebarNavLink key={`${item.to}-${item.label}`} to={item.to} current={isCurrent(item.to)} collapsed={collapsed}>
            {item.label}
          </SidebarNavLink>
        ))}
        {!isTeacherOrAdmin && (
          <SidebarNavLink to="/student" current={isCurrent("/student")} collapsed={collapsed}>
            Courses
          </SidebarNavLink>
        )}

        {isTeacherOrAdmin && showCourseSection ? (
          <>
            {!collapsed && (
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                Course
              </div>
            )}
            {collapsed && <div className="my-1 border-t border-white/10" />}
            {curriculumTabs.map((tab) => (
              <SidebarNavLink
                key={tab.id}
                to={`${courseSectionBasePath}?tab=${tab.id}`}
                current={classBasePath ? currentTab === tab.id : false}
                collapsed={collapsed}
              >
                {tab.label}
              </SidebarNavLink>
            ))}
          </>
        ) : null}

        {isTeacherOrAdmin && visibleDocumentsItems.length > 0 ? (
          <>
            {!collapsed && (
              <div className="mt-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                Manage
              </div>
            )}
            {collapsed && <div className="my-1 border-t border-white/10" />}
            {visibleDocumentsItems.map((item) => (
              <SidebarNavLink
                key={item.label}
                to={item.to}
                current={isCurrent(item.to, item.tab)}
                collapsed={collapsed}
              >
                {item.label}
              </SidebarNavLink>
            ))}
          </>
        ) : null}

        {!isTeacherOrAdmin &&
          visibleItems
            .filter(
              (item) =>
                item.label === "Library" || item.label === "To-do" || item.label === "Certifications"
            )
            .map((item) => (
              <SidebarNavLink key={`${item.to}-${item.label}`} to={item.to} current={isCurrent(item.to)} collapsed={collapsed}>
                {item.label}
              </SidebarNavLink>
            ))}

        <div className="my-2 border-t border-white/10" />

        {bottomItems.map((item) => (
          <SidebarNavLink key={`${item.to}-${item.label}`} to={item.to} current={isCurrent(item.to)} collapsed={collapsed}>
            {item.label}
          </SidebarNavLink>
        ))}
      </nav>
      {permissionError && !collapsed && (
        <div className="mx-3 mb-2 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-100">
          {permissionError}
        </div>
      )}
      {!user && (
        <div className={`border-t border-white/10 ${collapsed ? "px-1.5 py-3" : "px-4 py-4"}`}>
          <Link
            to="/signin"
            className={`block rounded-lg bg-primary text-center font-medium text-white no-underline transition-colors hover:bg-primary-dark ${
              collapsed ? "p-2 text-xs" : "px-4 py-2 text-sm"
            }`}
            title={collapsed ? "Sign in" : undefined}
          >
            {collapsed ? (
              <svg className="mx-auto h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            ) : (
              "Sign in"
            )}
          </Link>
        </div>
      )}
      {/* Desktop collapse toggle at the very bottom */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden border-t border-white/10 p-3 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={`mx-auto h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          </svg>
        </button>
      )}
    </aside>
  );
}

function SidebarNavLink({
  to,
  current,
  collapsed = false,
  children,
}: {
  to: string;
  current: boolean;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  const label = typeof children === "string" ? children : "";
  const initial = label.charAt(0).toUpperCase();

  const className = `group relative flex items-center rounded-lg text-sm font-medium transition-colors ${
    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
  } ${
    current
      ? "bg-sidebar-active text-white"
      : "text-white/70 hover:bg-sidebar-hover hover:text-white"
  } ${to === "#" ? "cursor-default" : ""}`;

  const content = (
    <>
      {current && (
        <span className="absolute left-0 h-6 w-0.5 rounded-r bg-primary" />
      )}
      {collapsed ? (
        <span className="flex h-6 w-6 items-center justify-center text-xs font-semibold">
          {initial}
        </span>
      ) : (
        children
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full z-[60] ml-2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
        </span>
      )}
    </>
  );

  if (to === "#") {
    return <span className={className} title={collapsed ? label : undefined}>{content}</span>;
  }

  return (
    <Link to={to} className={`${className} no-underline`} title={collapsed ? label : undefined}>
      {content}
    </Link>
  );
}
