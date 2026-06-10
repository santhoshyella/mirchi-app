import {
  type DestemmingJob,
  type PurchaseFilters,
  type PurchaseItem,
  type PurchaseStage,
  type RaasiBatch,
} from "@/types/domain";
import { daysUntil } from "@/lib/format";

// ── Gunny bag cost constants (defaults used when not stored on the item) ──────
export const GUNNY_BAG_DEDUCTION_KG = 1;   // kg deducted per bag from gross weight
export const GUNNY_BAG_RATE = 40;           // ₹ added to bill per bag

/**
 * Compute the true lot cost applying gunny bag adjustments:
 *   netKg  = max(0, grossKg − bags × GUNNY_BAG_DEDUCTION_KG)
 *   cost   = netKg × pricePerKg + bags × GUNNY_BAG_RATE
 */
export function lotCost(item: Pick<PurchaseItem, "kg" | "bags" | "price">): number {
  const kg = item.kg ?? 0;
  const bags = item.bags ?? 0;
  const price = item.price ?? 0;
  const netKg = Math.max(0, kg - bags * GUNNY_BAG_DEDUCTION_KG);
  return netKg * price + bags * GUNNY_BAG_RATE;
}

/**
 * Compute the set of purchase ids that have moved downstream — either into
 * a destemming job, or as the purchase-source of a raasi batch. Used by
 * the main Purchase list to hide consumed lots (they live in their new
 * "form" now). Role queues skip this dedup so workflow visibility is
 * preserved (e.g. Accounts still settles a destemmed lot's payment).
 */
export function consumedPurchaseIds(
  destemmingJobs: DestemmingJob[],
  raasiBatches: RaasiBatch[]
): Set<string> {
  const out = new Set<string>();
  for (const j of destemmingJobs) out.add(j.purchaseId);
  for (const b of raasiBatches) {
    if (b.sourceType !== "purchase") continue;
    for (const id of b.sourceIds) out.add(id);
  }
  return out;
}

/** Apply filter bar selections + the chosen stage chip to the raw item list. */
export function filterItems(
  items: PurchaseItem[],
  filters: PurchaseFilters,
  consumed?: {
    destemmingJobs?: DestemmingJob[];
    raasiBatches?: RaasiBatch[];
  }
): PurchaseItem[] {
  // A purchase that's been pulled into destemming OR raasi has moved on —
  // hide it from this list. Caller passes the upstream stores when this
  // dedup is wanted (main Purchase list); role queues pass nothing.
  const claimed = consumed
    ? consumedPurchaseIds(
        consumed.destemmingJobs ?? [],
        consumed.raasiBatches ?? []
      )
    : null;

  return items.filter((it) => {
    if (claimed && claimed.has(it.id)) return false;
    // date filter — "all" bypasses entirely
    if (filters.dateMode === "single") {
      if (it.date !== filters.singleDate) return false;
    } else if (filters.dateMode === "range") {
      if (it.date < filters.rangeStart || it.date > filters.rangeEnd)
        return false;
    }
    // variety filter
    if (filters.variety !== "all" && it.variety !== filters.variety)
      return false;
    // shop filter
    if (filters.shop && it.shop !== filters.shop) return false;
    // stage filter
    if (filters.stage !== "all" && it.currentStage !== filters.stage)
      return false;
    // dispatch-window filter — only items dispatched within N days (or already
    // overdue, since those are the most urgent to move).
    if (filters.dispatchWithinDays !== "all") {
      const d = daysUntil(it.dispatchDeadline);
      if (d === null) return false;
      if (d > filters.dispatchWithinDays) return false;
    }
    return true;
  });
}

/** Items grouped by stage 1-6. */
export function countByStage(
  items: PurchaseItem[]
): Record<PurchaseStage, number> {
  const out: Record<PurchaseStage, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };
  for (const it of items) out[it.currentStage] += 1;
  return out;
}

/**
 * Purchase *groups* counted by stage. A group's stage is determined by its
 * representative lot — the first non-rejected, non-settled lot, falling back
 * to the first lot if all are rejected/settled. This matches the stage badge
 * shown on each PurchaseGroupCard.
 */
export function countGroupsByStage(
  groups: PurchaseGroup[]
): Record<PurchaseStage, number> {
  const out: Record<PurchaseStage, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };
  for (const g of groups) {
    const rep =
      g.items.find((i) => !i.isRejected && i.accountsStatus !== "settled") ??
      g.items[0];
    if (rep) out[rep.currentStage] += 1;
  }
  return out;
}

export interface KpiSnapshot {
  totalBags: number;
  totalKg: number;
  totalValue: number;
  rejectedBags: number;
  acceptedBags: number;
}

/**
 * Top-of-page totals — over the *filtered* list. Rejected items contribute
 * to `rejectedBags` only; they're excluded from totalBags / totalKg /
 * totalValue since their value didn't actually flow into the business.
 */
export function kpiSnapshot(items: PurchaseItem[]): KpiSnapshot {
  let totalBags = 0;
  let totalKg = 0;
  let totalValue = 0;
  let rejectedBags = 0;
  for (const it of items) {
    if (it.isRejected) {
      rejectedBags += it.bags;
      continue;
    }
    totalBags += it.bags;
    totalKg += it.kg;
    totalValue += lotCost(it);
  }
  return {
    totalBags,
    totalKg,
    totalValue,
    rejectedBags,
    // Non-rejected bag count — kept as a named alias so existing call sites
    // don't need to change. After the skip-rejected refactor it's identical
    // to totalBags, but the two names communicate intent.
    acceptedBags: totalBags,
  };
}

// ── Hierarchical grouping ─────────────────────────────────────────────────────

export interface VarietyGroup {
  variety: string;
  items: PurchaseItem[];
  totalBags: number;
  totalKg: number;
  totalValue: number;
}

export interface PurchaseGroup {
  /** Stable key for React — null-byte separated to avoid collision with user strings. */
  key: string;
  date: string;
  sourceType: string;
  shop: string;
  items: PurchaseItem[];
  varietyGroups: VarietyGroup[];
  totalLots: number;
  totalBags: number;
  totalKg: number;
  totalValue: number;
  /** Sorted unique stages present in this group. */
  stages: PurchaseStage[];
  /** True when this group contains the ?focus= lot. */
  isFocused: boolean;
  /** The specific lot id that is focused, if any. */
  focusedId?: string;
  /** Earliest createdAt across all lots — used for sort. */
  createdAt: string;
}

/**
 * Group a flat list of PurchaseItems into PurchaseGroups keyed by
 * (date, sourceType, shop). The focused group (if any) is sorted first;
 * within that, groups sort by date desc then createdAt desc.
 */
export function groupPurchases(
  items: PurchaseItem[],
  focusId?: string | null,
): PurchaseGroup[] {
  // Build map: null-byte-key → { meta, lots }
  const map = new Map<string, { date: string; sourceType: string; shop: string; lots: PurchaseItem[] }>();

  for (const item of items) {
    // Use \0 (null byte) as a separator — impossible in any user-entered string.
    const key = `${item.date}\0${item.sourceType}\0${item.shop ?? ""}`;
    if (!map.has(key)) {
      map.set(key, { date: item.date, sourceType: item.sourceType, shop: item.shop ?? "", lots: [] });
    }
    map.get(key)!.lots.push(item);
  }

  const groups: PurchaseGroup[] = [];

  for (const [key, { date, sourceType, shop, lots }] of map) {
    // Group lots by variety, preserving insertion order
    const varMap = new Map<string, PurchaseItem[]>();
    for (const lot of lots) {
      if (!varMap.has(lot.variety)) varMap.set(lot.variety, []);
      varMap.get(lot.variety)!.push(lot);
    }
    const varietyGroups: VarietyGroup[] = [...varMap.entries()].map(([variety, vitems]) => ({
      variety,
      items: vitems,
      totalBags: vitems.reduce((s, i) => s + (i.bags ?? 0), 0),
      totalKg: vitems.reduce((s, i) => s + (i.kg ?? 0), 0),
      totalValue: vitems.reduce((s, i) => s + lotCost(i), 0),
    }));

    const focusedLot = focusId ? lots.find(i => i.id === focusId) : undefined;
    const earliest = lots.reduce(
      (min, i) => (i.createdAt < min ? i.createdAt : min),
      lots[0].createdAt,
    );
    const stageSet = new Set(lots.map(i => i.currentStage));

    groups.push({
      key,
      date,
      sourceType,
      shop,
      items: lots,
      varietyGroups,
      totalLots: lots.length,
      totalBags: lots.reduce((s, i) => s + (i.bags ?? 0), 0),
      totalKg: lots.reduce((s, i) => s + (i.kg ?? 0), 0),
      totalValue: lots.reduce((s, i) => s + lotCost(i), 0),
      stages: [...stageSet].sort((a, b) => a - b) as PurchaseStage[],
      isFocused: !!focusedLot,
      focusedId: focusedLot?.id,
      createdAt: earliest,
    });
  }

  // Focused group first → newest date → newest createdAt
  groups.sort((a, b) => {
    if (a.isFocused !== b.isFocused) return a.isFocused ? -1 : 1;
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return groups;
}
