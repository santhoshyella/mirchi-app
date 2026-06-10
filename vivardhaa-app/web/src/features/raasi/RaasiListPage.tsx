import { Link, useSearchParams } from "react-router-dom";
import {
  Filter as FilterIcon,
  Plus,
  RotateCcw,
  Sun,
  Target,
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
  RAASI_SOURCE_LABEL,
  RAASI_SOURCE_TYPES,
  RAASI_STATUSES,
  RAASI_STATUS_LABEL,
  VARIETIES,
  type RaasiSourceType,
  type RaasiStatus,
  type Variety,
} from "@/types/domain";

import { useRaasiStore } from "./store";
import { useOrderStore } from "@/features/order/store";
import { allocationsBySource } from "@/features/order/selectors";
import { countByStatus, filterBatches, kpiSnapshot } from "./selectors";
import { RaasiRow } from "./RaasiRow";

/**
 * Phase 2 · Grading · Raasi list
 *
 * Mirrors Destemming list. Status chips replace stage chips; the filter card
 * carries date / variety / source-type / status. KPIs cover yard load and
 * sun-drying yield.
 */
export function RaasiListPage() {
  const batches = useRaasiStore((s) => s.batches);
  const loading = useRaasiStore((s) => s.loading);
  const fetchBatches = useRaasiStore((s) => s.fetchBatches);
  const filters = useRaasiStore((s) => s.filters);
  const setFilters = useRaasiStore((s) => s.setFilters);
  const resetFilters = useRaasiStore((s) => s.resetFilters);

  // Index of KG allocated per source lot from open outward orders — drives
  // the per-row "Left over" indicator on collected batches.
  const allOrders = useOrderStore((s) => s.orders);
  const orderAllocationsByLot = useMemo(
    () => allocationsBySource(allOrders),
    [allOrders]
  );

  const filtered = useMemo(
    () => filterBatches(batches, filters),
    [batches, filters]
  );
  const kpi = useMemo(() => kpiSnapshot(filtered), [filtered]);
  // Status chip counts ignore the status filter so chips don't all read 0
  // once a chip is on.
  const baseList = useMemo(
    () => filterBatches(batches, { ...filters, status: "all" }),
    [batches, filters]
  );
  const statusCounts = useMemo(() => countByStatus(baseList), [baseList]);

  // ── Focus + linkage ───────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const focusedRowRef = useRef<HTMLDivElement | null>(null);

  const focusedBatch = useMemo(
    () => (focusId ? batches.find((b) => b.id === focusId) : undefined),
    [focusId, batches]
  );

  const displayed = useMemo(() => {
    if (!focusedBatch) return filtered;
    const without = filtered.filter((b) => b.id !== focusedBatch.id);
    return [focusedBatch, ...without];
  }, [filtered, focusedBatch]);

  useEffect(() => {
    void fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateMode, filters.singleDate, filters.rangeStart, filters.rangeEnd, filters.variety, filters.status, filters.sourceType]);

  useEffect(() => {
    if (focusedBatch && focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [focusedBatch?.id]);

  const clearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
  };

  const newCta = (
    <Link to="/raasi/new" className="hidden md:inline-flex">
      <Button size="sm" type="button">
        <Plus size={14} />
        New Raasi batch
      </Button>
    </Link>
  );

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Grading" },
          { label: "Raasi" },
        ]}
        rolePill={{ label: "Grading", tone: "purple" }}
        right={newCta}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold leading-tight">
              Raasi · Sun drying
            </h1>
            <div className="vv-mono mt-0.5 text-[11px] text-[var(--vv-t2)]">
              Wet KG on the yard · dry KG in the bag
              <span className="mx-1">·</span>
              {fmtIN(filtered.length)} of {fmtIN(batches.length)} batch
              {batches.length === 1 ? "" : "es"} · filtered view
            </div>
          </div>
          <Link to="/raasi/new" className="md:hidden">
            <Button size="sm">
              <Plus size={14} />
              New
            </Button>
          </Link>
        </div>

        {/* Focus banner */}
        {focusedBatch && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-vv-md border-[0.5px] border-[var(--vv-acc-bd)] bg-[var(--vv-acc-bg)] px-3 py-2 text-[12px]">
            <Target size={13} className="text-[var(--vv-acc)]" />
            <span className="font-bold text-[var(--vv-acc)]">
              Focused on {focusedBatch.id} · {focusedBatch.shop}
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
        {focusId && !focusedBatch && (
          <div className="mb-3 rounded-vv-md border-[0.5px] border-[var(--vv-am-bd)] bg-[var(--vv-am-bg)] px-3 py-2 text-[11px] text-[var(--vv-am)]">
            Couldn't find Raasi batch{" "}
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
            <FieldShell label="Date mode" hint="Anchored to the spread date.">
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
              <FieldShell label="Spread date">
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

            <FieldShell label="Source" hint="Where the chillies came from.">
              <SelectInput
                value={filters.sourceType}
                onChange={(e) =>
                  setFilters({
                    sourceType: e.target.value as RaasiSourceType | "all",
                  })
                }
              >
                <option value="all">All sources</option>
                {RAASI_SOURCE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {RAASI_SOURCE_LABEL[s]}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>
          </div>

          {/* Status chips */}
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
            {RAASI_STATUSES.map((s) => (
              <Chip
                key={s}
                active={filters.status === s}
                onClick={() =>
                  setFilters({ status: filters.status === s ? "all" : s })
                }
              >
                <span>{RAASI_STATUS_LABEL[s]}</span>
                <Pill
                  tone={filters.status === s ? "inverse" : "neutral"}
                  className="vv-mono ml-0.5"
                >
                  {fmtIN(statusCounts[s as RaasiStatus])}
                </Pill>
              </Chip>
            ))}
          </div>
        </Card>

        {/* KPI strip */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard
            label="Batches"
            value={fmtIN(kpi.batches)}
            sub={`${fmtIN(kpi.drying)} drying · ${fmtIN(kpi.collected)} collected`}
          />
          <KpiCard
            label="On yard"
            value={kpi.onYardKg > 0 ? fmtKG(kpi.onYardKg) : "—"}
            sub={
              kpi.onYardBags > 0
                ? `${fmtIN(kpi.onYardBags)} bags exposed`
                : "Yard empty"
            }
            tone={kpi.onYardKg > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Dry collected"
            value={kpi.totalDryKg > 0 ? fmtKG(kpi.totalDryKg) : "—"}
            sub={
              kpi.yieldPct !== null
                ? `Yield ${fmtPct(kpi.yieldPct, 1)}`
                : "No collections yet"
            }
          />
          <KpiCard
            label="Avg days drying"
            value={
              kpi.avgDaysDrying !== null ? kpi.avgDaysDrying.toFixed(1) : "—"
            }
            sub={
              kpi.avgDaysDrying !== null
                ? "Across batches still on yard"
                : undefined
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
              icon={<Sun size={36} />}
              title="No Raasi batches match these filters"
              description="Adjust the date / variety / status, or create a new batch from a settled Raasi-destination purchase or a destemmed lot."
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
            {displayed.map((b) => (
              <RaasiRow
                key={b.id}
                batch={b}
                focused={!!focusedBatch && b.id === focusedBatch.id}
                outerRef={
                  focusedBatch && b.id === focusedBatch.id
                    ? focusedRowRef
                    : undefined
                }
                orderAllocatedKg={
                  orderAllocationsByLot.get(`raasi::${b.id}`) ?? 0
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
