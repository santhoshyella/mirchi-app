import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sun, Moon, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/cn";
import { getSessionUser, setSessionUser } from "@/lib/permissions";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  crumbs?: Crumb[];
  /** Mobile back link. If provided, shows a back chevron on mobile in place of the brand */
  mobileBack?: { to: string; label: string };
  /** Right-aligned content (action button, etc.) */
  right?: ReactNode;
  /** A small role indicator pill */
  rolePill?: { label: string; tone?: "purple" | "accent" | "info" | "success" };
}

// ── Profile dropdown ──────────────────────────────────────────────────────────

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">(
    () => (localStorage.getItem("vv_theme") as "light" | "dark") ?? "light"
  );
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const session = getSessionUser();
  const name = session?.name ?? "User";

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setThemeState(next);
    localStorage.setItem("vv_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function handleLogout() {
    setSessionUser(null);
    navigate("/login", { replace: true });
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={name}
        className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white transition-opacity hover:opacity-90",
          open ? "ring-2 ring-[var(--vv-acc)] ring-offset-1" : ""
        )}
        style={{ background: "var(--vv-acc)" }}
      >
        {avatarInitials(name)}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-52 overflow-hidden rounded-vv-md border border-[var(--vv-bd2)] bg-[var(--vv-bg0)] shadow-lg">
          {/* User info */}
          <div className="border-b border-[var(--vv-bd)] px-3.5 py-3">
            <div className="truncate text-[13px] font-bold text-[var(--vv-t0)]">
              {name}
            </div>
            <div className="text-[11px] text-[var(--vv-t3)]">
              {session?.isAdmin ? "Admin" : "User"}
            </div>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[var(--vv-t1)] transition-colors hover:bg-[var(--vv-bg1)]"
          >
            {theme === "light" ? (
              <Moon size={14} className="text-[var(--vv-t2)]" />
            ) : (
              <Sun size={14} className="text-[var(--vv-t2)]" />
            )}
            <span>{theme === "light" ? "Dark theme" : "Light theme"}</span>
          </button>

          {/* Sign out */}
          <div className="border-t border-[var(--vv-bd)]">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[var(--vv-dan)] transition-colors hover:bg-[var(--vv-dan-bg)]"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export function TopBar({ crumbs, mobileBack, right, rolePill }: Props) {
  return (
    <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)] px-4 py-2.5 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile back link OR brand on small screens with no back */}
        {mobileBack ? (
          <Link
            to={mobileBack.to}
            className="flex items-center gap-1 text-[13px] font-bold text-[var(--vv-t0)] md:hidden"
          >
            <ChevronLeft size={18} />
            <span className="truncate">{mobileBack.label}</span>
          </Link>
        ) : (
          <Logo
            className="md:hidden"
            size="md"
            primaryClass="text-[var(--vv-t0)]"
          />
        )}

        {/* Desktop crumbs */}
        {crumbs && crumbs.length > 0 && (
          <nav className="hidden min-w-0 items-center gap-1 text-[11px] text-[var(--vv-t2)] md:flex">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={i} className="flex min-w-0 items-center gap-1">
                  {c.to && !isLast ? (
                    <Link
                      to={c.to}
                      className="truncate text-[var(--vv-acc)] hover:underline"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <strong
                      className={cn(
                        "truncate",
                        isLast
                          ? "font-bold text-[var(--vv-t0)]"
                          : "font-semibold text-[var(--vv-t2)]"
                      )}
                    >
                      {c.label}
                    </strong>
                  )}
                  {!isLast && (
                    <ChevronRight size={11} className="text-[var(--vv-t3)]" />
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {rolePill && (
          <Pill
            tone={rolePill.tone ?? "purple"}
            className="hidden sm:inline-flex"
          >
            {rolePill.label}
          </Pill>
        )}
        {right}
        <ProfileMenu />
      </div>
    </header>
  );
}
