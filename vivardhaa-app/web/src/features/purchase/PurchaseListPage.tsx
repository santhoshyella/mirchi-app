import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Filter as FilterIcon,
  RotateCcw,
  Flag,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TopBar, type Crumb } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { KpiCard } from "@/components/KpiCard";
import { Pill } from "@/components/Pill";
import { EmptyState } from "@/components/EmptyState";
import { FieldShell, SelectInput, TextInput } from "@/components/Field";
import { fmtIN, fmtINR, fmtKG } from "@/lib/format";
import {
  STAGE_NAMES,
  type PurchaseItem,
  type PurchaseStage,
  type Variety,
} from "@/types/domain";
import { useSetupStore } from "@/features/setup/store";

import { getSessionUser } from "@/lib/permissions";
import { usePurchaseStore } from "./store";
import { countGroupsByStage, filterItems, kpiSnapshot } from "./selectors";
import { PurchaseRow } from "./PurchaseRow";
import { PurchaseGroupCard } from "./PurchaseGroupCard";
import { groupPurchases } from "./selectors";
import { useDestemmingStore } from "@/features/destemming/store";
import { useRaasiStore } from "@/features/raasi/store";
import { useOrderStore } from "@/features/order/store";
import { allocationsBySource } from "@/features/order/selectors";

const ALL_STAGES: PurchaseStage[] = [1, 2, 3, 4, 5, 6];

interface Props {
  /**
   * If provided, the page is a role-based "queue" view locked to this stage.
   * Used by /machule, /weighing, /loading, /receipt routes — the stage chips
   * and stage filter are hidden because each role only ever sees its own queue.
   */
  initialStage?: PurchaseStage;
  /** Header title (default: "Purchase list") */
  title?: string;
  /** Optional one-line subheading shown under the title */
  subtitle?: string;
  /** Override the breadcrumb trail */
  crumbs?: Crumb[];
  /** Mobile back link, e.g. queue pages back to Home */
  mobileBack?: { to: string; label: string };
  /** Role pill in the top-right */
  rolePill?: { label: string; tone?: "purple" | "accent" | "info" | "success" };
  /** Show the "New purchase item" CTA. Default true (the canonical /purchase). */
  showNewCta?: boolean;
}

/**
 * Inward · Purchase list — the operational dashboard.
 *
 * Reused as a queue view by Machule / Weighing / Loading / Receipt routes;
 * those just pass `initialStage` and a customised title + breadcrumb.
 *
 * Layout:
 *  - Header (title, count, mobile CTA)
 *  - Filter bar (date mode toggle + variety + reset)
 *  - KPI strip (filtered totals)
 *  - Stage chip row (counts per stage, click to focus)
 *  - List (cards on mobile, looser cards on desktop)
 */
export function PurchaseListPage({
  initialStage,
  title = "Purchase list",
  subtitle,
  crumbs,
  mobileBack,
  rolePill,
  showNewCta = true,
}: Props = {}) {
  const items = usePurchaseStore((s) => s.items);
  const loading = usePurchaseStore((s) => s.loading);
  const fetchItems = usePurchaseStore((s) => s.fetchItems);
  const filters = usePurchaseStore((s) => s.filters);
  const setFilters = usePurchaseStore((s) => s.setFilters);
  const resetFilters = usePurchaseStore((s) => s.resetFilters);

  // Varieties from the setup store (API-sourced, not hardcoded).
  const setupVarieties = useSetupStore((s) => s.varieties);
  const fetchVarieties = useSetupStore((s) => s.fetchVarieties);
  useEffect(() => {
    if (setupVarieties.length === 0) fetchVarieties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unique shops: merge localStorage (vv-shop-names, all source types) with
  // any shops present in the currently-loaded items that may have come from
  // a different device. This mirrors exactly what the New Purchase combobox shows.
  const availableShops = useMemo(() => {
    const fromItems = items.map((i) => i.shop).filter(Boolean);
    let fromStorage: string[] = [];
    try {
      const raw = localStorage.getItem("vv-shop-names");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string[]> | unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          fromStorage = Object.values(parsed as Record<string, string[]>).flat();
        }
      }
    } catch {
      // ignore corrupt storage
    }
    return [...new Set([...fromStorage, ...fromItems])].sort();
  }, [items]);

  // Dispatch-window control: the SelectInput offers presets + "Custom"; when
  // Custom is chosen we show an inline number input. The select's "mode" is
  // tracked separately so flipping between presets and Custom is sticky.
  const PRESET_DAYS = [5, 10, 15, 30];
  const isPreset = (d: number | "all") =>
    typeof d === "number" && PRESET_DAYS.includes(d);
  const [dispatchMode, setDispatchMode] = useState<
    "all" | "5" | "10" | "15" | "30" | "custom"
  >(() => {
    if (filters.dispatchWithinDays === "all") return "all";
    if (isPreset(filters.dispatchWithinDays))
      return String(filters.dispatchWithinDays) as "5" | "10" | "15" | "30";
    return "custom";
  });

  // Lock the stage filter to this page's queue on mount / route change.
  // On role queues (initialStage set) the stage is fixed and the chip row is
  // hidden — only date + variety can be filtered.
  // For the main list, do NOT reset the stage on every mount — the user's
  // current chip selection should survive navigating to edit and back.
  useEffect(() => {
    if (initialStage !== undefined) {
      setFilters({ stage: initialStage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStage]);

  // Fetch from API whenever filters change.
  useEffect(() => {
    fetchItems();
  }, [
    filters.dateMode,
    filters.singleDate,
    filters.rangeStart,
    filters.rangeEnd,
    filters.variety,
    filters.stage,
    fetchItems,
  ]);

  // Reset clears date + variety, but on queue views keeps the stage lock so
  // a Machule user doesn't accidentally see the whole pipeline after Reset.
  const handleReset = () => {
    resetFilters();
    setDispatchMode("all");
    if (initialStage !== undefined) {
      setFilters({ stage: initialStage });
    }
  };

  // Main /purchase view (no initialStage) hides lots that have moved on into
  // destemming or raasi — "stock available" view. Role queues skip the dedup
  // since they're workflow views (e.g. Accounts still settles a destemmed
  // lot's payment).
  const destemmingJobs = useDestemmingStore((s) => s.jobs);
  const raasiBatches = useRaasiStore((s) => s.batches);
  const consumedOpts = useMemo(
    () =>
      initialStage === undefined ? { destemmingJobs, raasiBatches } : undefined,
    [initialStage, destemmingJobs, raasiBatches]
  );

  // Session — used to hide tasks assigned to other users on stage queue views.
  const session = getSessionUser();
  const isAdmin = session?.isAdmin ?? true;
  const sessionName = session?.name ?? "";

  /**
   * Assignee filter — only active on stage queue pages (initialStage set) for
   * non-admin users.
   *
   * Rule: show a task if:
   *   (a) it is unassigned at its current stage, OR
   *   (b) it is assigned to the current user.
   *
   * Tasks assigned to a different user are hidden from everyone else.
   * Admins always see the full list.
   */
  function applyAssigneeFilter(list: PurchaseItem[]): PurchaseItem[] {
    if (isAdmin || initialStage === undefined) return list;
    return list.filter((it) => {
      const assignee = it.stageAssignee[it.currentStage];
      return !assignee || assignee === sessionName;
    });
  }

  const filtered = useMemo(
    () => applyAssigneeFilter(filterItems(items, filters, consumedOpts)),
    [items, filters, consumedOpts, isAdmin, sessionName, initialStage]
  );
  const kpi = useMemo(() => kpiSnapshot(filtered), [filtered]);
  // Stage chip counts are computed against the *date+variety* slice — not the
  // current stage selection — so the chips don't all become "0" once a chip is on.
  const stageBaseList = useMemo(
    () => applyAssigneeFilter(filterItems(items, { ...filters, stage: "all" }, consumedOpts)),
    [items, filters, consumedOpts, isAdmin, sessionName, initialStage]
  );
  // Group the stage-base list so chip counts reflect purchase groups, not lots.
  const stageBaseGroups = useMemo(
    () => groupPurchases(stageBaseList),
    [stageBaseList]
  );
  const stageCounts = useMemo(
    () => countGroupsByStage(stageBaseGroups),
    [stageBaseGroups]
  );

  // Count of items hidden by the consumption filter — used for the header
  // hint so the operator understands why item count differs from the total.
  const consumedCount = useMemo(() => {
    if (initialStage !== undefined) return 0;
    let n = 0;
    const dSet = new Set(destemmingJobs.map((j) => j.purchaseId));
    const rSet = new Set<string>();
    for (const b of raasiBatches) {
      if (b.sourceType !== "purchase") continue;
      for (const id of b.sourceIds) rSet.add(id);
    }
    for (const p of items) {
      if (dSet.has(p.id) || rSet.has(p.id)) n += 1;
    }
    return n;
  }, [items, destemmingJobs, raasiBatches, initialStage]);

  // -- Focus + linkage --
  // ?focus=p-XXX brings a specific purchase to the top, regardless of the
  // active filters, and rings it. Triggered by destemming row "from p-XXX"
  // back-links and any future deep links into the list.
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const focusedRowRef = useRef<HTMLDivElement | null>(null);

  const focusedItem = useMemo(
    () => (focusId ? items.find((i) => i.id === focusId) : undefined),
    [focusId, items]
  );

  // List actually rendered: filtered list, with the focused item lifted to
  // the top (and de-duped if it was already in the filtered slice).
  const displayed = useMemo(() => {
    if (!focusedItem) return filtered;
    const without = filtered.filter((i) => i.id !== focusedItem.id);
    return [focusedItem, ...without];
  }, [filtered, focusedItem]);

  // Hierarchical groups: (date + sourceType + shop) -> variety -> lots.
  // Focused group sorts first; within groups, newest date/createdAt first.
  const groups = useMemo(
    () => groupPurchases(displayed, focusId),
    [displayed, focusId],
  );

  // Map purchaseId -> destemmingJobId so each row can render a forward link
  // when a job exists for that lot. Reuses the destemmingJobs hook declared
  // earlier for the consumption filter.
  const destemmingByPurchase = useMemo(() => {
    const m = new Map<string, string>();
    for (const j of destemmingJobs) m.set(j.purchaseId, j.id);
    return m;
  }, [destemmingJobs]);

  // Allocations index — drives the per-row "Left over" indicator on
  // stage-6 purchases that are still sellable directly to orders.
  const allOrders = useOrderStore((s) => s.orders);
  const orderAllocationsByLot = useMemo(
    () => allocationsBySource(allOrders),
    [allOrders]
  );

  // Map purchaseId -> raasiBatchId for purchase-sourced Raasi batches. A
  // batch can merge multiple purchases, so we walk every entry of sourceIds.
  const raasiByPurchase = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of raasiBatches) {
      if (b.sourceType !== "purchase") continue;
      for (const id of b.sourceIds) m.set(id, b.id);
    }
    return m;
  }, [raasiBatches]);

  // Scroll the focused row into view on first paint after a focus change.
  useEffect(() => {
    if (focusedItem && focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [focusedItem?.id]);

  const clearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
  };

  const newCta = showNewCta ? (
    <Link to="/purchase/new" className="hidden md:inline-flex">
      <Button size="sm" type="button">
        <Plus size={14} />
        New purchase item
      </Button>
    </Link>
  ) : undefined;

  const defaultCrumbs: Crumb[] = [
    { label: "Operations", to: "/" },
    { label: "Inward" },
    { label: title },
  ];

  return (
    <>
      <TopBar
        crumbs={crumbs ?? defaultCrumbs}
        mobileBack={mobileBack}
        rolePill={rolePill}
        right={newCta}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-6">
        {/* Page header */}
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold leading-tight">{title}</h1>
            <div className="vv-mono mt-0.5 text-[11px] text-[var(--vv-t2)]">
              {subtitle ? (
                <>
                  {subtitle}
                  <span className="mx-1">·</span>
                </>
              ) : null}
              {fmtIN(groups.length)} purchase{groups.length !== 1 ? "s" : ""}{" "}
              · {fmtIN(filtered.length)} lot{filtered.length !== 1 ? "s" : ""} · filtered view
              {consumedCount > 0 && (
                <>
                  <span className="mx-1">·</span>
                  <span title="Lots that have moved into destemming or raasi · still accessible via cross-links">
                    {fmtIN(consumedCount)} moved downstream
                  </span>
                </>
              )}
            </div>
          </div>
          {showNewCta && (
            <Link to="/purchase/new" className="md:hidden">
              <Button size="sm">
                <Plus size={14} />
                New
              </Button>
            </Link>
          )}
        </div>

        {/* Focus banner */}
        {focusedItem && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-vv-md border-[0.5px] border-[var(--vv-acc-bd)] bg-[var(--vv-acc-bg)] px-3 py-2 text-[12px]">
            <Target size={13} className="text-[var(--vv-acc)]" />
            <span className="font-bold text-[var(--vv-acc)]">
              Focused: {focusedItem.shop} — lot {focusedItem.id}
            </span>
            <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
              group expanded & brought to top
            </span>
            <button
              type="button"
              onClick={clearFocus}
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-[var(--vv-acc)] hover:underline"
            >
              <X size={11} />
              Clear focus
            </button>
          </div>
        )}
        {focusId && !focusedItem && (
          <div className="mb-3 rounded-vv-md border-[0.5px] border-[var(--vv-am-bd)] bg-[var(--vv-am-bg)] px-3 py-2 text-[11px] text-[var(--vv-am)]">
            Couldn't find purchase{" "}
            <span className="vv-mono font-bold">{focusId}</span> — it may have
            been deleted.
            <button
              type="button"
              onClick={clearFocus}
              className="ml-2 font-bold underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Filter bar */}
        <Card padding="md" className="mb-4">
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-[var(--vv-t1)]">
            <FilterIcon size={13} />
            <span>Filters</span>
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--vv-t2)] hover:text-[var(--vv-acc)]"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          </div>

          {/* Single-row compact filter strip.
              Order: Date mode, Date/From/To, Shop, Variety, Dispatch within, Days.
              flex-wrap so extra date fields spill to a second row on narrow screens. */}
          <div className="flex flex-wrap items-end gap-2">

            {/* 1 · Date mode */}
            <FieldShell label="Date mode" className="min-w-0 flex-1 basis-28">
              <SelectInput
                className="py-1.5 text-[12px]"
                value={filters.dateMode}
                onChange={(e) =>
                  setFilters({
                    dateMode: e.target.value as "all" | "single" | "range",
                  })
                }
              >
                <option value="all">All dates</option>
                <option value="single">Single day</option>
                <option value="range">Date range</option>
              </SelectInput>
            </FieldShell>

            {/* 2a · Single date */}
            {filters.dateMode === "single" && (
              <FieldShell label="Date" className="min-w-0 flex-1 basis-28">
                <TextInput
                  className="py-1.5 text-[12px]"
                  type="date"
                  value={filters.singleDate}
                  onChange={(e) => setFilters({ singleDate: e.target.value })}
                />
              </FieldShell>
            )}

            {/* 2b · Date range */}
            {filters.dateMode === "range" && (
              <>
                <FieldShell label="From" className="min-w-0 flex-1 basis-28">
                  <TextInput
                    className="py-1.5 text-[12px]"
                    type="date"
                    value={filters.rangeStart}
                    onChange={(e) => setFilters({ rangeStart: e.target.value })}
                  />
                </FieldShell>
                <FieldShell label="To" className="min-w-0 flex-1 basis-28">
                  <TextInput
                    className="py-1.5 text-[12px]"
                    type="date"
                    value={filters.rangeEnd}
                    onChange={(e) => setFilters({ rangeEnd: e.target.value })}
                  />
                </FieldShell>
              </>
            )}

            {/* 3 · Shop */}
            <FieldShell label="Shop" className="min-w-0 flex-1 basis-28">
              <SelectInput
                className="py-1.5 text-[12px]"
                value={filters.shop}
                onChange={(e) => setFilters({ shop: e.target.value })}
              >
                <option value="">All shops</option>
                {availableShops.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>

            {/* 4 · Variety */}
            <FieldShell label="Variety" className="min-w-0 flex-1 basis-28">
              <SelectInput
                className="py-1.5 text-[12px]"
                value={filters.variety}
                onChange={(e) =>
                  setFilters({ variety: e.target.value as Variety | "all" })
                }
              >
                <option value="all">All varieties</option>
                {setupVarieties.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>

            {/* 5 · Dispatch within */}
            <FieldShell
              label={
                <span className="inline-flex items-center gap-1">
                  <Flag size={11} />
                  Dispatch within
                </span>
              }
              className="min-w-0 flex-1 basis-28"
            >
              <SelectInput
                className="py-1.5 text-[12px]"
                value={dispatchMode}
                onChange={(e) => {
                  const next = e.target.value as typeof dispatchMode;
                  setDispatchMode(next);
                  if (next === "all") {
                    setFilters({ dispatchWithinDays: "all" });
                  } else if (next === "custom") {
                    const seed =
                      typeof filters.dispatchWithinDays === "number"
                        ? filters.dispatchWithinDays
                        : 7;
                    setFilters({ dispatchWithinDays: seed });
                  } else {
                    setFilters({ dispatchWithinDays: parseInt(next, 10) });
                  }
                }}
              >
                <option value="all">All deadlines</option>
                <option value="5">Within 5 days</option>
                <option value="10">Within 10 days</option>
                <option value="15">Within 15 days</option>
                <option value="30">Within 30 days</option>
                <option value="custom">Custom...</option>
              </SelectInput>
            </FieldShell>

            {/* 5a · Custom days */}
            {dispatchMode === "custom" && (
              <FieldShell label="Days" className="min-w-0 flex-1 basis-20">
                <TextInput
                  className="py-1.5 text-[12px]"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  suffix="days"
                  placeholder="e.g. 7"
                  value={
                    typeof filters.dispatchWithinDays === "number"
                      ? String(filters.dispatchWithinDays)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setFilters({ dispatchWithinDays: "all" });
                      return;
                    }
                    const n = parseInt(raw, 10);
                    if (!Number.isNaN(n) && n >= 0) {
                      setFilters({ dispatchWithinDays: n });
                    }
                  }}
                />
              </FieldShell>
            )}
          </div>

          {/* Stage chips */}
          {initialStage === undefined && (
            <div className="-mx-4 mt-3 flex items-center gap-1.5 overflow-x-auto border-t-[0.5px] border-[var(--vv-bd)] px-4 pt-3">
              <Chip
                active={filters.stage === "all"}
                onClick={() => setFilters({ stage: "all" })}
              >
                All stages
                <Pill
                  tone={filters.stage === "all" ? "inverse" : "neutral"}
                  className="vv-mono ml-0.5"
                >
                  {fmtIN(stageBaseGroups.length)}
                </Pill>
              </Chip>
              {ALL_STAGES.map((s) => (
                <Chip
                  key={s}
                  active={filters.stage === s}
                  onClick={() =>
                    setFilters({ stage: filters.stage === s ? "all" : s })
                  }
                >
                  <span className="vv-mono">{s}</span>
                  <span>{STAGE_NAMES[s]}</span>
                  <Pill
                    tone={filters.stage === s ? "inverse" : "neutral"}
                    className="vv-mono ml-0.5"
                  >
                    {fmtIN(stageCounts[s])}
                  </Pill>
                </Chip>
              ))}
            </div>
          )}
        </Card>

        {/* KPI strip */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard label="Total bags" value={fmtIN(kpi.totalBags)} />
          <KpiCard label="Total weight" value={fmtKG(kpi.totalKg)} />
          <KpiCard
            label="Total value"
            value={fmtINR(kpi.totalValue)}
            sub={
              kpi.totalKg > 0
                ? `Avg ${fmtINR(Math.round(kpi.totalValue / kpi.totalKg))}/KG`
                : undefined
            }
          />
          <KpiCard
            label="Rejected"
            value={fmtIN(kpi.rejectedBags)}
            sub={`Accepted ${fmtIN(kpi.acceptedBags)}`}
            tone={kpi.rejectedBags > 0 ? "danger" : "default"}
          />
        </div>

        {/* List */}
        {loading ? (
          <Card padding="lg">
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
              <span className="animate-spin">⟳</span> Loading...
            </div>
          </Card>
        ) : displayed.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<FilterIcon size={36} />}
              title="No purchases match these filters"
              description="Try widening the date range, picking another variety, or resetting filters."
              action={
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw size={12} />
                  Reset filters
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <PurchaseGroupCard
                key={group.key}
                group={group}
                focusedId={focusedItem?.id}
                focusedRef={
                  group.isFocused ? focusedRowRef : undefined
                }
                destemmingByPurchase={destemmingByPurchase}
                raasiByPurchase={raasiByPurchase}
                orderAllocationsByLot={orderAllocationsByLot}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
