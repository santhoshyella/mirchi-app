import { Link, useSearchParams } from "react-router-dom";
import {
  Filter as FilterIcon,
  Plus,
  RotateCcw,
  Target,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { KpiCard } from "@/components/KpiCard";
import { Pill } from "@/components/Pill";
import { EmptyState } from "@/components/EmptyState";
import { FieldShell, SelectInput, TextInput } from "@/components/Field";
import { fmtIN, fmtKG, fmtPct } from "@/lib/format";
import {
  DESTEMMING_POINTS,
  DESTEMMING_STATUSES,
  DESTEMMING_STATUS_LABEL,
  VARIETIES,
  type DestemmingFilters,
  type DestemmingPoint,
  type DestemmingStatus,
  type Variety,
} from "@/types/domain";

import { useDestemmingStore } from "./store";
import { countByStatus, filterJobs, kpiSnapshot } from "./selectors";
import { DestemmingRow } from "./DestemmingRow";
import { useRaasiStore } from "@/features/raasi/store";
import { useOrderStore } from "@/features/order/store";
import { allocationsBySource } from "@/features/order/selectors";

/**
 * Phase 2 · Grading · Destemming list
 *
 * Mirrors the Purchase list layout — header, filters, KPI strip, status chips,
 * cards. Stage chips are replaced with status chips (draft / sent / partial /
 * received) since destemming has its own lifecycle.
 */
export function DestemmingListPage() {
  const jobs = useDestemmingStore((s) => s.jobs);
  const loading = useDestemmingStore((s) => s.loading);
  const fetchJobs = useDestemmingStore((s) => s.fetchJobs);
  const filters = useDestemmingStore((s) => s.filters);
  const setFilters = useDestemmingStore((s) => s.setFilters);
  const resetFilters = useDestemmingStore((s) => s.resetFilters);

  // Hide destemming jobs that have already moved into a Raasi batch.
  // "Stock available" view — once it's in raasi, it's not in destemming.
  const raasiBatchesForFilter = useRaasiStore((s) => s.batches);
  // Allocations index for the per-row "Left over" indicator.
  const allOrders = useOrderStore((s) => s.orders);
  const orderAllocationsByLot = useMemo(
    () => allocationsBySource(allOrders),
    [allOrders]
  );
  const consumedOpts = useMemo(
    () => ({ raasiBatches: raasiBatchesForFilter }),
    [raasiBatchesForFilter]
  );

  const filtered = useMemo(
    () => filterJobs(jobs, filters, consumedOpts),
    [jobs, filters, consumedOpts]
  );
  const kpi = useMemo(
    () => kpiSnapshot(filtered, filters),
    [filtered, filters]
  );
  // Status chip counts ignore the status filter so chips don't all read 0
  // once you click a chip (same trick as the Purchase list).
  const baseList = useMemo(
    () => filterJobs(jobs, { ...filters, status: "all" }, consumedOpts),
    [jobs, filters, consumedOpts]
  );
  const statusCounts = useMemo(() => countByStatus(baseList), [baseList]);

  // Count of jobs hidden by the consumption filter, for the header hint.
  const consumedCount = useMemo(() => {
    const claimed = new Set<string>();
    for (const b of raasiBatchesForFilter) {
      if (b.sourceType !== "destemming") continue;
      for (const id of b.sourceIds) claimed.add(id);
    }
    let n = 0;
    for (const j of jobs) if (claimed.has(j.id)) n += 1;
    return n;
  }, [jobs, raasiBatchesForFilter]);

  // ── Focus + linkage ───────────────────────────────────────────────────
  // ?focus=d-XXX brings a specific job to the top regardless of filters and
  // rings it. Triggered by the Purchase list's "Destemming · d-XXX →" pill
  // and any future deep links into the destemming list.
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const focusedRowRef = useRef<HTMLDivElement | null>(null);

  const focusedJob = useMemo(
    () => (focusId ? jobs.find((j) => j.id === focusId) : undefined),
    [focusId, jobs]
  );

  // Ensure the focused job is in the rendered list (lifted to the top).
  const displayed = useMemo(() => {
    if (!focusedJob) return filtered;
    const without = filtered.filter((j) => j.id !== focusedJob.id);
    return [focusedJob, ...without];
  }, [filtered, focusedJob]);

  useEffect(() => {
    void fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateMode, filters.singleDate, filters.rangeStart, filters.rangeEnd, filters.variety, filters.status]);

  useEffect(() => {
    if (focusedJob && focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [focusedJob?.id]);

  const clearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
  };

  // Map destemmingJobId → raasiBatchId for the forward-link pill in the row
  // header. A batch can merge multiple jobs, so walk every sourceIds entry.
  // Reuses the raasi batches hook declared earlier for the consumption filter.
  const raasiByDestemming = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of raasiBatchesForFilter) {
      if (b.sourceType !== "destemming") continue;
      for (const id of b.sourceIds) m.set(id, b.id);
    }
    return m;
  }, [raasiBatchesForFilter]);

  const newCta = (
    <Link to="/destemming/new" className="hidden md:inline-flex">
      <Button size="sm" type="button">
        <Plus size={14} />
        New destemming job
      </Button>
    </Link>
  );

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Grading" },
          { label: "Destemming" },
        ]}
        rolePill={{ label: "Grading", tone: "purple" }}
        right={newCta}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold leading-tight">
              Destemming jobs
            </h1>
            <div className="vv-mono mt-0.5 text-[11px] text-[var(--vv-t2)]">
              Track stems out · destemmed weight in
              <span className="mx-1">·</span>
              {fmtIN(filtered.length)} of{" "}
              {fmtIN(Math.max(0, jobs.length - consumedCount))} job
              {jobs.length === 1 ? "" : "s"} · filtered view
              {consumedCount > 0 && (
                <>
                  <span className="mx-1">·</span>
                  <span title="Jobs whose output has moved into Raasi · still accessible via cross-links">
                    {fmtIN(consumedCount)} moved to Raasi
                  </span>
                </>
              )}
            </div>
          </div>
          <Link to="/destemming/new" className="md:hidden">
            <Button size="sm">
              <Plus size={14} />
              New
            </Button>
          </Link>
        </div>

        {/* Focus banner — visible when navigated here with ?focus=d-XXX
            (typically from a Purchase row's "Destemming · d-XXX →" pill). */}
        {focusedJob && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-vv-md border-[0.5px] border-[var(--vv-acc-bd)] bg-[var(--vv-acc-bg)] px-3 py-2 text-[12px]">
            <Target size={13} className="text-[var(--vv-acc)]" />
            <span className="font-bold text-[var(--vv-acc)]">
              Focused on {focusedJob.id} · {focusedJob.shop}
            </span>
            <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
              brought to top regardless of filters
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
        {focusId && !focusedJob && (
          <div className="mb-3 rounded-vv-md border-[0.5px] border-[var(--vv-am-bd)] bg-[var(--vv-am-bg)] px-3 py-2 text-[11px] text-[var(--vv-am)]">
            Couldn't find destemming job{" "}
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

        <Card padding="md" className="mb-4">
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-[var(--vv-t1)]">
            <FilterIcon size={13} />
            <span>Filters</span>
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--vv-t2)] hover:text-[var(--vv-acc)]"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <FieldShell label="Date mode">
              <SelectInput
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

            {filters.dateMode === "single" && (
              <FieldShell label="Date">
                <TextInput
                  type="date"
                  value={filters.singleDate}
                  onChange={(e) => setFilters({ singleDate: e.target.value })}
                />
              </FieldShell>
            )}

            {filters.dateMode === "range" && (
              <>
                <FieldShell label="From">
                  <TextInput
                    type="date"
                    value={filters.rangeStart}
                    onChange={(e) => setFilters({ rangeStart: e.target.value })}
                  />
                </FieldShell>
                <FieldShell label="To">
                  <TextInput
                    type="date"
                    value={filters.rangeEnd}
                    onChange={(e) => setFilters({ rangeEnd: e.target.value })}
                  />
                </FieldShell>
              </>
            )}

            <FieldShell label="Variety">
              <SelectInput
                value={filters.variety}
                onChange={(e) =>
                  setFilters({ variety: e.target.value as Variety | "all" })
                }
              >
                <option value="all">All varieties</option>
                {VARIETIES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>

            <FieldShell
              label={
                <span className="inline-flex items-center gap-1">
                  <Wind size={11} />
                  Destemming point
                </span>
              }
              hint="Projects each row to just this point's dispatches."
            >
              <SelectInput
                value={filters.point}
                onChange={(e) => {
                  const next = e.target.value as DestemmingPoint | "all";
                  // Reset the status sub-filter whenever the point clears,
                  // so toggling back to "All points" doesn't leave a stale
                  // "in-flight" filter in place that the user can't see.
                  setFilters({
                    point: next,
                    pointStatus: next === "all" ? "all" : filters.pointStatus,
                  });
                }}
              >
                <option value="all">All points</option>
                {DESTEMMING_POINTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>

            {filters.point !== "all" && (
              <FieldShell
                label="Status at point"
                hint="In flight = still at the point. Received = already returned."
              >
                <SelectInput
                  value={filters.pointStatus}
                  onChange={(e) =>
                    setFilters({
                      pointStatus: e.target
                        .value as DestemmingFilters["pointStatus"],
                    })
                  }
                >
                  <option value="all">All</option>
                  <option value="in-flight">In flight</option>
                  <option value="received">Received</option>
                </SelectInput>
              </FieldShell>
            )}
          </div>

          {/* Status chips — replace the stage chips of the Purchase list. */}
          <div className="-mx-4 mt-3 flex items-center gap-1.5 overflow-x-auto border-t-[0.5px] border-[var(--vv-bd)] px-4 pt-3">
            <Chip
              active={filters.status === "all"}
              onClick={() => setFilters({ status: "all" })}
            >
              All statuses
              <Pill
                tone={filters.status === "all" ? "inverse" : "neutral"}
                className="vv-mono ml-0.5"
              >
                {fmtIN(baseList.length)}
              </Pill>
            </Chip>
            {DESTEMMING_STATUSES.map((s) => (
              <Chip
                key={s}
                active={filters.status === s}
                onClick={() =>
                  setFilters({ status: filters.status === s ? "all" : s })
                }
              >
                <span>{DESTEMMING_STATUS_LABEL[s]}</span>
                <Pill
                  tone={filters.status === s ? "inverse" : "neutral"}
                  className="vv-mono ml-0.5"
                >
                  {fmtIN(statusCounts[s as DestemmingStatus])}
                </Pill>
              </Chip>
            ))}
          </div>
        </Card>

        {/* KPI strip — adds "To receive" so the team always sees how much
            chilli is currently sitting at points awaiting destemming. */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <KpiCard
            label="Input KG"
            value={fmtKG(kpi.inputKg)}
            sub={`${fmtIN(kpi.jobs)} job${kpi.jobs === 1 ? "" : "s"}`}
          />
          <KpiCard
            label="Sent to points"
            value={fmtKG(kpi.sentKg)}
            sub={
              kpi.pendingBags > 0
                ? `${fmtIN(kpi.pendingBags)} bags pending`
                : "Fully allocated"
            }
          />
          <KpiCard
            label="To receive"
            value={kpi.pendingKg > 0 ? fmtKG(kpi.pendingKg) : "—"}
            sub={
              kpi.pendingDispatches > 0
                ? `${fmtIN(kpi.pendingDispatches)} dispatch${
                    kpi.pendingDispatches === 1 ? "" : "es"
                  } in flight`
                : "Nothing in flight"
            }
            tone={kpi.pendingKg > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Destemmed"
            value={fmtKG(kpi.receivedKg)}
            sub={
              kpi.yieldPct !== null
                ? `Yield ${fmtPct(kpi.yieldPct, 1)}`
                : "No receipts yet"
            }
          />
          <KpiCard
            label="Stem loss"
            value={
              kpi.yieldPct !== null
                ? fmtKG(
                    Math.max(0, kpi.sentKg - kpi.receivedKg - kpi.pendingKg)
                  )
                : "—"
            }
            sub={
              kpi.yieldPct !== null && kpi.sentKg > 0
                ? `${fmtPct(100 - kpi.yieldPct, 1)} of received`
                : undefined
            }
            tone={
              kpi.yieldPct !== null && kpi.yieldPct < 88 ? "danger" : "default"
            }
          />
        </div>

        {loading ? (
          <Card padding="lg">
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
              Loading…
            </div>
          </Card>
        ) : displayed.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<Wind size={36} />}
              title="No destemming jobs match these filters"
              description="Adjust the date / variety / status, or create a new job from a settled purchase."
              action={
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw size={12} />
                  Reset filters
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {displayed.map((j) => (
              <DestemmingRow
                key={j.id}
                job={j}
                focused={!!focusedJob && j.id === focusedJob.id}
                outerRef={
                  focusedJob && j.id === focusedJob.id
                    ? focusedRowRef
                    : undefined
                }
                linkedRaasiBatchId={raasiByDestemming.get(j.id)}
                orderAllocatedKg={
                  orderAllocationsByLot.get(`destemming::${j.id}`) ?? 0
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
