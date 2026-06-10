import {
  type DestemmingJob,
  type PurchaseItem,
  type RaasiBatch,
  type RaasiFilters,
  type RaasiStatus,
} from "@/types/domain";
import { daysUntil } from "@/lib/format";

/** Days the batch has been drying — today minus spread date for in-progress
 *  batches, collected−spread for finished ones. Returns 0 if dates are odd. */
export function daysDrying(b: RaasiBatch): number {
  const start = new Date(b.spreadDate);
  if (Number.isNaN(start.getTime())) return 0;
  const end = b.collectedDate ? new Date(b.collectedDate) : new Date();
  if (Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/** Yield % = dry KG / wet KG × 100. Null while still drying. */
export function batchYieldPct(b: RaasiBatch): number | null {
  if (b.outputDryKg === undefined || b.inputWetKg <= 0) return null;
  return (b.outputDryKg / b.inputWetKg) * 100;
}

/** Apply filter bar selections to the raw batch list. */
export function filterBatches(
  batches: RaasiBatch[],
  filters: RaasiFilters
): RaasiBatch[] {
  return batches.filter((b) => {
    // Date filter applies to the "spread date" — operationally that's when
    // the batch first hit the yard.
    if (filters.dateMode === "single") {
      if (b.spreadDate !== filters.singleDate) return false;
    } else if (filters.dateMode === "range") {
      if (b.spreadDate < filters.rangeStart || b.spreadDate > filters.rangeEnd)
        return false;
    }
    if (filters.variety !== "all" && b.variety !== filters.variety)
      return false;
    if (filters.status !== "all" && b.status !== filters.status) return false;
    if (filters.sourceType !== "all" && b.sourceType !== filters.sourceType)
      return false;
    return true;
  });
}

export interface RaasiKpiSnapshot {
  batches: number;
  drying: number;
  collected: number;
  /** Total wet KG across all batches in the filtered set. */
  totalWetKg: number;
  /** Total dry KG across collected batches. */
  totalDryKg: number;
  /** Yield % across collected batches (dry / wet of those batches). */
  yieldPct: number | null;
  /** Wet KG currently sitting on the yard (status = drying). */
  onYardKg: number;
  /** Bags currently sitting on the yard. */
  onYardBags: number;
  /** Average days drying for batches still on the yard. */
  avgDaysDrying: number | null;
}

/** Top-of-page totals over the filtered list. */
export function kpiSnapshot(batches: RaasiBatch[]): RaasiKpiSnapshot {
  let drying = 0;
  let collected = 0;
  let totalWetKg = 0;
  let totalDryKg = 0;
  let dryFromKg = 0;
  let onYardKg = 0;
  let onYardBags = 0;
  let dryDaysSum = 0;
  let dryDaysCount = 0;
  for (const b of batches) {
    totalWetKg += b.inputWetKg;
    if (b.status === "drying") {
      drying += 1;
      onYardKg += b.inputWetKg;
      onYardBags += b.inputBags;
      dryDaysSum += daysDrying(b);
      dryDaysCount += 1;
    } else {
      collected += 1;
      if (b.outputDryKg !== undefined) {
        totalDryKg += b.outputDryKg;
        dryFromKg += b.inputWetKg;
      }
    }
  }
  return {
    batches: batches.length,
    drying,
    collected,
    totalWetKg,
    totalDryKg,
    yieldPct: dryFromKg > 0 ? (totalDryKg / dryFromKg) * 100 : null,
    onYardKg,
    onYardBags,
    avgDaysDrying: dryDaysCount > 0 ? dryDaysSum / dryDaysCount : null,
  };
}

export function countByStatus(
  batches: RaasiBatch[]
): Record<RaasiStatus, number> {
  const out: Record<RaasiStatus, number> = { drying: 0, collected: 0 };
  for (const b of batches) out[b.status] += 1;
  return out;
}

/**
 * Purchases at the Accounts stage (currentStage === 6, not rejected) that
 * aren't already claimed by a Raasi batch or a destemming job. The
 * destination field used to gate eligibility, but the operator can now
 * route any Accounts-stage purchase to Raasi directly. Mutual exclusion
 * with Destemming holds: a purchase can only flow down one pipeline.
 */
export function eligiblePurchases(
  purchases: PurchaseItem[],
  existingBatches: RaasiBatch[],
  existingDestemmingJobs: DestemmingJob[] = []
): PurchaseItem[] {
  const taken = new Set<string>();
  for (const b of existingBatches) {
    if (b.sourceType !== "purchase") continue;
    for (const id of b.sourceIds) taken.add(id);
  }
  for (const j of existingDestemmingJobs) taken.add(j.purchaseId);
  return purchases.filter(
    (p) => !taken.has(p.id) && p.currentStage === 6 && !p.isRejected
  );
}

/**
 * Destemming jobs that have been fully received and don't yet appear in any
 * Raasi batch's `sourceIds`. Same one-batch-per-source rule as purchases.
 */
export function eligibleDestemmingJobs(
  jobs: DestemmingJob[],
  existingBatches: RaasiBatch[]
): DestemmingJob[] {
  const taken = new Set<string>();
  for (const b of existingBatches) {
    if (b.sourceType !== "destemming") continue;
    for (const id of b.sourceIds) taken.add(id);
  }
  return jobs.filter((j) => !taken.has(j.id) && j.status === "received");
}

/** True if a deadline is today or in the past — used by callers that want to
 *  surface "drying past target" rows. Currently unused; here for symmetry
 *  with the other selector files. */
export function isOverdue(iso: string | undefined | null): boolean {
  const d = daysUntil(iso);
  return d !== null && d <= 0;
}
