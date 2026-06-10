import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  INWARD_NAV,
  GRADING_NAV,
  OUTWARD_NAV,
  SETUP_NAV,
  type NavItem,
} from "./navItems";
import { cn } from "@/lib/cn";
import { getSessionUser, setSessionUser, canAccessMenu } from "@/lib/permissions";

interface SideItemProps {
  item: NavItem;
}

function SideItem({ item }: SideItemProps) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition-colors",
          isActive
            ? "bg-[var(--vv-acc)] font-bold text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )
      }
    >
      <Icon size={14} />
      <span className="flex-1 truncate">{item.label}</span>
    </NavLink>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-3 text-[9px] font-bold uppercase tracking-[1.5px] text-slate-500">
      {children}
    </div>
  );
}

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export function DesktopSidebar() {
  const navigate = useNavigate();
  const session = getSessionUser();
  const name = session?.name ?? "User";

  function handleLogout() {
    setSessionUser(null);
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex h-full w-[208px] flex-shrink-0 flex-col bg-[#0f172a] text-slate-300">
      <div className="px-4 pb-3 pt-4">
        <Logo primaryClass="text-slate-50" size="lg" />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
        {INWARD_NAV.filter((it) => canAccessMenu(it.to)).length > 0 && (
          <>
            <GroupLabel>Inward</GroupLabel>
            {INWARD_NAV.filter((it) => canAccessMenu(it.to)).map((it) => (
              <SideItem key={it.to} item={it} />
            ))}
          </>
        )}

        {GRADING_NAV.filter((it) => canAccessMenu(it.to)).length > 0 && (
          <>
            <GroupLabel>Grading</GroupLabel>
            {GRADING_NAV.filter((it) => canAccessMenu(it.to)).map((it) => (
              <SideItem key={it.to} item={it} />
            ))}
          </>
        )}

        {OUTWARD_NAV.filter((it) => canAccessMenu(it.to)).length > 0 && (
          <>
            <GroupLabel>Outward</GroupLabel>
            {OUTWARD_NAV.filter((it) => canAccessMenu(it.to)).map((it) => (
              <SideItem key={it.to} item={it} />
            ))}
          </>
        )}

        {SETUP_NAV.filter((it) => canAccessMenu(it.to)).length > 0 && (
          <>
            <GroupLabel>Setup</GroupLabel>
            {SETUP_NAV.filter((it) => canAccessMenu(it.to)).map((it) => (
              <SideItem key={it.to} item={it} />
            ))}
          </>
        )}
      </div>

      {/* User footer */}
      <div className="flex items-center gap-2.5 border-t border-slate-800 px-3 py-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--vv-acc)] text-[10px] font-bold text-white">
          {avatarInitials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold text-slate-50">{name}</div>
          <div className="text-[10px] text-slate-400">
            {session?.isAdmin ? "Admin" : "User"}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-700"
        >
          <LogOut size={12} className="text-slate-500 hover:text-slate-300" />
        </button>
      </div>
    </aside>
  );
}
