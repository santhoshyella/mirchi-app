import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { usersApi, UserApiItem } from "@/lib/api";
import { NAV_GROUPS } from "@/layouts/navItems";
import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";

// ─── helpers ──────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "#FFF0E6", text: "#c2530a" },
  { bg: "#E6F1FB", text: "#1254a0" },
  { bg: "#E8F8F1", text: "#0f7a52" },
  { bg: "#F3EFFE", text: "#6d28d9" },
  { bg: "#FEF3C7", text: "#92400e" },
  { bg: "#FCE7F3", text: "#9d174d" },
];

function avatarColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

const TOTAL_MENUS = NAV_GROUPS.reduce((acc, g) => acc + g.items.length, 0);

function menuSummary(u: UserApiItem): string {
  if (u.menuItems?.includes("*")) return "All menus";
  const count = u.menuItems?.length ?? 0;
  return `${count} of ${TOTAL_MENUS} menu${count !== 1 ? "s" : ""}`;
}

function displayName(u: UserApiItem): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ");
}

// ─── page ─────────────────────────────────────────────────────────────────

export function UserManagementPage() {
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    usersApi.list().then(setUsers).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await usersApi.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteConfirmId(null);
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        crumbs={[{ label: "Setup", to: "/setup/varieties" }, { label: "Users" }]}
        mobileBack={{ to: "/setup/varieties", label: "Users" }}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6">
        <div className="mb-5 flex items-center">
          <span className="text-[13px] text-[var(--vv-t2)]">
            {users.length} user{users.length !== 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          <Button variant="primary" size="md" onClick={() => navigate("/user-management/new")}>
            <Plus size={13} /> Add user
          </Button>
        </div>

        <div className="overflow-x-auto rounded-vv-lg border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[var(--vv-t3)]">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-[var(--vv-t3)]">No users yet.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                  {["Name", "Phone", "Menu access", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const name = displayName(u);
                  const col = avatarColor(name || u.id);
                  return (
                    <tr
                      key={u.id}
                      className="border-b-[0.5px] border-[var(--vv-bd)] last:border-0 transition-colors hover:bg-[var(--vv-bg1)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{ background: col.bg, color: col.text }}
                          >
                            {initials(name)}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--vv-t0)]">{name}</div>
                            {u.isAdmin && (
                              <div className="text-[10px] text-[var(--vv-t3)]">System admin</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--vv-t2)]">{u.phone || "—"}</td>
                      <td className="px-4 py-3 text-[var(--vv-t2)]">{menuSummary(u)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={
                            u.isActive
                              ? { background: "var(--vv-suc-bg)", color: "var(--vv-suc)" }
                              : { background: "var(--vv-dan-bg)", color: "var(--vv-dan)" }
                          }
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!u.isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/user-management/${u.id}/edit`)}
                              className="flex h-7 w-7 items-center justify-center rounded-vv-sm transition-colors hover:bg-[var(--vv-bg2)]"
                              title="Edit user"
                            >
                              <Edit2 size={13} className="text-[var(--vv-t2)]" />
                            </button>

                            {deleteConfirmId === u.id ? (
                              <div className="flex items-center gap-1.5 rounded-vv-sm border border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)] px-2 py-1">
                                <AlertTriangle size={11} className="text-[var(--vv-dan)]" />
                                <span className="text-[11px] font-semibold text-[var(--vv-dan)]">Delete?</span>
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  disabled={deleting}
                                  className="text-[11px] font-bold text-[var(--vv-dan)] hover:underline disabled:opacity-50"
                                >
                                  {deleting ? "…" : "Yes"}
                                </button>
                                <span className="text-[10px] text-[var(--vv-t3)]">·</span>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[11px] font-semibold text-[var(--vv-t2)] hover:underline"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(u.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-vv-sm transition-colors hover:bg-[var(--vv-dan-bg)]"
                                title="Delete user"
                              >
                                <Trash2 size={13} className="text-[var(--vv-t3)] hover:text-[var(--vv-dan)]" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
