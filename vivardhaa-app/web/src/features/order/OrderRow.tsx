import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  MapPin,
  Package,
  Plus,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { VarietyDot } from "@/components/VarietyDot";
import { FieldShell, SelectInput, TextInput } from "@/components/Field";
import {
  daysUntil,
  fmtDeadline,
  fmtIN,
  fmtINR,
  fmtKG,
  fmtRelTime,
  fmtShortDate,
} from "@/lib/format";
import {
  ORDER_SOURCE_ICON,
  ORDER_SOURCE_LABEL,
  ORDER_STAGE_NAMES,
  ORDER_STAGE_TEAMS,
  type Order,
  type OrderSourceKind,
  type OrderStage,
  VARIETY_COLOR,
} from "@/types/domain";
import { cn } from "@/lib/cn";
import {
  DEFAULT_ORDER_ADVANCE_NOTE,
  DEFAULT_ORDER_SETTLE_NOTE,
  useOrderStore,
} from "./store";
import {
  allocationPct,
  availableInventory,
  remainingTargetKg,
  totalAllocatedKg,
} from "./selectors";
import { usePurchaseStore } from "@/features/purchase/store";
import { useDestemmingStore } from "@/features/destemming/store";
import { useRaasiStore } from "@/features/raasi/store";

interface Props {
  order: Order;
  className?: string;
  /** Highlight ring + scroll target when navigated to with `?focus=o-XXX`. */
  focused?: boolean;
  /** Ref for the list page to scroll the focused row into view. */
  outerRef?: React.RefObject<HTMLDivElement>;
}

/** Map a source kind to its detail-page URL pattern with focus param. */
const SOURCE_BASE: Record<OrderSourceKind, string> = {
  purchase: "/purchase",
  destemming: "/destemming",
  raasi: "/raasi",
};

function nextActionLabel(stage: OrderStage): string | null {
  // Stage 4 uses the settle action, not advanceStage — return null to let
  // the footer render the dedicated settlement button.
  if (stage >= 4) return null;
  const nextTeam = ORDER_STAGE_TEAMS[(stage + 1) as OrderStage];
  switch (stage) {
    case 1:
      return `Allocate · Move to ${nextTeam}`;
    case 2:
      return `Deliver · Move to ${nextTeam}`;
    case 3:
      return `Mark delivered · Move to ${nextTeam}`;
    default:
      return `Move to ${nextTeam}`;
  }
}

export function OrderRow({ order, className, focused, outerRef }: Props) {
  const advanceStage = useOrderStore((s) => s.advanceStage);
  const settleOrder = useOrderStore((s) => s.settleOrder);
  const cancelOrder = useOrderStore((s) => s.cancelOrder);
  const addAllocationToOrder = useOrderStore((s) => s.addAllocation);
  const removeAllocationFromOrder = useOrderStore((s) => s.removeAllocation);

  // Inventory for the allocation editor — only relevant while stage is
  // editable. Always pull from all upstream stores; the picker filters by
  // variety + source-kind toggle below.
  const purchases = usePurchaseStore((s) => s.items);
  const destemmingJobs = useDestemmingStore((s) => s.jobs);
  const raasiBatches = useRaasiStore((s) => s.batches);
  const allOrders = useOrderStore((s) => s.orders);
  const inventory = useMemo(
    () =>
      availableInventory(purchases, destemmingJobs, raasiBatches, allOrders),
    [purchases, destemmingJobs, raasiBatches, allOrders]
  );

  // Inline allocation editor state — ephemeral per row.
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftLotKey, setDraftLotKey] = useState("");
  const [draftKg, setDraftKg] = useState("");
  const [draftFilter, setDraftFilter] = useState<
    Record<OrderSourceKind, boolean>
  >({ raasi: true, destemming: true, purchase: true });

  // Inventory narrowed to the order's variety + active source-kind toggles.
  const visibleInventory = useMemo(
    () =>
      inventory.filter(
        (l) => draftFilter[l.sourceKind] && l.variety === order.variety
      ),
    [inventory, draftFilter, order.variety]
  );

  // Reset editor when it closes so reopening starts fresh.
  const closeEditor = () => {
    setEditorOpen(false);
    setDraftLotKey("");
    setDraftKg("");
  };

  const allocated = totalAllocatedKg(order);
  const remaining = remainingTargetKg(order);
  const allocPct = allocationPct(order);
  const stagePct = (order.currentStage / 4) * 100;
  const revenue = order.targetKg * order.pricePerKg;
  const advanceLabel = nextActionLabel(order.currentStage);
  const isSettled = !!order.settledAt;

  const daysToDeliver = daysUntil(order.deliveryDeadline);
  // "Open" = pre-settlement; reaching stage 4 alone isn't terminal until
  // the operator clicks "Mark settled".
  const isOpen = !order.isCancelled && (order.currentStage < 4 || !isSettled);
  const deadlineHot =
    isOpen &&
    !isSettled &&
    order.currentStage < 4 &&
    daysToDeliver !== null &&
    daysToDeliver <= 3;

  // Two guardrails on the advance button:
  //  - Stage 1 → 2 needs at least one allocation (otherwise allocate has
  //    nothing to do).
  //  - Stage 2 → 3 (Deliver) needs the order to be fully fulfilled — total
  //    allocated KG must reach the target. We don't ship partial orders.
  //  - Stage 3 → 4 is always allowed for an open order.
  const isFulfilled = allocated >= order.targetKg && order.targetKg > 0;
  const advanceBlockedReason = order.isCancelled
    ? "Order is cancelled."
    : order.currentStage === 1 && order.allocations.length === 0
      ? "Add at least one allocation before moving to Allocate."
      : order.currentStage === 2 && !isFulfilled
        ? `Order is short by ${fmtKG(Math.max(0, order.targetKg - allocated))}. Allocate the full target before moving to Deliver.`
        : null;
  const canAdvance =
    !order.isCancelled &&
    order.currentStage < 4 &&
    advanceBlockedReason === null;

  const handleAdvance = () => {
    if (!canAdvance) return;
    const defaultText = DEFAULT_ORDER_ADVANCE_NOTE[order.currentStage] ?? "";
    if (typeof window !== "undefined") {
      const note = window.prompt(
        "Add a note for the next team (you can edit the default):",
        defaultText
      );
      if (note === null) return;
      advanceStage(order.id, note.trim() || defaultText);
    } else {
      advanceStage(order.id);
    }
  };

  const handleSettle = () => {
    if (typeof window === "undefined") return;
    const note = window.prompt(
      `Mark this order as settled?\n\nCustomer: ${order.customer}\nRevenue: ${fmtINR(
        revenue
      )}\n\nAdd a note (optional):`,
      DEFAULT_ORDER_SETTLE_NOTE
    );
    if (note === null) return;
    settleOrder(order.id, note.trim() || DEFAULT_ORDER_SETTLE_NOTE);
  };

  const handleCancel = () => {
    if (typeof window === "undefined") return;
    const reason = window.prompt("Cancel this order? Add a short reason:", "");
    if (reason === null) return;
    cancelOrder(order.id, reason || "Cancelled.");
  };

  // Allocations are editable only while the order is at Stage 1 or 2 and
  // not cancelled. Stages 3 (Deliver) and 4 (Settlement) are read-only.
  const canEditAllocations = !order.isCancelled && order.currentStage <= 2;

  const handleAddAllocation = async () => {
    const lot = inventory.find(
      (l) => `${l.sourceKind}::${l.sourceId}` === draftLotKey
    );
    if (!lot) {
      if (typeof window !== "undefined")
        window.alert("Pick a lot from the dropdown first.");
      return;
    }
    const kg = parseFloat(draftKg);
    if (Number.isNaN(kg) || kg <= 0 || kg > lot.remainingKg) {
      if (typeof window !== "undefined")
        window.alert(
          `KG must be a number between 0 and ${lot.remainingKg} (lot's remaining KG).`
        );
      return;
    }
    await addAllocationToOrder(order.id, {
      sourceKind: lot.sourceKind,
      sourceId: lot.sourceId,
      shop: lot.shop,
      variety: lot.variety,
      type: lot.type,
      mark: lot.mark,
      allocatedKg: kg,
    });
    closeEditor();
  };

  const handleRemoveAllocation = async (allocId: string, label: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Remove allocation from ${label}? This frees the KG back into inventory.`
      );
      if (!ok) return;
    }
    await removeAllocationFromOrder(order.id, allocId);
  };

  const statusIcon = order.isCancelled ? (
    <XCircle size={13} className="text-[var(--vv-dan)]" />
  ) : isSettled ? (
    <Lock size={13} className="text-[var(--vv-suc)]" />
  ) : order.currentStage >= 3 ? (
    <Truck size={13} className="text-[var(--vv-acc)]" />
  ) : (
    <Clock size={13} className="text-[var(--vv-am)]" />
  );

  return (
    <div
      ref={outerRef}
      className={cn(
        "rounded-vv-md border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)]",
        "flex flex-col gap-2.5 px-3.5 py-3",
        "transition-all hover:border-[var(--vv-bd2)] hover:shadow-sm",
        order.isCancelled && "opacity-80",
        deadlineHot &&
          "bg-[var(--vv-dan-bg)]/30 ring-1 ring-[var(--vv-dan-bd)]",
        focused &&
          "ring-2 ring-[var(--vv-acc)] ring-offset-2 ring-offset-[var(--vv-bg1)]",
        className
      )}
      style={{ borderLeft: `3px solid ${VARIETY_COLOR[order.variety]}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <VarietyDot variety={order.variety} />
            <span className="truncate text-[12px] font-bold text-[var(--vv-t0)]">
              {order.customer}
            </span>
          </div>
          <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t2)]">
            {fmtShortDate(order.date)} · {order.variety} ·{" "}
            <span className="font-semibold">Mark {order.mark}</span>
            {order.destinationCity && (
              <>
                {" "}
                <span className="text-[var(--vv-t3)]">·</span>{" "}
                <span title={`Ship to ${order.destinationCity}`}>
                  <MapPin size={9} className="-mt-0.5 inline" />{" "}
                  {order.destinationCity}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {statusIcon}
          <Pill tone="purple" className="text-[9px]">
            Stage {order.currentStage}/4
          </Pill>
        </div>
      </div>

      {/* Numbers — Target · Allocated · Revenue */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Target
          </div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">
            {fmtKG(order.targetKg)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Allocated
          </div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">
            {fmtKG(allocated)}
          </div>
          {remaining > 0 && (
            <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-am)]">
              {fmtKG(remaining)} short
            </div>
          )}
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Revenue · {fmtINR(order.pricePerKg)}/KG
          </div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">
            {fmtINR(revenue)}
          </div>
        </div>
      </div>

      {/* Stage progress + deadline pill */}
      <div className="flex flex-wrap items-center gap-2">
        {order.deliveryDeadline && isOpen && (
          <Pill
            tone={deadlineHot ? "danger" : "neutral"}
            className="text-[9px]"
          >
            <Flag size={10} />
            Deliver {fmtDeadline(order.deliveryDeadline)}
          </Pill>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ProgressBar
            value={stagePct}
            color={order.isCancelled ? "var(--vv-dan)" : "var(--vv-acc)"}
            height={4}
          />
          <span className="vv-mono whitespace-nowrap text-[10px] text-[var(--vv-t2)]">
            {order.currentStage}/4 · {ORDER_STAGE_NAMES[order.currentStage]}
            {order.currentStage === 4 && !isSettled && " · pending"}
          </span>
        </div>
      </div>

      {/* Allocation summary — bar showing allocated vs target */}
      {order.targetKg > 0 && (
        <div className="flex flex-col gap-1">
          <div className="relative h-[6px] overflow-hidden rounded-full bg-[var(--vv-bg2)]">
            <div
              className="absolute inset-y-0 left-0 bg-[var(--vv-acc)]"
              style={{ width: `${allocPct}%` }}
            />
          </div>
          <div className="vv-mono flex items-center justify-between text-[10px] text-[var(--vv-t2)]">
            <span>
              {fmtKG(allocated)} of {fmtKG(order.targetKg)} allocated
            </span>
            <span>
              {allocPct === 100
                ? "Fully allocated"
                : `${(100 - allocPct).toFixed(0)}% to go`}
            </span>
          </div>
        </div>
      )}

      {/* Allocations list — editable while at Stage 1 or 2, locked after.
          Renders even when empty if editable, so the "Add allocation" CTA
          is reachable on a brand-new stage-1 order. */}
      {(order.allocations.length > 0 || canEditAllocations) && (
        <div className="flex flex-col gap-1.5 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          <div className="flex items-center gap-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
              From inventory
            </div>
            {!canEditAllocations && order.allocations.length > 0 && (
              <Pill tone="neutral" className="text-[9px]">
                <Lock size={9} />
                Locked at {ORDER_STAGE_NAMES[order.currentStage]}
              </Pill>
            )}
          </div>
          {order.allocations.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-2 text-[10px]"
            >
              <Pill tone="neutral" className="text-[9px]">
                <span>{ORDER_SOURCE_ICON[a.sourceKind]}</span>
                <Link
                  to={`${SOURCE_BASE[a.sourceKind]}?focus=${a.sourceId}`}
                  title={`Open ${a.sourceKind} ${a.sourceId}`}
                  className="font-semibold text-[var(--vv-acc)] hover:underline"
                >
                  {a.sourceId}
                </Link>
              </Pill>
              <span className="vv-mono text-[var(--vv-t2)]">
                {a.shop} · {a.variety} {a.type} · Mark {a.mark}
              </span>
              <span className="vv-mono ml-auto font-semibold text-[var(--vv-t0)]">
                {fmtKG(a.allocatedKg)}
              </span>
              {canEditAllocations && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveAllocation(
                      a.id,
                      `${a.sourceId} (${fmtKG(a.allocatedKg)})`
                    )
                  }
                  title="Remove this allocation"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] text-[var(--vv-t3)] hover:border-[var(--vv-dan-bd)] hover:text-[var(--vv-dan)]"
                  aria-label="Remove allocation"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}

          {/* Inline "Add allocation" CTA / editor — only when stage 1 or 2 */}
          {canEditAllocations && !editorOpen && (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 self-start rounded-vv-sm border-[0.5px] border-dashed border-[var(--vv-bd2)] px-2.5 py-1 text-[10px] font-bold text-[var(--vv-acc)] hover:border-[var(--vv-acc)] hover:bg-[var(--vv-acc-bg)]"
            >
              <Plus size={11} />
              Add allocation
            </button>
          )}
          {canEditAllocations && editorOpen && (
            <div className="bg-[var(--vv-acc-bg)]/30 mt-1 flex flex-col gap-2 rounded-vv-sm border-[0.5px] border-[var(--vv-acc-bd)] p-2.5">
              <div className="flex items-center gap-1.5">
                <Plus size={11} className="text-[var(--vv-acc)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-acc)]">
                  Add allocation
                </span>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-vv-sm text-[var(--vv-t3)] hover:bg-[var(--vv-bg2)] hover:text-[var(--vv-t0)]"
                  aria-label="Cancel adding allocation"
                >
                  <X size={11} />
                </button>
              </div>

              {/* Source-kind toggles — operator can pick Raasi / Destemming
                  / Purchase. Last active kind can't be turned off. */}
              <div className="flex flex-wrap gap-1.5">
                {(["raasi", "destemming", "purchase"] as const).map((k) => {
                  const active = draftFilter[k];
                  const count = inventory.filter(
                    (l) => l.sourceKind === k && l.variety === order.variety
                  ).length;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        const next = { ...draftFilter, [k]: !active };
                        const anyOn = (
                          ["raasi", "destemming", "purchase"] as const
                        ).some((x) => next[x]);
                        if (!anyOn) return;
                        setDraftFilter(next);
                        // If the currently chosen lot is from the kind we
                        // just toggled off, clear the selection.
                        if (active) {
                          const [lotKind] = draftLotKey.split("::");
                          if (lotKind === k) setDraftLotKey("");
                        }
                      }}
                      className={
                        "inline-flex items-center gap-1 rounded-full border-[0.5px] px-2 py-0.5 text-[9px] font-bold transition-all " +
                        (active
                          ? "border-[var(--vv-acc)] bg-[var(--vv-acc-bg)] text-[var(--vv-acc)]"
                          : "border-[var(--vv-bd2)] bg-[var(--vv-bg0)] text-[var(--vv-t3)] hover:border-[var(--vv-bd)]")
                      }
                    >
                      <span>{ORDER_SOURCE_ICON[k]}</span>
                      {ORDER_SOURCE_LABEL[k]}
                      <span className="vv-mono opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_auto]">
                <FieldShell label="Lot">
                  <SelectInput
                    value={draftLotKey}
                    onChange={(e) => {
                      const next = e.target.value;
                      setDraftLotKey(next);
                      // Auto-fill KG with the smaller of the order's
                      // remaining target or the lot's remaining stock — a
                      // sensible default the operator can override.
                      const lot = inventory.find(
                        (l) => `${l.sourceKind}::${l.sourceId}` === next
                      );
                      if (lot) {
                        const need = remainingTargetKg(order);
                        const fill =
                          need > 0
                            ? Math.min(need, lot.remainingKg)
                            : lot.remainingKg;
                        setDraftKg(String(Math.round(fill)));
                      }
                    }}
                  >
                    <option value="">
                      {visibleInventory.length === 0
                        ? `No ${order.variety} stock matches the filters`
                        : "Choose a lot…"}
                    </option>
                    {visibleInventory.map((l) => {
                      const k = `${l.sourceKind}::${l.sourceId}`;
                      return (
                        <option key={k} value={k}>
                          {ORDER_SOURCE_ICON[l.sourceKind]} {l.sourceId} ·{" "}
                          {l.shop} · Mark {l.mark} · {fmtKG(l.remainingKg)}{" "}
                          available
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
                    value={draftKg}
                    onChange={(e) => setDraftKg(e.target.value)}
                  />
                </FieldShell>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="soft-success"
                    onClick={handleAddAllocation}
                    disabled={!draftLotKey || parseFloat(draftKg) <= 0}
                  >
                    <Plus size={12} />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes timeline (last few) */}
      {order.notes.length > 0 && (
        <div className="flex flex-col gap-1 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Notes
          </div>
          {order.notes.slice(-4).map((n, i) => (
            <div key={i} className="text-[11px] leading-snug">
              <span className="font-bold text-[var(--vv-t1)]">
                {ORDER_STAGE_TEAMS[n.stage]}:
              </span>{" "}
              <span className="text-[var(--vv-t2)]">{n.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stage entry stamp — hidden for settled (terminal) orders. */}
      {!order.isCancelled && isOpen && (
        <div className="flex items-center gap-2 text-[10px] text-[var(--vv-t2)]">
          <Clock size={10} />
          <span className="vv-mono">
            At {ORDER_STAGE_NAMES[order.currentStage]} for{" "}
            {fmtRelTime(order.stageEnteredAt[order.currentStage])}
          </span>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-col gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-2.5">
        {/* Visible blocker hint when the advance button is disabled and the
            reason is actionable (i.e. the operator can fix it themselves). */}
        {!order.isCancelled && order.currentStage === 2 && !isFulfilled && (
          <div className="flex items-center gap-1.5 rounded-vv-sm border-[0.5px] border-[var(--vv-am-bd)] bg-[var(--vv-am-bg)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--vv-am)]">
            <Flag size={11} />
            Allocate the full {fmtKG(order.targetKg)} target before moving to
            Deliver · {fmtKG(Math.max(0, order.targetKg - allocated))} short
          </div>
        )}
        {order.isCancelled ? (
          <Pill tone="danger">
            <XCircle size={11} />
            Cancelled
          </Pill>
        ) : order.currentStage === 4 && isSettled ? (
          // Terminal — payment settled.
          <Pill tone="success">
            <Lock size={11} />
            Settled · payment closed · {fmtINR(revenue)}
          </Pill>
        ) : order.currentStage === 4 ? (
          // Stage 4 pending settlement — dedicated "Mark settled" action.
          // Cancel still available alongside since payment can fall through.
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="soft-success"
              onClick={handleSettle}
              className="min-w-0 flex-1 justify-between"
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                <Lock size={13} className="flex-shrink-0" />
                Mark settled
              </span>
              <ArrowRight size={13} className="flex-shrink-0" />
            </Button>
            <Button
              size="sm"
              variant="soft-danger"
              onClick={handleCancel}
              title="Cancel this order"
              className="flex-shrink-0"
            >
              <XCircle size={13} />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="soft-primary"
              onClick={handleAdvance}
              disabled={!canAdvance}
              title={advanceBlockedReason ?? undefined}
              className="min-w-0 flex-1 justify-between"
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                {order.currentStage === 1 && (
                  <Package size={13} className="flex-shrink-0" />
                )}
                {order.currentStage === 2 && (
                  <Truck size={13} className="flex-shrink-0" />
                )}
                {order.currentStage === 3 && (
                  <CheckCircle2 size={13} className="flex-shrink-0" />
                )}
                {advanceLabel}
              </span>
              <ArrowRight size={13} className="flex-shrink-0" />
            </Button>
            <Button
              size="sm"
              variant="soft-danger"
              onClick={handleCancel}
              title="Cancel this order"
              className="flex-shrink-0"
            >
              <XCircle size={13} />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
