import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SidebarNav } from "./dashboard/SidebarNav";

export default function Layout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSignInPage = location.pathname === "/signin";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isSignInPage) {
    return (
      <div className="min-h-screen bg-surface-light">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-light">
      <SidebarNav open={sidebarOpen} />
      <div className="pl-0 lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200/80 bg-white/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
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
            <span className="text-sm text-gray-600">
              {user ? `Welcome, ${profile?.displayName || profile?.email || "there"}` : "Learning Scores"}
            </span>
            <div className="hidden items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 sm:flex">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search</span>
            </div>
          </div>
        </header>
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
  );
}
