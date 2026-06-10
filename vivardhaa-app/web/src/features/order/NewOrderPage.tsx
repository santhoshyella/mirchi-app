import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Package, Plus, Save, Trash2 } from "lucide-react";

import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { SectionCard } from "@/components/SectionCard";
import { FieldShell, SelectInput, TextInput } from "@/components/Field";
import { VarietyDot } from "@/components/VarietyDot";
import { fmtIN, fmtINR, fmtKG, todayISO } from "@/lib/format";
import {
  ORDER_SOURCE_ICON,
  ORDER_SOURCE_LABEL,
  type Mark,
  type OrderSourceKind,
  type Variety,
} from "@/types/domain";

import { usePurchaseStore } from "@/features/purchase/store";
import { useDestemmingStore } from "@/features/destemming/store";
import { useRaasiStore } from "@/features/raasi/store";
import { useSetupStore } from "@/features/setup/store";
import { useOrderStore } from "./store";
import { availableInventory, type InventoryLot } from "./selectors";

interface AllocationDraft {
  /** Stable key so React inputs don't lose focus. */
  key: string;
  /** Identifies the lot — `${sourceKind}::${sourceId}`. */
  lotKey: string;
  kg: string;
}

interface DraftState {
  customer: string;
  destinationCity: string;
  date: string;
  variety: string;
  mark: string;
  targetKg: string;
  pricePerKg: string;
  deliveryDeadline: string;
  notes: string;
  allocations: AllocationDraft[];
  /**
   * Which source kinds the picker should show. Default = all on. The
   * operator can untoggle, e.g. to draw only from Destemming + Raasi
   * (processed inventory) and skip raw Purchase lots.
   */
  sourceKindFilter: Record<OrderSourceKind, boolean>;
}

function defaultDeadlineISO(): string {
  const t = new Date();
  t.setDate(t.getDate() + 7);
  return t.toISOString().slice(0, 10);
}

const empty: DraftState = {
  customer: "",
  destinationCity: "",
  date: todayISO(),
  variety: "",
  mark: "",
  targetKg: "",
  pricePerKg: "",
  deliveryDeadline: defaultDeadlineISO(),
  notes: "",
  allocations: [],
  sourceKindFilter: { raasi: true, destemming: true, purchase: true },
};

const SOURCE_ORDER: OrderSourceKind[] = ["raasi", "destemming", "purchase"];

let allocKeyCounter = 0;
const nextAllocKey = () => `alloc-${++allocKeyCounter}`;

interface CheckItem {
  key: string;
  label: string;
  ok: boolean;
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const purchases = usePurchaseStore((s) => s.items);
  const destemmingJobs = useDestemmingStore((s) => s.jobs);
  const raasiBatches = useRaasiStore((s) => s.batches);
  const orders = useOrderStore((s) => s.orders);
  const addOrder = useOrderStore((s) => s.addOrder);

  const { varieties, fetchVarieties } = useSetupStore();
  useEffect(() => { fetchVarieties(); }, []);

  const [draft, setDraft] = useState<DraftState>(empty);
  const [touched, setTouched] = useState(false);

  // Available inventory across all upstream stores. We filter further by
  // variety when displaying so the operator only sees relevant lots.
  const inventory = useMemo(
    () => availableInventory(purchases, destemmingJobs, raasiBatches, orders),
    [purchases, destemmingJobs, raasiBatches, orders]
  );

  // Variety + source-kind filtered inventory. If no variety is picked yet,
  // show all matching source kinds so the operator can browse stock before
  // committing to a variety.
  const visibleInventory = useMemo(() => {
    return inventory.filter((l) => {
      if (!draft.sourceKindFilter[l.sourceKind]) return false;
      if (draft.variety && l.variety !== draft.variety) return false;
      return true;
    });
  }, [inventory, draft.variety, draft.sourceKindFilter]);

  /**
   * Per-source-kind inventory summary — always reflects the FULL inventory
   * (not filtered by sourceKindFilter or variety), since the operator wants
   * to know what's actually on hand before deciding what to pick.
   */
  const inventorySummary = useMemo(() => {
    const init = (): { lots: number; kg: number } => ({ lots: 0, kg: 0 });
    const by: Record<OrderSourceKind, { lots: number; kg: number }> = {
      raasi: init(),
      destemming: init(),
      purchase: init(),
    };
    let totalKg = 0;
    for (const l of inventory) {
      by[l.sourceKind].lots += 1;
      by[l.sourceKind].kg += l.remainingKg;
      totalKg += l.remainingKg;
    }
    return {
      by,
      totalLots: inventory.length,
      totalKg,
    };
  }, [inventory]);

  // Map lotKey → InventoryLot for quick lookups in the allocation editor.
  const lotByKey = useMemo(() => {
    const m = new Map<string, InventoryLot>();
    for (const l of inventory) m.set(`${l.sourceKind}::${l.sourceId}`, l);
    return m;
  }, [inventory]);

  // Numbers used by validation + previews.
  const targetKgNum = parseFloat(draft.targetKg) || 0;
  const priceNum = parseFloat(draft.pricePerKg) || 0;
  const totalAllocatedKg = draft.allocations.reduce(
    (s, a) => s + (parseFloat(a.kg) || 0),
    0
  );
  const revenue = targetKgNum * priceNum;

  // Each allocation must reference a valid lot and not exceed its remaining.
  const allocationErrors = useMemo(() => {
    const errs: string[] = [];
    const used = new Map<string, number>();
    for (const a of draft.allocations) {
      const lot = lotByKey.get(a.lotKey);
      const kg = parseFloat(a.kg) || 0;
      if (!a.lotKey || !lot) {
        errs.push("Pick a lot for each allocation row.");
        continue;
      }
      if (kg <= 0) {
        errs.push(`Allocation from ${lot.sourceId} must be > 0 KG.`);
        continue;
      }
      const prior = used.get(a.lotKey) ?? 0;
      const draftTotal = prior + kg;
      if (draftTotal > lot.remainingKg) {
        errs.push(
          `Can't draw ${draftTotal} KG from ${lot.sourceId} (only ${lot.remainingKg} available).`
        );
      }
      used.set(a.lotKey, draftTotal);
    }
    return Array.from(new Set(errs));
  }, [draft.allocations, lotByKey]);

  const checks: CheckItem[] = [
    {
      key: "customer",
      label: "Customer",
      ok: draft.customer.trim().length >= 2,
    },
    { key: "date", label: "Order date", ok: !!draft.date },
    { key: "variety", label: "Variety", ok: !!draft.variety },
    { key: "mark", label: "Mark", ok: !!draft.mark },
    { key: "targetKg", label: "Target KG > 0", ok: targetKgNum > 0 },
    { key: "pricePerKg", label: "Price/KG > 0", ok: priceNum > 0 },
    {
      key: "deadline",
      label: "Delivery deadline (today or later)",
      ok:
        !draft.deliveryDeadline ||
        new Date(draft.deliveryDeadline) >= new Date(todayISO()),
    },
    {
      key: "allocations",
      label:
        draft.allocations.length === 0
          ? "Allocations optional · order starts at stage 1"
          : allocationErrors.length === 0
            ? `${draft.allocations.length} allocation${
                draft.allocations.length === 1 ? "" : "s"
              } valid`
            : "Allocations have issues",
      ok: draft.allocations.length === 0 || allocationErrors.length === 0,
    },
  ];
  const allValid = checks.every((c) => c.ok);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addAllocation = () => {
    // Pre-seed with the first matching variety lot if available.
    const firstLot = visibleInventory[0];
    setDraft((d) => ({
      ...d,
      allocations: [
        ...d.allocations,
        {
          key: nextAllocKey(),
          lotKey: firstLot
            ? `${firstLot.sourceKind}::${firstLot.sourceId}`
            : "",
          kg: firstLot
            ? String(
                Math.min(
                  firstLot.remainingKg,
                  Math.max(0, targetKgNum - totalAllocatedKg)
                )
              )
            : "",
        },
      ],
    }));
  };

  const updateAllocation = (key: string, patch: Partial<AllocationDraft>) =>
    setDraft((d) => ({
      ...d,
      allocations: d.allocations.map((a) =>
        a.key === key ? { ...a, ...patch } : a
      ),
    }));

  const removeAllocation = (key: string) =>
    setDraft((d) => ({
      ...d,
      allocations: d.allocations.filter((a) => a.key !== key),
    }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!allValid) return;
    await addOrder({
      customer: draft.customer.trim(),
      destinationCity: draft.destinationCity.trim() || undefined,
      date: draft.date,
      variety: draft.variety as Variety,
      mark: draft.mark as Mark,
      targetKg: targetKgNum,
      pricePerKg: priceNum,
      deliveryDeadline: draft.deliveryDeadline || undefined,
      initialNote: draft.notes.trim() || undefined,
      initialAllocations: draft.allocations
        .filter((a) => a.lotKey && parseFloat(a.kg) > 0)
        .map((a) => {
          const lot = lotByKey.get(a.lotKey)!;
          return {
            sourceKind: lot.sourceKind,
            sourceId: lot.sourceId,
            shop: lot.shop,
            variety: lot.variety,
            type: lot.type,
            mark: lot.mark,
            allocatedKg: parseFloat(a.kg),
          };
        }),
    });
    navigate("/outward");
  };

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Outward" },
          { label: "Orders", to: "/outward" },
          { label: "New order" },
        ]}
        mobileBack={{ to: "/outward", label: "Orders" }}
        rolePill={{ label: "Sales", tone: "info" }}
      />

      <form
        onSubmit={onSubmit}
        className="flex-1 overflow-y-auto px-4 py-4 pb-32 md:px-6 md:py-5 md:pb-6"
      >
        <div className="grid max-w-[1100px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3.5">
            <SectionCard num={1} title="Customer & delivery" required>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldShell label="Customer / buyer" required>
                  <TextInput
                    placeholder="e.g. Annapurna Masala"
                    value={draft.customer}
                    onChange={(e) => set("customer", e.target.value)}
                    error={
                      touched && !checks.find((c) => c.key === "customer")!.ok
                    }
                  />
                </FieldShell>
                <FieldShell label="Destination city">
                  <TextInput
                    placeholder="e.g. Hyderabad"
                    value={draft.destinationCity}
                    onChange={(e) => set("destinationCity", e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Order date" required>
                  <TextInput
                    type="date"
                    value={draft.date}
                    onChange={(e) => set("date", e.target.value)}
                    error={touched && !draft.date}
                  />
                </FieldShell>
                <FieldShell
                  label="Delivery deadline"
                  hint="Optional. Today or later. Rows ≤ 3 days are flagged red."
                >
                  <TextInput
                    type="date"
                    min={todayISO()}
                    value={draft.deliveryDeadline}
                    onChange={(e) => set("deliveryDeadline", e.target.value)}
                    error={
                      touched && !checks.find((c) => c.key === "deadline")!.ok
                    }
                  />
                </FieldShell>
              </div>
            </SectionCard>

            <SectionCard num={2} title="What they want" required>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldShell label="Variety" required>
                  <SelectInput
                    value={draft.variety}
                    onChange={(e) => {
                      set("variety", e.target.value);
                      set("mark", "");
                    }}
                    error={touched && !draft.variety}
                  >
                    <option value="">Choose variety…</option>
                    {varieties
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                      .map((v) => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                  </SelectInput>
                </FieldShell>
                <FieldShell label="Mark" required>
                  {(() => {
                    const selectedVariety = varieties.find((v) => v.name === draft.variety);
                    const marks = selectedVariety?.marks
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
                    return (
                      <SelectInput
                        value={draft.mark}
                        onChange={(e) => set("mark", e.target.value)}
                        error={touched && !draft.mark}
                        disabled={!draft.variety}
                      >
                        <option value="">{draft.variety ? "Choose mark…" : "Pick variety first…"}</option>
                        {marks.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.label || m.name}
                          </option>
                        ))}
                      </SelectInput>
                    );
                  })()}
                </FieldShell>
                <FieldShell label="Target KG" required>
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    suffix="KG"
                    placeholder="0"
                    value={draft.targetKg}
                    onChange={(e) => set("targetKg", e.target.value)}
                    error={touched && targetKgNum <= 0}
                  />
                </FieldShell>
                <FieldShell label="Price / KG" required>
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    prefix="₹"
                    placeholder="0"
                    value={draft.pricePerKg}
                    onChange={(e) => set("pricePerKg", e.target.value)}
                    error={touched && priceNum <= 0}
                  />
                </FieldShell>
              </div>
              <FieldShell
                label="Revenue"
                hint="Auto-computed from target KG × price/KG."
              >
                <TextInput
                  readOnly
                  computed
                  value={revenue > 0 ? fmtINR(revenue) : "—"}
                />
              </FieldShell>
            </SectionCard>

            <SectionCard
              num={3}
              title="Allocate from inventory"
              subtitle="Optional · add now or later"
            >
              {/* Source kind filter — multi-select toggle pills. At least one
                  kind must remain on; the addAllocation button is disabled
                  if all are off (visibleInventory becomes empty). */}
              <FieldShell
                label="Source kinds to draw from"
                hint="Tap to toggle. Defaults to all three; untoggle Purchase to draw only from processed stock."
              >
                <div className="flex flex-wrap gap-2">
                  {SOURCE_ORDER.map((k) => {
                    const active = draft.sourceKindFilter[k];
                    const count = inventorySummary.by[k].lots;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          // Don't let the operator turn off every kind —
                          // there'd be no inventory to show. Min one stays on.
                          const next = {
                            ...draft.sourceKindFilter,
                            [k]: !active,
                          };
                          const anyOn = SOURCE_ORDER.some(
                            (x) => next[x as OrderSourceKind]
                          );
                          if (!anyOn) return;
                          set("sourceKindFilter", next);
                        }}
                        className={
                          "rounded-full border-[0.5px] px-3 py-1 text-[11px] font-bold transition-all " +
                          (active
                            ? "border-[var(--vv-acc)] bg-[var(--vv-acc-bg)] text-[var(--vv-acc)]"
                            : "border-[var(--vv-bd2)] bg-[var(--vv-bg0)] text-[var(--vv-t3)] hover:border-[var(--vv-bd)]")
                        }
                      >
                        <span className="mr-1">{ORDER_SOURCE_ICON[k]}</span>
                        {ORDER_SOURCE_LABEL[k]}
                        <span className="vv-mono ml-1.5 text-[10px] opacity-70">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FieldShell>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--vv-t2)]">
                <span>
                  Allocated{" "}
                  <span className="vv-mono font-bold text-[var(--vv-t0)]">
                    {fmtKG(totalAllocatedKg)}
                  </span>{" "}
                  of{" "}
                  <span className="vv-mono font-bold text-[var(--vv-t0)]">
                    {targetKgNum > 0 ? fmtKG(targetKgNum) : "—"}
                  </span>
                </span>
                {targetKgNum > 0 && totalAllocatedKg > targetKgNum && (
                  <Pill tone="warning" className="ml-auto">
                    {fmtKG(totalAllocatedKg - targetKgNum)} over target
                  </Pill>
                )}
                {targetKgNum > 0 &&
                  totalAllocatedKg < targetKgNum &&
                  draft.allocations.length > 0 && (
                    <Pill tone="neutral" className="ml-auto">
                      {fmtKG(targetKgNum - totalAllocatedKg)} short
                    </Pill>
                  )}
                {targetKgNum > 0 &&
                  totalAllocatedKg === targetKgNum &&
                  draft.allocations.length > 0 && (
                    <Pill tone="success" className="ml-auto">
                      Target met
                    </Pill>
                  )}
              </div>

              {visibleInventory.length === 0 ? (
                <Card padding="md" className="bg-[var(--vv-bg1)]">
                  <div className="text-[11px] leading-snug text-[var(--vv-t2)]">
                    No inventory matches the current filters
                    {draft.variety ? ` for ${draft.variety}` : ""}.{" "}
                    {SOURCE_ORDER.some((k) => !draft.sourceKindFilter[k]) &&
                      "Try enabling more source kinds above. "}
                    {!draft.variety &&
                      "Picking a variety narrows the list further."}
                  </div>
                </Card>
              ) : (
                draft.allocations.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {draft.allocations.map((a) => {
                      const lot = lotByKey.get(a.lotKey);
                      return (
                        <div
                          key={a.key}
                          className="grid grid-cols-[1fr_110px_28px] items-end gap-2"
                        >
                          <FieldShell label="Lot">
                            <SelectInput
                              value={a.lotKey}
                              onChange={(e) =>
                                updateAllocation(a.key, {
                                  lotKey: e.target.value,
                                })
                              }
                            >
                              <option value="">Choose a lot…</option>
                              {visibleInventory.map((l) => {
                                const k = `${l.sourceKind}::${l.sourceId}`;
                                return (
                                  <option key={k} value={k}>
                                    {ORDER_SOURCE_ICON[l.sourceKind]}{" "}
                                    {l.sourceId} · {l.shop} · {l.variety}{" "}
                                    {l.type} · Mark {l.mark} ·{" "}
                                    {fmtKG(l.remainingKg)} available
                                  </option>
                                );
                              })}
                            </SelectInput>
                          </FieldShell>
                          <FieldShell label="KG to draw">
                            <TextInput
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              suffix="KG"
                              value={a.kg}
                              onChange={(e) =>
                                updateAllocation(a.key, { kg: e.target.value })
                              }
                              error={
                                touched &&
                                lot !== undefined &&
                                (parseFloat(a.kg) <= 0 ||
                                  parseFloat(a.kg) > lot.remainingKg)
                              }
                            />
                          </FieldShell>
                          <button
                            type="button"
                            onClick={() => removeAllocation(a.key)}
                            className="inline-flex h-[38px] w-[28px] items-center justify-center rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] text-[var(--vv-t3)] hover:border-[var(--vv-dan-bd)] hover:text-[var(--vv-dan)]"
                            aria-label="Remove allocation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addAllocation}
                disabled={visibleInventory.length === 0}
              >
                <Plus size={13} />
                Add allocation
              </Button>

              {touched && allocationErrors.length > 0 && (
                <div className="rounded-vv-sm border-[0.5px] border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)] px-3 py-2 text-[11px] text-[var(--vv-dan)]">
                  {allocationErrors.map((m, i) => (
                    <div key={i}>{m}</div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard num={4} title="Notes" subtitle="Optional">
              <FieldShell label="First note for the order timeline">
                <textarea
                  className="min-h-[64px] w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium leading-[1.5] text-[var(--vv-t0)] transition-all focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]"
                  placeholder="e.g. Recurring monthly customer · standard terms."
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </FieldShell>
            </SectionCard>

            <div className="flex gap-2 pt-1 lg:hidden">
              <Button
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => navigate("/outward")}
              >
                <ArrowLeft size={14} />
                Cancel
              </Button>
              <Button
                type="submit"
                size="md"
                fullWidth
                disabled={touched && !allValid}
              >
                <Save size={14} />
                Save order
              </Button>
            </div>
          </div>

          {/* Live preview / checklist */}
          <aside className="hidden lg:block">
            <div className="sticky top-4 flex flex-col gap-3">
              <Card padding="md">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                  Live preview
                </div>
                <div className="mb-1 flex items-center gap-1.5">
                  {draft.variety ? (
                    <VarietyDot
                      variety={draft.variety as Variety}
                      color={varieties.find((v) => v.name === draft.variety)?.color}
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[var(--vv-bd2)]" />
                  )}
                  <div className="truncate text-[13px] font-bold text-[var(--vv-t0)]">
                    {draft.customer || "Customer name…"}
                  </div>
                </div>
                <div className="vv-mono mb-3 text-[10px] text-[var(--vv-t2)]">
                  {draft.date} · {draft.variety || "Variety"} · Mark{" "}
                  {draft.mark || "—"}
                  {draft.destinationCity && (
                    <>
                      <span className="mx-1">·</span>
                      {draft.destinationCity}
                    </>
                  )}
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <PreviewStat
                    label="Target"
                    value={targetKgNum > 0 ? fmtKG(targetKgNum) : "—"}
                  />
                  <PreviewStat
                    label="Allocated"
                    value={fmtKG(totalAllocatedKg)}
                  />
                  <PreviewStat
                    label="Revenue"
                    value={revenue > 0 ? fmtINR(revenue) : "—"}
                  />
                </div>

                {draft.allocations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.allocations.map((a) => {
                      const lot = lotByKey.get(a.lotKey);
                      return (
                        <Pill key={a.key} tone="neutral" className="text-[9px]">
                          {lot
                            ? `${ORDER_SOURCE_ICON[lot.sourceKind]} ${lot.sourceId} · ${a.kg || 0} KG`
                            : `(pick lot) · ${a.kg || 0} KG`}
                        </Pill>
                      );
                    })}
                  </div>
                )}
                {draft.allocations.length === 0 && (
                  <Pill tone="neutral">
                    <Package size={11} />
                    Saves at stage 1 · allocate later
                  </Pill>
                )}
              </Card>

              <Card padding="md">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                  Checklist
                </div>
                <ul className="flex flex-col gap-1.5">
                  {checks.map((c) => (
                    <li
                      key={c.key}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span
                        className={
                          c.ok
                            ? "flex h-4 w-4 items-center justify-center rounded-full bg-[var(--vv-suc)] text-white"
                            : "flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-[var(--vv-bd2)]"
                        }
                      >
                        {c.ok && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span
                        className={
                          c.ok
                            ? "font-semibold text-[var(--vv-t1)]"
                            : "text-[var(--vv-t3)]"
                        }
                      >
                        {c.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card padding="md">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                  Inventory left over
                </div>
                <div className="flex flex-col gap-1.5">
                  {SOURCE_ORDER.map((k) => {
                    const row = inventorySummary.by[k];
                    const active = draft.sourceKindFilter[k];
                    return (
                      <div
                        key={k}
                        className={
                          "flex items-center gap-2 rounded-vv-sm px-2 py-1.5 " +
                          (active
                            ? "bg-[var(--vv-bg1)]"
                            : "opacity-50 grayscale")
                        }
                        title={
                          active
                            ? `Showing ${ORDER_SOURCE_LABEL[k]} in picker`
                            : `${ORDER_SOURCE_LABEL[k]} hidden in picker`
                        }
                      >
                        <span className="text-[14px]">
                          {ORDER_SOURCE_ICON[k]}
                        </span>
                        <span className="flex-1 text-[11px] font-bold text-[var(--vv-t1)]">
                          {ORDER_SOURCE_LABEL[k]}
                        </span>
                        <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
                          {fmtIN(row.lots)} lot{row.lots === 1 ? "" : "s"}
                        </span>
                        <span className="vv-mono text-[11px] font-semibold text-[var(--vv-t0)]">
                          {row.kg > 0 ? fmtKG(Math.round(row.kg)) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
                  <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                    Total available
                  </span>
                  <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
                    {fmtIN(inventorySummary.totalLots)} lot
                    {inventorySummary.totalLots === 1 ? "" : "s"}
                  </span>
                  <span className="vv-mono text-[12px] font-extrabold text-[var(--vv-acc)]">
                    {inventorySummary.totalKg > 0
                      ? fmtKG(Math.round(inventorySummary.totalKg))
                      : "—"}
                  </span>
                </div>
                {draft.variety && (
                  <div className="vv-mono mt-2 text-[10px] text-[var(--vv-t3)]">
                    Picker is also filtered to{" "}
                    <span className="font-bold text-[var(--vv-t2)]">
                      {draft.variety}
                    </span>{" "}
                    · {fmtIN(visibleInventory.length)} matching lot
                    {visibleInventory.length === 1 ? "" : "s"}
                  </div>
                )}
              </Card>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => navigate("/outward")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  disabled={touched && !allValid}
                  className="flex-1"
                >
                  <Save size={14} />
                  Save
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
        {label}
      </div>
      <div className="vv-mono text-[12px] font-medium text-[var(--vv-t0)]">
        {value}
      </div>
    </div>
  );
}
