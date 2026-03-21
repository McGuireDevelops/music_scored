import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { TenantProvider, useTenant } from "../contexts/TenantContext";
import { TenantTheme } from "./TenantTheme";
import { SidebarNav } from "./dashboard/SidebarNav";
import { TeacherSearch } from "./TeacherSearch";
import LoginLayout from "./LoginLayout";

function UserProfileDropdown() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user || !profile) return null;

  const displayName = profile.displayName || profile.email || "User";
  const initials = (profile.displayName ?? profile.email ?? "U")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isTeacherOrAdmin = profile.role === "teacher" || profile.role === "admin";
  const profileLink = isTeacherOrAdmin ? "/teacher/profile" : "/student";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-100"
        aria-label="User menu"
      >
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white ring-2 ring-gray-200">
            {initials}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-gray-700 sm:block">
          {displayName}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
            {profile.email && profile.displayName && (
              <p className="truncate text-xs text-gray-500">{profile.email}</p>
            )}
          </div>
          <div className="py-1">
            <Link
              to={profileLink}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 no-underline transition-colors hover:bg-gray-50"
            >
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Edit profile
            </Link>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppShellHeader({
  sidebarOpen,
  setSidebarOpen,
  collapsed,
  setCollapsed,
  children,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { branding } = useTenant();
  const brandLabel = branding.tenantName ?? "Learning Scores";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200/80 bg-white/80 px-6 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            )}
          </svg>
        </button>
        <span className="text-sm text-gray-600">{brandLabel}</span>
      </div>
      <div className="min-w-0 max-sm:hidden sm:flex-1">{children}</div>
      {user && (
        <div className="ml-auto shrink-0">
          <UserProfileDropdown />
        </div>
      )}
    </header>
  );
}

export default function Layout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isSignInPage = location.pathname === "/signin";
  const isLoggedOut = !user;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <TenantProvider>
      {isSignInPage || (isLoggedOut && location.pathname === "/") ? (
        <TenantTheme>
          <LoginLayout>
            <Outlet />
          </LoginLayout>
        </TenantTheme>
      ) : (
        <TenantTheme>
          <div className="min-h-screen bg-surface-light">
      <SidebarNav open={sidebarOpen} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <div className={`pl-0 transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        <AppShellHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} collapsed={collapsed} setCollapsed={setCollapsed}>
          {(profile?.role === "teacher" || profile?.role === "admin") && user ? (
            <TeacherSearch teacherId={user.uid} />
          ) : (
            <div className="flex w-fit items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search</span>
            </div>
          )}
        </AppShellHeader>
        <main className="min-h-[calc(100vh-3.5rem)] p-6">
          <Outlet />
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar overlay"
        />
      )}
          </div>
        </TenantTheme>
      )}
    </TenantProvider>
  );
}
