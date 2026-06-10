import { Link, useSearchParams } from "react-router-dom";
import {
  Filter as FilterIcon,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
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
import { fmtIN, fmtINR, fmtKG } from "@/lib/format";
import {
  ORDER_STAGES,
  ORDER_STAGE_NAMES,
  VARIETIES,
  type OrderStage,
  type Variety,
} from "@/types/domain";

import { useOrderStore } from "./store";
import { countByStage, filterOrders, kpiSnapshot } from "./selectors";
import { OrderRow } from "./OrderRow";
import { usePurchaseStore } from "@/features/purchase/store";
import { useDestemmingStore } from "@/features/destemming/store";
import { useRaasiStore } from "@/features/raasi/store";

/**
 * Phase 4 · Outward · Orders list
 *
 * Mirrors the Purchase / Destemming / Raasi list shape. Filters: date,
 * variety, stage, customer search. KPI strip: orders / open / target KG /
 * revenue / hot deadlines. Stage chips 1-4 + focus param.
 */
export function OrderListPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const filters = useOrderStore((s) => s.filters);
  const setFilters = useOrderStore((s) => s.setFilters);
  const resetFilters = useOrderStore((s) => s.resetFilters);

  // Prefetch upstream inventory sources so the allocation picker has data.
  const fetchPurchases = usePurchaseStore((s) => s.fetchItems);
  const fetchJobs = useDestemmingStore((s) => s.fetchJobs);
  const fetchBatches = useRaasiStore((s) => s.fetchBatches);

  const filtered = useMemo(
    () => filterOrders(orders, filters),
    [orders, filters]
  );
  const kpi = useMemo(() => kpiSnapshot(filtered), [filtered]);
  // Stage chip counts ignore the stage filter so chips don't all read 0
  // when a chip is on.
  const stageBaseList = useMemo(
    () => filterOrders(orders, { ...filters, stage: "all" }),
    [orders, filters]
  );
  const stageCounts = useMemo(
    () => countByStage(stageBaseList),
    [stageBaseList]
  );

  // ── Focus + linkage ───────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const focusedRowRef = useRef<HTMLDivElement | null>(null);

  const focusedOrder = useMemo(
    () => (focusId ? orders.find((o) => o.id === focusId) : undefined),
    [focusId, orders]
  );

  const displayed = useMemo(() => {
    if (!focusedOrder) return filtered;
    const without = filtered.filter((o) => o.id !== focusedOrder.id);
    return [focusedOrder, ...without];
  }, [filtered, focusedOrder]);

  // Fetch inventory sources once on mount so the allocation picker has data.
  useEffect(() => {
    void fetchPurchases();
    void fetchJobs();
    void fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateMode, filters.singleDate, filters.rangeStart, filters.rangeEnd, filters.variety, filters.stage, filters.customer]);

  useEffect(() => {
    if (focusedOrder && focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [focusedOrder?.id]);

  const clearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
  };

  const newCta = (
    <Link to="/outward/new" className="hidden md:inline-flex">
      <Button size="sm" type="button">
        <Plus size={14} />
        New order
      </Button>
    </Link>
  );

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Outward" },
          { label: "Orders" },
        ]}
        rolePill={{ label: "Sales", tone: "info" }}
        right={newCta}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold leading-tight">
              Outward · Orders
            </h1>
            <div className="vv-mono mt-0.5 text-[11px] text-[var(--vv-t2)]">
              Customer orders · Order → Allocate → Deliver → Settlement
              <span className="mx-1">·</span>
              {fmtIN(filtered.length)} of {fmtIN(orders.length)} order
              {orders.length === 1 ? "" : "s"} · filtered view
            </div>
          </div>
          <Link to="/outward/new" className="md:hidden">
            <Button size="sm">
              <Plus size={14} />
              New
            </Button>
          </Link>
        </div>

        {/* Focus banner */}
        {focusedOrder && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-vv-md border-[0.5px] border-[var(--vv-acc-bd)] bg-[var(--vv-acc-bg)] px-3 py-2 text-[12px]">
            <Target size={13} className="text-[var(--vv-acc)]" />
            <span className="font-bold text-[var(--vv-acc)]">
              Focused on {focusedOrder.id} · {focusedOrder.customer}
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
        {focusId && !focusedOrder && (
          <div className="mb-3 rounded-vv-md border-[0.5px] border-[var(--vv-am-bd)] bg-[var(--vv-am-bg)] px-3 py-2 text-[11px] text-[var(--vv-am)]">
            Couldn't find order{" "}
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
              <FieldShell label="Order date">
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
                  <Search size={11} />
                  Customer
                </span>
              }
              hint="Substring match across customer names."
            >
              <TextInput
                type="text"
                placeholder="e.g. Annapurna"
                value={filters.customer}
                onChange={(e) => setFilters({ customer: e.target.value })}
              />
            </FieldShell>
          </div>

          {/* Stage chips */}
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
                {fmtIN(stageBaseList.length)}
              </Pill>
            </Chip>
            {ORDER_STAGES.map((s) => (
              <Chip
                key={s}
                active={filters.stage === s}
                onClick={() =>
                  setFilters({ stage: filters.stage === s ? "all" : s })
                }
              >
                <span className="vv-mono">{s}</span>
                <span>{ORDER_STAGE_NAMES[s]}</span>
                <Pill
                  tone={filters.stage === s ? "inverse" : "neutral"}
                  className="vv-mono ml-0.5"
                >
                  {fmtIN(stageCounts[s as OrderStage])}
                </Pill>
              </Chip>
            ))}
          </div>
        </Card>

        {/* KPI strip */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <KpiCard
            label="Orders"
            value={fmtIN(kpi.orders)}
            sub={`${fmtIN(kpi.openOrders)} open · ${fmtIN(kpi.cancelled)} cancelled`}
          />
          <KpiCard
            label="Target KG"
            value={fmtKG(kpi.targetKg)}
            sub={`Allocated ${fmtKG(kpi.allocatedKg)}`}
          />
          <KpiCard
            label="Revenue"
            value={fmtINR(kpi.revenue)}
            sub={
              kpi.targetKg > 0
                ? `Avg ${fmtINR(Math.round(kpi.revenue / kpi.targetKg))}/KG`
                : undefined
            }
            tone="success"
          />
          <KpiCard
            label="Hot deadlines"
            value={fmtIN(kpi.hotDeadlines)}
            sub="≤ 3 days · pre-delivery"
            tone={kpi.hotDeadlines > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Awaiting allocation"
            value={fmtKG(Math.max(0, kpi.targetKg - kpi.allocatedKg))}
            sub="Across open orders"
            tone={kpi.targetKg - kpi.allocatedKg > 0 ? "warning" : "default"}
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
              icon={<PackageCheck size={36} />}
              title="No orders match these filters"
              description="Adjust the date / variety / stage / customer search, or create a new order."
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
            {displayed.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                focused={!!focusedOrder && o.id === focusedOrder.id}
                outerRef={
                  focusedOrder && o.id === focusedOrder.id
                    ? focusedRowRef
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
