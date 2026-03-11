import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { useTeacherSettings } from "../../hooks/useTeacherSettings";
import { useTeacherClasses } from "../../hooks/useTeacherClasses";
import type { TeacherFeatureFlags } from "@learning-scores/shared";

const navIcons: Record<string, React.ReactNode> = {
  Dashboard: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
  Students: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m0 0a4 4 0 017.94 0M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Community: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Courses: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  "Course Builder": (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Roster: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Quizzes: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    </svg>
  ),
  Playlists: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h10m-10 4h6m8-4a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Library: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Live: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Certifications: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  Curricula: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
    </svg>
  ),
  Calendar: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Settings: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  Help: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Admin: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  "To-do": (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  "Office Hours": (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "Book a Session": (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Reports: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

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
  { to: "/teacher/library", label: "Library", roles: ["teacher", "admin"] },
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
    ...(isTeacherOrAdmin && features.officeHours !== false
      ? [{ to: "/teacher/availability", label: "Office Hours" }]
      : []),
    ...(!isTeacherOrAdmin && profile?.role === "student"
      ? [{ to: "/student/bookings", label: "Book a Session" }]
      : []),
    ...(isTeacherOrAdmin ? [{ to: "/teacher/settings", label: "Settings" }] : []),
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
      <nav className={`flex flex-1 flex-col gap-0.5 py-2 ${collapsed ? "px-1.5" : "px-3"}`}>
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
  const icon = navIcons[label] ?? null;

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
        <span className="flex h-5 w-5 items-center justify-center shrink-0">
          {icon ?? <span className="text-xs font-semibold">{label.charAt(0).toUpperCase()}</span>}
        </span>
      ) : (
        <>
          {icon && <span className="flex h-5 w-5 items-center justify-center shrink-0">{icon}</span>}
          {children}
        </>
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
