import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Tag,
  Palette,
} from "lucide-react";
import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FieldShell, TextInput } from "@/components/Field";
import { useSetupStore, type SetupVariety } from "./store";
import { cn } from "@/lib/cn";

// ─── Colour swatches ────────────────────────────────────────────────────────

const SWATCHES = [
  "#f97316", "#ef4444", "#eab308", "#22c55e",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#64748b", "#78716c", "#1e293b",
];

function ColourPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "h-6 w-6 rounded-full border-2 transition-transform",
            value === c ? "scale-110 border-[var(--vv-t0)]" : "border-transparent hover:scale-105"
          )}
          style={{ background: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
        title="Custom colour"
      />
    </div>
  );
}

// ─── Mark row ────────────────────────────────────────────────────────────────

function MarkRow({ varietyId, mark }: { varietyId: string; mark: { id: string; name: string; label: string } }) {
  const { updateMark, deleteMark } = useSetupStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mark.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateMark(varietyId, mark.id, { name: name.trim(), label: name.trim() });
      setEditing(false);
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm(`Delete mark "${mark.name}"?`)) return;
    await deleteMark(varietyId, mark.id);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--vv-acc)] bg-[var(--vv-acc-bg)] px-3 py-2">
        <input
          autoFocus
          className="flex-1 rounded border border-[var(--vv-bd2)] bg-white px-2 py-1 text-[12px] font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mark name (e.g. AA)"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button type="button" onClick={save} disabled={saving}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--vv-suc)] text-white">
          <Check size={12} />
        </button>
        <button type="button" onClick={() => { setEditing(false); setName(mark.name); }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--vv-bd2)] text-[var(--vv-t1)]">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--vv-bd)] bg-[var(--vv-bg0)] px-3 py-2 hover:bg-[var(--vv-bg1)]">
      <span className="flex-1 text-[12px] font-bold text-[var(--vv-t0)]">{mark.name}</span>
      <button type="button" onClick={() => setEditing(true)} className="text-[var(--vv-t3)] hover:text-[var(--vv-acc)]">
        <Pencil size={12} />
      </button>
      <button type="button" onClick={remove} className="text-[var(--vv-t3)] hover:text-[var(--vv-dan)]">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Add mark inline ─────────────────────────────────────────────────────────

function AddMarkRow({ varietyId, existingNames }: { varietyId: string; existingNames: string[] }) {
  const { createMark } = useSetupStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError("Mark name already exists");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createMark(varietyId, { name: trimmed, label: trimmed });
      setName(""); setOpen(false);
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--vv-bd2)] px-3 py-2 text-[12px] text-[var(--vv-t3)] transition-colors hover:border-[var(--vv-acc)] hover:text-[var(--vv-acc)]">
        <Plus size={12} /> Add mark
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--vv-acc)] bg-[var(--vv-acc-bg)] px-3 py-2">
        <input autoFocus
          className="flex-1 rounded border border-[var(--vv-bd2)] bg-white px-2 py-1 text-[12px] font-semibold"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="Mark name (e.g. AA)"
          onKeyDown={(e) => e.key === "Enter" && save()} />
        <button type="button" onClick={save} disabled={saving || !name.trim()}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--vv-acc)] text-white disabled:opacity-40">
          <Check size={12} />
        </button>
        <button type="button" onClick={() => { setOpen(false); setName(""); setError(""); }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--vv-bd2)] text-[var(--vv-t1)]">
          <X size={12} />
        </button>
      </div>
      {error && <p className="text-[11px] text-[var(--vv-dan)]">{error}</p>}
    </div>
  );
}

// ─── Variety card — marks always visible ─────────────────────────────────────

function VarietyCard({ variety }: { variety: SetupVariety }) {
  const { updateVariety, deleteVariety } = useSetupStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(variety.name);
  const [subtitle, setSubtitle] = useState(variety.subtitle ?? "");
  const [color, setColor] = useState(variety.color);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateVariety(variety.id, { name: name.trim(), subtitle: subtitle.trim(), color });
      setEditing(false);
    } finally { setSaving(false); }
  };

  const cancel = () => {
    setEditing(false);
    setName(variety.name);
    setSubtitle(variety.subtitle ?? "");
    setColor(variety.color);
  };

  const remove = async () => {
    if (!confirm(`Delete variety "${variety.name}" and all its marks?`)) return;
    await deleteVariety(variety.id);
  };

  return (
    <Card padding="md">
      {/* ── Variety header ── */}
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 flex-shrink-0 rounded-full border border-white/20 shadow-sm"
          style={{ background: variety.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[var(--vv-t0)] truncate">{variety.name}</div>
          {variety.subtitle && (
            <div className="text-[11px] text-[var(--vv-t3)] truncate">{variety.subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setEditing(!editing)}
            className="rounded p-1 text-[var(--vv-t3)] hover:text-[var(--vv-acc)]">
            <Pencil size={13} />
          </button>
          <button type="button" onClick={remove}
            className="rounded p-1 text-[var(--vv-t3)] hover:text-[var(--vv-dan)]">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Edit form (inline, collapsible) ── */}
      {editing && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[var(--vv-bd2)] bg-[var(--vv-bg1)] p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldShell label="Name" required>
              <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Teja" />
            </FieldShell>
            <FieldShell label="Subtitle" hint="Shown in the picker card">
              <TextInput value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Most common" />
            </FieldShell>
          </div>
          <FieldShell label="Colour">
            <ColourPicker value={color} onChange={setColor} />
          </FieldShell>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save} disabled={saving || !name.trim()}>
              <Check size={12} /> Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Marks — always visible ── */}
      <div className="mt-3 border-t border-[var(--vv-bd)] pt-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Tag size={11} className="text-[var(--vv-t3)]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Marks
          </span>
          <span className="ml-auto rounded-full bg-[var(--vv-bg1)] px-2 py-0.5 text-[10px] text-[var(--vv-t3)]">
            {variety.marks.length}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {variety.marks.length === 0 && (
            <p className="text-[12px] text-[var(--vv-t3)] italic">No marks yet — add one below.</p>
          )}
          {variety.marks
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) => (
              <MarkRow key={m.id} varietyId={variety.id} mark={m} />
            ))}
          <AddMarkRow varietyId={variety.id} existingNames={variety.marks.map((m) => m.name)} />
        </div>
      </div>
    </Card>
  );
}

// ─── Add variety form ─────────────────────────────────────────────────────────

function AddVarietyForm({ onDone }: { onDone: () => void }) {
  const { createVariety } = useSetupStore();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await createVariety({ name: name.trim(), subtitle: subtitle.trim(), color });
      onDone();
    } catch (e: any) {
      setError(e.message ?? "Failed to create variety");
    } finally { setSaving(false); }
  };

  return (
    <Card padding="md" className="border-2 border-[var(--vv-acc)]">
      <div className="mb-3 text-[12px] font-bold text-[var(--vv-acc)]">New variety</div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldShell label="Name" required>
            <TextInput autoFocus value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Teja" error={!!error} />
            {error && <p className="mt-1 text-[11px] text-[var(--vv-dan)]">{error}</p>}
          </FieldShell>
          <FieldShell label="Subtitle">
            <TextInput value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Most common" />
          </FieldShell>
        </div>
        <FieldShell label="Colour">
          <ColourPicker value={color} onChange={setColor} />
        </FieldShell>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            <Check size={12} /> Create variety
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function VarietiesPage() {
  const { varieties, loading, error, fetchVarieties } = useSetupStore();
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchVarieties(); }, []);

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Setup" },
          { label: "Varieties & Marks" },
        ]}
        mobileBack={{ to: "/", label: "Setup" }}
        rolePill={{ label: "Setup", tone: "info" }}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
        <div className="mx-auto max-w-[720px] flex flex-col gap-4">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[16px] font-bold text-[var(--vv-t0)]">Varieties &amp; Marks</h1>
              <p className="text-[12px] text-[var(--vv-t2)]">
                Manage mirchi varieties and the marks available for each.
              </p>
            </div>
            {!adding && (
              <Button type="button" size="sm" onClick={() => setAdding(true)}>
                <Plus size={13} /> Add variety
              </Button>
            )}
          </div>

          {adding && <AddVarietyForm onDone={() => setAdding(false)} />}

          {loading && <p className="text-[13px] text-[var(--vv-t3)]">Loading…</p>}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

          {!loading && varieties.length === 0 && !adding && (
            <Card padding="md">
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Palette size={32} className="text-[var(--vv-t3)]" />
                <p className="text-[13px] font-semibold text-[var(--vv-t1)]">No varieties yet</p>
                <p className="text-[12px] text-[var(--vv-t3)]">Add your first variety to get started.</p>
                <Button type="button" size="sm" onClick={() => setAdding(true)}>
                  <Plus size={13} /> Add variety
                </Button>
              </div>
            </Card>
          )}

          {varieties
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            .map((v) => (
              <VarietyCard key={v.id} variety={v} />
            ))}
        </div>
      </div>
    </>
  );
}
