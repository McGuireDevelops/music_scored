import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const navItems: { to: string; label: string; roles?: string[] }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/student", label: "Courses", roles: ["student", "admin"] },
  { to: "/teacher", label: "Teaching", roles: ["teacher", "admin"] },
  { to: "/admin", label: "Admin", roles: ["admin"] },
  { to: "/student/portfolio", label: "Library", roles: ["student", "admin"] },
  { to: "#", label: "Calendar" },
  { to: "#", label: "Help" },
];

interface SidebarNavProps {
  open?: boolean;
}

export function SidebarNav({ open = false }: SidebarNavProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user || !profile) return false;
    return item.roles.includes(profile.role);
  });

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-60 flex-col bg-sidebar transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <Link
        to="/"
        className="px-5 py-5 text-lg font-semibold text-white no-underline transition-colors hover:text-white"
      >
        Learning Scores
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {visibleItems.map((item) => (
          <SidebarNavLink
            key={item.label}
            to={item.to}
            current={
              item.to !== "#"
                ? location.pathname === item.to ||
                  (item.to !== "/" &&
                    location.pathname.startsWith(item.to + "/"))
                : false
            }
          >
            {item.label}
          </SidebarNavLink>
        ))}
      </nav>
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
