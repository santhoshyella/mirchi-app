import {
  type DestemmingJob,
  type Mark,
  type Order,
  type OrderFilters,
  type OrderSourceKind,
  type OrderStage,
  type PurchaseItem,
  type RaasiBatch,
  type Variety,
} from "@/types/domain";
import { totalReceivedKg } from "@/features/destemming/selectors";

/** Sum of allocated KG across an order's lots. */
export function totalAllocatedKg(order: Order): number {
  return order.allocations.reduce((s, a) => s + a.allocatedKg, 0);
}

/**
 * Index of total allocated KG by source lot — built once and shared with
 * the upstream list pages so each row can compute its "left over" without
 * re-scanning every order's allocations. Cancelled orders don't count
 * (their stock is "returned" to the lot).
 *
 * Key shape: "${sourceKind}::${sourceId}" e.g. "raasi::r-002".
 */
export function allocationsBySource(orders: Order[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of orders) {
    if (o.isCancelled) continue;
    for (const a of o.allocations) {
      const k = `${a.sourceKind}::${a.sourceId}`;
      m.set(k, (m.get(k) ?? 0) + a.allocatedKg);
    }
  }
  return m;
}

/** KG still needed before the order is fully allocated. */
export function remainingTargetKg(order: Order): number {
  return Math.max(0, order.targetKg - totalAllocatedKg(order));
}

/** Order ↔ inventory progress: % of target that's been allocated. */
export function allocationPct(order: Order): number {
  if (order.targetKg <= 0) return 0;
  return Math.min(100, (totalAllocatedKg(order) / order.targetKg) * 100);
}

/** Apply filter bar selections + customer search to the raw order list. */
export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const cust = filters.customer.trim().toLowerCase();
  return orders.filter((o) => {
    if (filters.dateMode === "single") {
      if (o.date !== filters.singleDate) return false;
    } else if (filters.dateMode === "range") {
      if (o.date < filters.rangeStart || o.date > filters.rangeEnd)
        return false;
    }
    if (filters.variety !== "all" && o.variety !== filters.variety)
      return false;
    if (filters.stage !== "all" && o.currentStage !== filters.stage)
      return false;
    if (cust && !o.customer.toLowerCase().includes(cust)) return false;
    return true;
  });
}

export function countByStage(orders: Order[]): Record<OrderStage, number> {
  const out: Record<OrderStage, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const o of orders) out[o.currentStage] += 1;
  return out;
}

export interface OrderKpiSnapshot {
  orders: number;
  openOrders: number;
  targetKg: number;
  allocatedKg: number;
  revenue: number;
  /** Orders whose deliveryDeadline is within 3 days or already past. */
  hotDeadlines: number;
  cancelled: number;
}

export function kpiSnapshot(orders: Order[]): OrderKpiSnapshot {
  let openOrders = 0;
  let targetKg = 0;
  let allocatedKg = 0;
  let revenue = 0;
  let hotDeadlines = 0;
  let cancelled = 0;
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  for (const o of orders) {
    // Cancelled orders are counted (so the operator can see how many were
    // cancelled), but their KG / revenue don't flow into the totals — they
    // didn't actually transact.
    if (o.isCancelled) {
      cancelled += 1;
      continue;
    }
    targetKg += o.targetKg;
    allocatedKg += totalAllocatedKg(o);
    revenue += o.targetKg * o.pricePerKg;
    // Open = pre-settlement stage OR Stage 4 with settledAt still unset.
    // Reaching Stage 4 alone isn't terminal.
    if (o.currentStage < 4 || !o.settledAt) openOrders += 1;
    if (
      o.deliveryDeadline &&
      o.currentStage < 4 &&
      new Date(o.deliveryDeadline).getTime() - now <= threeDaysMs
    ) {
      hotDeadlines += 1;
    }
  }
  return {
    orders: orders.length,
    openOrders,
    targetKg,
    allocatedKg,
    revenue,
    hotDeadlines,
    cancelled,
  };
}

/**
 * Unified inventory row — describes a slice of physical stock available to
 * allocate to an outward order. The same shape is used by the new-order
 * form and by the per-row allocation dialogs.
 */
export interface InventoryLot {
  sourceKind: OrderSourceKind;
  /** ID of the upstream record (e.g. "p-007", "d-005", "r-002"). */
  sourceId: string;
  shop: string;
  variety: Variety;
  type: string;
  mark: Mark;
  /** Total KG the lot represents. */
  totalKg: number;
  /** KG already allocated across all orders. */
  allocatedKg: number;
  /** totalKg - allocatedKg. Available to draw. */
  remainingKg: number;
}

/**
 * Roll Purchases / Destemming jobs / Raasi batches into a single inventory
 * list. Rules:
 *  - Raasi batches in status "collected" → outputDryKg
 *  - Destemming jobs in status "received" NOT in any Raasi batch → totalReceivedKg
 *  - Purchases at stage 6 NOT in destemming AND NOT in any Raasi batch → kg
 *  - Subtract already-allocated KG from existing orders that reference the lot
 */
export function availableInventory(
  purchases: PurchaseItem[],
  destemmingJobs: DestemmingJob[],
  raasiBatches: RaasiBatch[],
  orders: Order[]
): InventoryLot[] {
  // Pre-compute what's "claimed" by downstream processing so a purchase
  // that's already in destemming or raasi doesn't double-count.
  const purchaseClaimedByDestemming = new Set(
    destemmingJobs.map((j) => j.purchaseId)
  );
  const purchaseClaimedByRaasi = new Set<string>();
  const destemmingClaimedByRaasi = new Set<string>();
  for (const b of raasiBatches) {
    if (b.sourceType === "purchase") {
      for (const id of b.sourceIds) purchaseClaimedByRaasi.add(id);
    } else {
      for (const id of b.sourceIds) destemmingClaimedByRaasi.add(id);
    }
  }

  // Sum of KG already allocated per (sourceKind, sourceId) across all orders.
  const allocByKey = new Map<string, number>();
  const key = (kind: OrderSourceKind, id: string) => `${kind}::${id}`;
  for (const o of orders) {
    if (o.isCancelled) continue;
    for (const a of o.allocations) {
      const k = key(a.sourceKind, a.sourceId);
      allocByKey.set(k, (allocByKey.get(k) ?? 0) + a.allocatedKg);
    }
  }

  const out: InventoryLot[] = [];

  // 1. Raasi collected batches
  for (const b of raasiBatches) {
    if (b.status !== "collected" || b.outputDryKg === undefined) continue;
    const allocated = allocByKey.get(key("raasi", b.id)) ?? 0;
    const remaining = b.outputDryKg - allocated;
    if (remaining <= 0) continue;
    out.push({
      sourceKind: "raasi",
      sourceId: b.id,
      shop: b.shop,
      variety: b.variety,
      type: b.type,
      mark: b.mark,
      totalKg: b.outputDryKg,
      allocatedKg: allocated,
      remainingKg: remaining,
    });
  }

  // 2. Destemming received jobs not in any Raasi batch
  for (const j of destemmingJobs) {
    if (j.status !== "received") continue;
    if (destemmingClaimedByRaasi.has(j.id)) continue;
    const total = totalReceivedKg(j);
    if (total <= 0) continue;
    const allocated = allocByKey.get(key("destemming", j.id)) ?? 0;
    const remaining = total - allocated;
    if (remaining <= 0) continue;
    out.push({
      sourceKind: "destemming",
      sourceId: j.id,
      shop: j.shop,
      variety: j.variety,
      type: j.type,
      mark: j.mark,
      totalKg: total,
      allocatedKg: allocated,
      remainingKg: remaining,
    });
  }

  // 3. Stage-6 purchases not in destemming AND not in Raasi
  for (const p of purchases) {
    if (p.isRejected) continue;
    if (p.currentStage !== 6) continue;
    if (purchaseClaimedByDestemming.has(p.id)) continue;
    if (purchaseClaimedByRaasi.has(p.id)) continue;
    const allocated = allocByKey.get(key("purchase", p.id)) ?? 0;
    const remaining = p.kg - allocated;
    if (remaining <= 0) continue;
    out.push({
      sourceKind: "purchase",
      sourceId: p.id,
      shop: p.shop,
      variety: p.variety,
      type: p.type,
      mark: p.mark,
      totalKg: p.kg,
      allocatedKg: allocated,
      remainingKg: remaining,
    });
  }

  return out;
}
