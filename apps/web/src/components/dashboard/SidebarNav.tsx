import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { useTeacherSettings } from "../../hooks/useTeacherSettings";
import type { TeacherFeatureFlags } from "@learning-scores/shared";

const navItems: {
  to: string;
  label: string;
  roles?: string[];
  featureKey?: keyof TeacherFeatureFlags;
}[] = [
  { to: "/", label: "Dashboard" },
  { to: "/teacher/students", label: "Students", roles: ["teacher", "admin"] },
  { to: "/#courses", label: "Courses", roles: ["teacher", "admin"] },
  { to: "/student", label: "Courses", roles: ["student", "admin"] },
  { to: "/teacher/community", label: "Community", roles: ["teacher", "admin"], featureKey: "community" },
  { to: "/teacher/lessons", label: "Lessons", roles: ["teacher", "admin"], featureKey: "liveLessons" },
  { to: "/teacher/assignments", label: "Assignments", roles: ["teacher", "admin"], featureKey: "assignments" },
  { to: "/teacher/quizzes", label: "Quizzes", roles: ["teacher", "admin"], featureKey: "quizzes" },
  { to: "/teacher/profile", label: "My profile", roles: ["teacher", "admin"] },
  { to: "/teacher/settings", label: "Settings", roles: ["teacher", "admin"] },
  { to: "/admin", label: "Admin", roles: ["admin"] },
  { to: "/student/portfolio", label: "Library", roles: ["student", "teacher", "admin"] },
  { to: "/student/todo", label: "To-do", roles: ["student", "admin"] },
  { to: "/student/certifications", label: "Certifications", roles: ["student", "teacher", "admin"] },
  { to: "#", label: "Calendar" },
  { to: "#", label: "Help" },
];

const classNavTabs: { id: string; label: string }[] = [
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
  const { features, permissionError } = useTeacherSettings(profile?.role === "teacher" || profile?.role === "admin" ? user?.uid : undefined);

  const classMatch = location.pathname.match(/^\/(teacher|student)\/class\/([^/]+)/);
  const classBasePath = classMatch ? `/${classMatch[1]}/class/${classMatch[2]}` : null;
  const currentTab = classBasePath
    ? new URLSearchParams(location.search).get("tab") || "curriculum"
    : null;

  const duplicateLabelsWhenInClass = ["Lessons", "Assignments", "Quizzes"];
  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user || !profile) return false;
    if (!item.roles.includes(profile.role)) return false;
    if (item.featureKey !== undefined && features[item.featureKey] === false) return false;
    if (classBasePath && duplicateLabelsWhenInClass.includes(item.label)) return false;
    return true;
  });

  const firstItems = visibleItems.filter(
    (item) => item.label === "Dashboard" || item.label === "Students" || (item.label === "Courses" && item.to === "/#courses")
  );
  const restItems = visibleItems.filter(
    (item) => item.label !== "Dashboard" && item.label !== "Students" && !(item.label === "Courses" && item.to === "/#courses")
  );

  const isCurrent = (to: string) => {
    if (to === "#") return false;
    if (to === "/#courses") return location.pathname === "/" && location.hash === "#courses";
    if (to === "/") return location.pathname === "/" && location.hash !== "#courses";
    return location.pathname === to || location.pathname.startsWith(to.replace(/#.*/, "") + "/");
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
        {firstItems.map((item) => (
          <SidebarNavLink key={`${item.to}-${item.label}`} to={item.to} current={isCurrent(item.to)}>
            {item.label}
          </SidebarNavLink>
        ))}
        {classBasePath ? (
          <>
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Course
            </div>
            {classNavTabs.map((tab) => (
              <SidebarNavLink
                key={tab.id}
                to={`${classBasePath}?tab=${tab.id}`}
                current={currentTab === tab.id}
              >
                {tab.label}
              </SidebarNavLink>
            ))}
            <div className="my-2 border-t border-white/10" />
          </>
        ) : null}
        {restItems.map((item) => (
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
