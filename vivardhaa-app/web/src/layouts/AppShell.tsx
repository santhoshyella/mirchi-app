import { Navigate, Outlet, useLocation } from "react-router-dom";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileTabBar } from "./MobileTabBar";
import { getSessionUser } from "@/lib/permissions";

/**
 * Responsive shell:
 * - md+ (≥768px): persistent dark sidebar on left, content fills the rest.
 * - <md: full-width content + bottom tab bar.
 *
 * Redirects to /login if no session is active.
 * Redirects non-admin users away from "/" to their first accessible menu.
 */
export function AppShell() {
  const session = getSessionUser();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace />;

  // Non-admin users have no Home page — redirect them to their first menu.
  if (!session.isAdmin && !session.menuItems.includes("*") && location.pathname === "/") {
    const first = session.menuItems[0];
    if (first) return <Navigate to={first} replace />;
  }

  return (
    <div className="flex h-full bg-[var(--vv-bg1)]">
      <div className="hidden md:flex">
        <DesktopSidebar />
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
        <div className="md:hidden">
          <MobileTabBar />
        </div>
      </div>
    </div>
  );
}
