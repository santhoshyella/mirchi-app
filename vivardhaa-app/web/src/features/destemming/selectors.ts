import {
  type DestemmingDispatch,
  type DestemmingFilters,
  type DestemmingJob,
  type DestemmingPoint,
  type DestemmingStatus,
  type PurchaseItem,
} from "@/types/domain";

/** Sum of `sentKg` across all dispatches on a job. */
export function totalSentKg(job: DestemmingJob): number {
  return job.dispatches.reduce((s, d) => s + d.sentKg, 0);
}

/** Sum of `sentBags` across all dispatches on a job. */
export function totalSentBags(job: DestemmingJob): number {
  return job.dispatches.reduce((s, d) => s + d.sentBags, 0);
}

/** Sum of stem-free `receivedKg` across stemless and partial dispatches. */
export function totalReceivedKg(job: DestemmingJob): number {
  return job.dispatches
    .filter((d) => d.returnType === "stemless" || d.returnType === "partial")
    .reduce((s, d) => s + (d.receivedKg ?? 0), 0);
}

/** Sum of KG returned WITH stems (re-enters the unallocated pool). */
export function totalReturnedStemKg(job: DestemmingJob): number {
  return job.dispatches
    .filter((d) => d.returnType === "with-stem" || d.returnType === "partial")
    .reduce((s, d) => s + (d.returnedStemKg ?? 0), 0);
}

/** Sum of bags returned WITH stems. */
export function totalReturnedStemBags(job: DestemmingJob): number {
  return job.dispatches
    .filter((d) => d.returnType === "with-stem" || d.returnType === "partial")
    .reduce((s, d) => s + (d.returnedStemBags ?? 0), 0);
}

/**
 * In-flight KG — dispatches that haven't been closed yet (no receivedAt).
 * This is what the team is expecting back from destemming.
 */
export function totalPendingKg(job: DestemmingJob): number {
  return job.dispatches
    .filter((d) => d.receivedAt === undefined)
    .reduce((s, d) => s + d.sentKg, 0);
}

/** In-flight bags — dispatches still open at destemming points. */
export function totalPendingBags(job: DestemmingJob): number {
  return job.dispatches
    .filter((d) => d.receivedAt === undefined)
    .reduce((s, d) => s + d.sentBags, 0);
}

/** Count of dispatches still in flight (no receivedAt). */
export function pendingDispatchCount(job: DestemmingJob): number {
  return job.dispatches.filter((d) => d.receivedAt === undefined).length;
}

/**
 * KG of the lot not yet sent to any point, including stock that came back
 * with stems and re-entered the pool.
 *
 *   unallocatedKg = inputKg − Σ(sentKg) + Σ(returnedStemKg)
 */
export function unallocatedKg(job: DestemmingJob): number {
  return Math.max(0, job.inputKg - totalSentKg(job) + totalReturnedStemKg(job));
}

/**
 * Bags of the lot not yet sent, including bags that came back with stems.
 *
 *   unallocatedBags = inputBags − Σ(sentBags) + Σ(returnedStemBags)
 */
export function unallocatedBags(job: DestemmingJob): number {
  return Math.max(0, job.inputBags - totalSentBags(job) + totalReturnedStemBags(job));
}

/**
 * Yield % across the stemless-returned dispatches only.
 * Null while no stemless receipts exist yet.
 */
export function jobYieldPct(job: DestemmingJob): number | null {
  const withStemless = job.dispatches.filter(
    (d) => d.returnType === "stemless" || d.returnType === "partial"
  );
  if (withStemless.length === 0) return null;
  const sentKg = withStemless.reduce((s, d) => s + d.sentKg, 0);
  if (sentKg === 0) return null;
  const recKg = withStemless.reduce((s, d) => s + (d.receivedKg ?? 0), 0);
  return (recKg / sentKg) * 100;
}

/**
 * The dispatches a row should display given the active point + pointStatus
 * filters. Used by both the row UI (for projection) and `filterJobs` (to
 * drop jobs whose projection is empty).
 *
 * Semantics:
 *  - `point === "all"` → all dispatches.
 *  - `point === "Point A"` → only dispatches at Point A.
 *  - `pointStatus === "in-flight"` → only un-received dispatches.
 *  - `pointStatus === "received"` → only received dispatches.
 *
 * `pointStatus` is honoured even when `point === "all"` so a future "show me
 * everything still in flight" toggle can reuse this; today the UI only
 * surfaces the control once a point is chosen.
 */
export function visibleDispatches(
  job: DestemmingJob,
  point: DestemmingPoint | "all",
  pointStatus: DestemmingFilters["pointStatus"]
): DestemmingDispatch[] {
  let arr = job.dispatches;
  if (point !== "all") arr = arr.filter((d) => d.point === point);
  // "in-flight" = dispatch not yet closed (no receivedAt, regardless of return type)
  // "received"  = dispatch closed (receivedAt set, stemless OR with-stem)
  if (pointStatus === "in-flight")
    arr = arr.filter((d) => d.receivedAt === undefined);
  else if (pointStatus === "received")
    arr = arr.filter((d) => d.receivedAt !== undefined);
  return arr;
}

/**
 * Total destemming cost across all dispatches that have a pricePerKg set.
 *   Σ(sentKg × pricePerKg) for each priced dispatch.
 * Returns null when no dispatch has a price set yet.
 */
export function totalDestemmingCost(job: DestemmingJob): number | null {
  const priced = job.dispatches.filter((d) => d.pricePerKg !== undefined);
  if (priced.length === 0) return null;
  return priced.reduce((s, d) => s + d.sentKg * (d.pricePerKg ?? 0), 0);
}

/** Apply filter bar selections to the raw job list. */
/**
 * Compute the set of destemming-job ids that have moved downstream into a
 * Raasi batch (as a destemming-source). Used by the main Destemming list
 * to hide consumed jobs.
 */
export function consumedDestemmingJobIds(
  raasiBatches: import("@/types/domain").RaasiBatch[]
): Set<string> {
  const out = new Set<string>();
  for (const b of raasiBatches) {
    if (b.sourceType !== "destemming") continue;
    for (const id of b.sourceIds) out.add(id);
  }
  return out;
}

export function filterJobs(
  jobs: DestemmingJob[],
  filters: DestemmingFilters,
  consumed?: {
    raasiBatches?: import("@/types/domain").RaasiBatch[];
  }
): DestemmingJob[] {
  const claimed = consumed?.raasiBatches
    ? consumedDestemmingJobIds(consumed.raasiBatches)
    : null;

  return jobs.filter((j) => {
    if (claimed && claimed.has(j.id)) return false;
    if (filters.dateMode === "single") {
      if (j.date !== filters.singleDate) return false;
    } else if (filters.dateMode === "range") {
      if (j.date < filters.rangeStart || j.date > filters.rangeEnd)
        return false;
    }
    if (filters.variety !== "all" && j.variety !== filters.variety)
      return false;
    if (filters.status !== "all" && j.status !== filters.status) return false;
    // Drop jobs whose projection (point + pointStatus) is empty. When point
    // is "all" this only kicks in if the user combined "all points" with a
    // pointStatus other than "all" (which the UI doesn't currently expose).
    if (filters.point !== "all" || filters.pointStatus !== "all") {
      const visible = visibleDispatches(j, filters.point, filters.pointStatus);
      if (visible.length === 0) return false;
    }
    return true;
  });
}

export interface DestemmingKpiSnapshot {
  jobs: number;
  inputKg: number;
  sentKg: number;
  receivedKg: number;
  /** % yield over the dispatches that have been received. */
  yieldPct: number | null;
  /** Bags still waiting at the godown (not yet sent to a point). */
  pendingBags: number;
  /** KG sent to points but not yet received back. */
  pendingKg: number;
  /** How many dispatches across all jobs are still in flight. */
  pendingDispatches: number;
}

/**
 * Top-of-page totals over the *filtered* list. When `filters` narrows to a
 * specific point, only dispatches at that point (matching pointStatus) feed
 * the totals — so the strip shows what's relevant to the current projection.
 *
 * `inputKg` always means the lot's total input. When projecting we still
 * report it so the operator has a sense of the lot size, but the rest of the
 * KPIs reflect just the projected slice.
 */
export function kpiSnapshot(
  jobs: DestemmingJob[],
  filters?: DestemmingFilters
): DestemmingKpiSnapshot {
  const point = filters?.point ?? "all";
  const pointStatus = filters?.pointStatus ?? "all";
  const projecting = point !== "all" || pointStatus !== "all";

  let inputKg = 0;
  let sentKg = 0;
  let receivedKg = 0;
  let pendingBags = 0;
  let pendingKg = 0;
  let pendingDispatches = 0;
  let receivedSourceKg = 0;
  for (const j of jobs) {
    inputKg += j.inputKg;
    if (!projecting) pendingBags += unallocatedBags(j);
    const dispatches = projecting
      ? visibleDispatches(j, point, pointStatus)
      : j.dispatches;
    for (const d of dispatches) {
      sentKg += d.sentKg;
      if (d.receivedAt !== undefined) {
        // Closed dispatch — stemless and partial both contribute receivedKg / yield
        if (d.returnType === "stemless" || d.returnType === "partial") {
          receivedKg += d.receivedKg ?? 0;
          receivedSourceKg += d.sentKg;
        }
        // with-stem returns go back to pool — not counted as "received" output
      } else {
        pendingKg += d.sentKg;
        pendingDispatches += 1;
      }
    }
  }
  return {
    jobs: jobs.length,
    inputKg,
    sentKg,
    receivedKg,
    yieldPct:
      receivedSourceKg > 0 ? (receivedKg / receivedSourceKg) * 100 : null,
    pendingBags,
    pendingKg,
    pendingDispatches,
  };
}

export function countByStatus(
  jobs: DestemmingJob[]
): Record<DestemmingStatus, number> {
  const out: Record<DestemmingStatus, number> = {
    draft: 0,
    sent: 0,
    partial: 0,
    received: 0,
  };
  for (const j of jobs) out[j.status] += 1;
  return out;
}

/**
 * Purchases at the Accounts stage (currentStage === 6, not rejected) that
 * aren't already claimed by a destemming job OR by a Raasi batch as a
 * purchase-source. A purchase flows down exactly one pipeline — destemming
 * OR direct Raasi — so claims in either downstream block re-claiming.
 */
export function eligiblePurchases(
  purchases: PurchaseItem[],
  existingJobs: DestemmingJob[],
  existingRaasiBatches: import("@/types/domain").RaasiBatch[] = []
): PurchaseItem[] {
  const taken = new Set<string>(existingJobs.map((j) => j.purchaseId));
  for (const b of existingRaasiBatches) {
    if (b.sourceType !== "purchase") continue;
    for (const id of b.sourceIds) taken.add(id);
  }
  return purchases.filter(
    (p) => !taken.has(p.id) && p.currentStage === 6 && !p.isRejected
  );
}
