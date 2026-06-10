import { NavLink } from "react-router-dom";
import { MOBILE_TABS } from "./navItems";
import { cn } from "@/lib/cn";
import { canAccessMenu } from "@/lib/permissions";

export function MobileTabBar() {
  const visibleTabs = MOBILE_TABS.filter((item) => canAccessMenu(item.to));

  return (
    <nav className="flex h-[56px] flex-shrink-0 border-t border-[var(--vv-bd)] bg-white">
      {visibleTabs.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                isActive
                  ? "text-[var(--vv-acc)]"
                  : "text-[var(--vv-t2)] hover:text-[var(--vv-t1)]"
              )
            }
          >
            <Icon size={18} />
            <span>{item.mobileLabel ?? item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
