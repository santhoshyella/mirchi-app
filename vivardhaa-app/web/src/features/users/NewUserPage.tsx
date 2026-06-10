import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usersApi, UserApiItem } from "@/lib/api";
import { NAV_GROUPS } from "@/layouts/navItems";
import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { FieldShell, TextInput } from "@/components/Field";
import { cn } from "@/lib/cn";

// ─── toggle ───────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative inline-flex h-[18px] w-8 flex-shrink-0 cursor-pointer rounded-full transition-colors"
      style={{ background: on ? "var(--vv-suc)" : "var(--vv-bg3)" }}
    >
      <span
        className="absolute top-[3px] h-3 w-3 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "17px" : "3px" }}
      />
    </button>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────

export function NewUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit || !id) return;
    usersApi.get(id).then((u: UserApiItem) => {
      setName([u.firstName, u.lastName].filter(Boolean).join(" "));
      setPhone(u.phone ?? "");
      setIsActive(u.isActive);
      setSelectedMenus(u.menuItems ?? []);
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  function toggleMenu(to: string) {
    setSelectedMenus((prev) =>
      prev.includes(to) ? prev.filter((m) => m !== to) : [...prev, to]
    );
  }

  function toggleGroup(tos: string[]) {
    const allOn = tos.every((t) => selectedMenus.includes(t));
    if (allOn) {
      setSelectedMenus((prev) => prev.filter((m) => !tos.includes(m)));
    } else {
      setSelectedMenus((prev) => [...new Set([...prev, ...tos])]);
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    if (!phone.trim()) { setError("Phone number is required."); return; }
    setError(""); setSaving(true);
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(" ");
      const normalizedName = name.trim().toLowerCase();
      const normalizedPhone = phone.trim();

      // Duplicate check on create only
      if (!isEdit) {
        const existing = await usersApi.list();
        const nameTaken = existing.some((u) =>
          [u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase() === normalizedName
        );
        const phoneTaken = existing.some((u) =>
          (u.phone ?? "").trim() === normalizedPhone
        );
        if (nameTaken || phoneTaken) {
          setError("User already exists.");
          setSaving(false);
          return;
        }
      }

      const payload = {
        firstName,
        lastName,
        phone: normalizedPhone,
        isActive,
        menuItems: selectedMenus,
      };
      if (isEdit && id) {
        await usersApi.update(id, payload);
      } else {
        await usersApi.create(payload);
      }
      navigate("/user-management");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        crumbs={[
          { label: "Setup", to: "/setup/varieties" },
          { label: "Users", to: "/user-management" },
          { label: isEdit ? "Edit user" : "New user" },
        ]}
        mobileBack={{ to: "/user-management", label: isEdit ? "Edit user" : "New user" }}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[var(--vv-t3)]">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[560px] flex flex-col gap-5">

            {/* ── User details ── */}
            <div
              className="rounded-vv-lg border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] p-5 flex flex-col gap-4"
            >
              <h3 className="text-[13px] font-bold text-[var(--vv-t0)]">User details</h3>

              <div className="grid grid-cols-[96px_1fr] items-start gap-3">
                <span className="pt-2.5 text-[12px] font-semibold text-[var(--vv-t1)]">
                  Name <span className="text-[var(--vv-dan)]">*</span>
                </span>
                <FieldShell label="">
                  <TextInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Raju Kumar"
                  />
                </FieldShell>
              </div>

              <div className="grid grid-cols-[96px_1fr] items-start gap-3">
                <span className="pt-2.5 text-[12px] font-semibold text-[var(--vv-t1)]">
                  Phone <span className="text-[var(--vv-dan)]">*</span>
                </span>
                <FieldShell label="">
                  <TextInput
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                  />
                </FieldShell>
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-3">
                <span className="text-[12px] font-semibold text-[var(--vv-t1)]">Status</span>
                <div className="flex items-center gap-2.5">
                  <Toggle on={isActive} onChange={setIsActive} />
                  <span className="text-[12px] text-[var(--vv-t2)]">
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Menu access ── */}
            <div
              className="rounded-vv-lg border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] p-5 flex flex-col gap-5"
            >
              <div>
                <h3 className="text-[13px] font-bold text-[var(--vv-t0)]">Menu access</h3>
                <p className="mt-0.5 text-[12px] text-[var(--vv-t2)]">
                  Choose which menu items this user can see.
                </p>
              </div>

              {NAV_GROUPS.map(({ label, items }) => {
                const tos = items.map((i) => i.to);
                const allOn = tos.every((t) => selectedMenus.includes(t));

                return (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleGroup(tos)}
                        className="text-[10px] font-semibold text-[var(--vv-acc)] hover:underline"
                      >
                        {allOn ? "Deselect all" : "Select all"}
                      </button>
                    </div>

                    <div className="overflow-hidden rounded-vv-md border-[0.5px] border-[var(--vv-bd2)]">
                      {items.map((item, idx) => {
                        const Icon = item.icon;
                        const checked = selectedMenus.includes(item.to);
                        return (
                          <label
                            key={item.to}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--vv-bg1)]",
                              idx !== 0 && "border-t-[0.5px] border-[var(--vv-bd)]"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMenu(item.to)}
                              className="h-4 w-4 rounded accent-[var(--vv-acc)]"
                            />
                            <Icon size={14} className="flex-shrink-0 text-[var(--vv-t2)]" />
                            <span className="text-[13px] text-[var(--vv-t1)]">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Error ── */}
            {error && (
              <p className="rounded-vv-sm bg-[var(--vv-dan-bg)] px-3 py-2.5 text-[12px] font-semibold text-[var(--vv-dan)]">
                {error}
              </p>
            )}

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => navigate("/user-management")}>
                Cancel
              </Button>
              <Button variant="primary" size="md" disabled={saving} onClick={handleSave}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {isEdit ? "Save changes" : "Create user"}
              </Button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
