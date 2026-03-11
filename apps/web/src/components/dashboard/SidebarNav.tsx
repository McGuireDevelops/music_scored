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
  { to: "/teacher/profile", label: "My profile", roles: ["teacher", "admin"] },
  { to: "/teacher/settings", label: "Settings", roles: ["teacher", "admin"] },
  { to: "/admin", label: "Admin", roles: ["admin"] },
  { to: "/student/portfolio", label: "Library", roles: ["student", "teacher", "admin"] },
  { to: "/student/todo", label: "To-do", roles: ["student", "admin"] },
  { to: "/student/certifications", label: "Certifications", roles: ["student", "teacher", "admin"] },
];

// Teacher: Curriculum section (class-based tabs when on a class or have a class)
const curriculumTabs: { id: string; label: string }[] = [
  { id: "course", label: "Courses" },
  { id: "modules", label: "Modules" },
  { id: "lessons", label: "Lessons" },
  { id: "assignments", label: "Assignments" },
  { id: "roster", label: "Roster" },
];

// Teacher: Documents section (mix of global routes and class tabs)
const documentsNavItems: {
  to: string;
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
];

// Class detail page still uses full tab set for in-page tabs
export const classNavTabs: { id: string; label: string }[] = [
  { id: "curriculum", label: "Curriculum" },
  { id: "course", label: "Course" },
  { id: "modules", label: "Modules" },
  { id: "lessons", label: "Lessons" },
  { id: "assignments", label: "Assignments" },
  { id: "documents", label: "Documents" },
  { id: "quizzes", label: "Quizzes" },
  { id: "live", label: "Live" },
  { id: "roster", label: "Roster" },
  { id: "reports", label: "Reports" },
  { id: "playlists", label: "Playlists" },
  { id: "community", label: "Community" },
];

interface SidebarNavProps {
  open?: boolean;
}

export function SidebarNav({ open = false }: SidebarNavProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const { branding } = useTenant();
  const isTeacherOrAdmin = profile?.role === "teacher" || profile?.role === "admin";
  const { features, permissionError } = useTeacherSettings(isTeacherOrAdmin ? user?.uid : undefined);
  const { classes: teacherClasses } = useTeacherClasses(isTeacherOrAdmin ? user?.uid : undefined);

  const classMatch = location.pathname.match(/^\/(teacher|student)\/class\/([^/]+)/);
  const classBasePath = classMatch ? `/${classMatch[1]}/class/${classMatch[2]}` : null;
  const firstClassId = teacherClasses[0]?.id;
  // Show Course block: on a class page, or for teachers (dashboard with first class, or with no class so the 12 tabs still appear)
  const courseSectionBasePath =
    classBasePath ??
    (isTeacherOrAdmin ? (firstClassId ? `/teacher/class/${firstClassId}` : "/teacher") : null);
  const currentTab = courseSectionBasePath
    ? new URLSearchParams(location.search).get("tab") || "curriculum"
    : null;
  const showCourseSection = !!courseSectionBasePath;

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user || !profile) return false;
    if (!item.roles.includes(profile.role)) return false;
    if (item.featureKey !== undefined && features[item.featureKey] === false) return false;
    return true;
  });

  // Teacher top: Dashboard, Students, Community
  const teacherTopItems = [
    { to: "/", label: "Dashboard" },
    ...(isTeacherOrAdmin ? [{ to: "/teacher/students", label: "Students" as const }] : []),
    ...(isTeacherOrAdmin && features.community !== false
      ? [{ to: "/teacher/community", label: "Community" as const }]
      : []),
  ].filter(Boolean) as { to: string; label: string }[];

  // Documents section: filter by role and feature flags
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

  // Bottom section: Calendar, My Profile, Settings, Help (and Admin for admin)
  const bottomItems: { to: string; label: string }[] = [
    { to: "/calendar", label: "Calendar" },
    ...(isTeacherOrAdmin
      ? [
          { to: "/teacher/profile", label: "My profile" },
          { to: "/teacher/settings", label: "Settings" },
        ]
      : []),
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
      className={`fixed left-0 top-0 z-50 flex h-screen w-60 flex-col bg-sidebar transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <Link
        to="/"
        className="flex items-center gap-3 px-5 py-5 text-lg font-semibold text-white no-underline transition-colors hover:text-white"
      >
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="h-8 w-auto object-contain" />
        ) : null}
        {branding.tenantName ?? "Learning Scores"}
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {/* Top: Dashboard, Students, Community (teacher) or Dashboard, Courses (student) */}
        {teacherTopItems.map((item) => (
          <SidebarNavLink key={`${item.to}-${item.label}`} to={item.to} current={isCurrent(item.to)}>
            {item.label}
          </SidebarNavLink>
        ))}
        {!isTeacherOrAdmin && (
          <SidebarNavLink to="/student" current={isCurrent("/student")}>
            Courses
          </SidebarNavLink>
        )}

        {/* Teacher: Curriculum section */}
        {isTeacherOrAdmin && showCourseSection ? (
          <>
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Curriculum
            </div>
            {curriculumTabs.map((tab) => (
              <SidebarNavLink
                key={tab.id}
                to={`${courseSectionBasePath}?tab=${tab.id}`}
                current={classBasePath ? currentTab === tab.id : false}
              >
                {tab.label}
              </SidebarNavLink>
            ))}
          </>
        ) : null}

        {/* Teacher: Documents section */}
        {isTeacherOrAdmin && visibleDocumentsItems.length > 0 ? (
          <>
            <div className="mt-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Documents
            </div>
            {visibleDocumentsItems.map((item) => (
              <SidebarNavLink
                key={item.label}
                to={item.to}
                current={isCurrent(item.to, item.tab)}
              >
                {item.label}
              </SidebarNavLink>
            ))}
          </>
        ) : null}

        {/* Student: Library, To-do, Certifications */}
        {!isTeacherOrAdmin &&
          visibleItems
            .filter(
              (item) =>
                item.label === "Library" || item.label === "To-do" || item.label === "Certifications"
            )
            .map((item) => (
              <SidebarNavLink key={`${item.to}-${item.label}`} to={item.to} current={isCurrent(item.to)}>
                {item.label}
              </SidebarNavLink>
            ))}

        <div className="my-2 border-t border-white/10" />

        {/* Bottom: Calendar, My Profile, Settings, Help */}
        {bottomItems.map((item) => (
          <SidebarNavLink key={`${item.to}-${item.label}`} to={item.to} current={isCurrent(item.to)}>
            {item.label}
          </SidebarNavLink>
        ))}
      </nav>
      {permissionError && (
        <div className="mx-3 mb-2 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-100">
          {permissionError}
        </div>
      )}
      <div className="border-t border-white/10 px-4 py-4">
        {user ? (
          <div className="flex flex-col gap-2">
            <span className="truncate text-sm text-white/70">
              {profile?.displayName || profile?.email || "Signed in"}
            </span>
            <button
              onClick={signOut}
              className="w-full rounded-lg bg-white/10 px-4 py-2 text-left text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/signin"
            className="block rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white no-underline transition-colors hover:bg-primary-dark"
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}

function SidebarNavLink({
  to,
  current,
  children,
}: {
  to: string;
  current: boolean;
  children: React.ReactNode;
}) {
  const className = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    current
      ? "bg-sidebar-active text-white"
      : "text-white/70 hover:bg-sidebar-hover hover:text-white"
  } ${to === "#" ? "cursor-default" : ""}`;

  const content = (
    <>
      {current && (
        <span className="absolute left-0 h-6 w-0.5 rounded-r bg-primary" />
      )}
      {children}
    </>
  );

  if (to === "#") {
    return <span className={`relative flex ${className}`}>{content}</span>;
  }

  return (
    <Link to={to} className={`relative flex ${className} no-underline`}>
      {content}
    </Link>
  );
}
