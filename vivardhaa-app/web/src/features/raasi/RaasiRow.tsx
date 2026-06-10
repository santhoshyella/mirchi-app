import {
  ArrowRight,
  CheckCircle2,
  Package,
  PackageCheck,
  Sun,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { VarietyDot } from "@/components/VarietyDot";
import { fmtId, fmtIN, fmtKG, fmtPct, fmtShortDate } from "@/lib/format";
import {
  RAASI_SOURCE_ICON,
  RAASI_STATUS_LABEL,
  type RaasiBatch,
  VARIETY_COLOR,
} from "@/types/domain";
import { cn } from "@/lib/cn";
import { useRaasiStore } from "./store";
import { batchYieldPct, daysDrying } from "./selectors";

interface Props {
  batch: RaasiBatch;
  className?: string;
  /** Highlight ring + scroll target when navigated to with `?focus=r-XXX`. */
  focused?: boolean;
  /** Ref for the list page to scroll the focused row into view. */
  outerRef?: React.RefObject<HTMLDivElement>;
  /**
   * KG already allocated from this batch to open outward orders. Drives the
   * "Left over" indicator; defaults to 0 if the parent doesn't pass it.
   */
  orderAllocatedKg?: number;
}

const STATUS_TONE: Record<RaasiBatch["status"], "warning" | "success"> = {
  drying: "warning",
  collected: "success",
};

export function RaasiRow({
  batch,
  className,
  focused,
  outerRef,
  orderAllocatedKg = 0,
}: Props) {
  const markCollected = useRaasiStore((s) => s.markCollected);

  const days = daysDrying(batch);
  const yieldPct = batchYieldPct(batch);
  const isDrying = batch.status === "drying";

  // "Left over" — dry output minus what's been allocated to open orders.
  // Only meaningful once the batch is collected; drying batches have no
  // sellable output yet.
  const dryTotal = batch.outputDryKg ?? 0;
  const remainingKg = Math.max(0, dryTotal - orderAllocatedKg);
  const remainingPct = dryTotal > 0 ? (remainingKg / dryTotal) * 100 : 0;
  const showLeftOver = batch.status === "collected" && dryTotal > 0;

  const handleCollect = () => {
    if (typeof window === "undefined") return;
    // Default the prompt to ~88% of the wet KG (typical sun-dry yield).
    const suggested = Math.round(batch.inputWetKg * 0.88);
    const dryStr = window.prompt(
      `Collect this batch from the yard.\n\nWet KG spread: ${fmtKG(
        batch.inputWetKg
      )}\nDays drying: ${days}\n\nDry KG bagged?`,
      String(suggested)
    );
    if (dryStr === null) return;
    const dry = parseFloat(dryStr);
    if (Number.isNaN(dry) || dry <= 0 || dry > batch.inputWetKg) {
      window.alert(
        `Dry KG must be a number between 0 and ${batch.inputWetKg} (the wet weight).`
      );
      return;
    }
    const note = window.prompt("Optional note for the collection:", "") ?? "";
    markCollected(batch.id, dry, note);
  };

  // Source back-links — one per merged source. The base path is the same
  // for every source in a batch (same sourceType across all entries).
  const sourceBasePath =
    batch.sourceType === "purchase" ? "/purchase" : "/destemming";

  return (
    <div
      ref={outerRef}
      className={cn(
        "rounded-vv-md border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)]",
        "flex flex-col gap-2.5 px-3.5 py-3",
        "transition-all hover:border-[var(--vv-bd2)] hover:shadow-sm",
        focused &&
          "ring-2 ring-[var(--vv-acc)] ring-offset-2 ring-offset-[var(--vv-bg1)]",
        className
      )}
      style={{ borderLeft: `3px solid ${VARIETY_COLOR[batch.variety]}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <VarietyDot variety={batch.variety} />
            <span className="truncate text-[12px] font-bold text-[var(--vv-t0)]">
              {batch.shop}
            </span>
          </div>
          <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t2)]">
            Spread {fmtShortDate(batch.spreadDate)} · {batch.variety} ·{" "}
            {batch.type} ·{" "}
            <span className="font-semibold">Mark {batch.mark}</span>{" "}
            <span className="text-[var(--vv-t3)]">·</span>{" "}
            <span>{RAASI_SOURCE_ICON[batch.sourceType]} from </span>
            {batch.sourceIds.length === 0 ? (
              <span>—</span>
            ) : (
              batch.sourceIds.map((id, i) => (
                <span key={id}>
                  <Link
                    to={`${sourceBasePath}?focus=${id}`}
                    title={`Open source ${id}`}
                    className="font-semibold text-[var(--vv-acc)] hover:underline"
                  >
                    {fmtId(id)}
                  </Link>
                  {i < batch.sourceIds.length - 1 ? ", " : null}
                </span>
              ))
            )}
            {batch.sourceIds.length > 0 && (
              <ArrowRight size={9} className="-mt-0.5 ml-0.5 inline" />
            )}
          </div>
        </div>
        <Pill tone={STATUS_TONE[batch.status]} className="flex-shrink-0">
          {batch.status === "drying" ? (
            <Sun size={11} />
          ) : (
            <CheckCircle2 size={11} />
          )}
          {RAASI_STATUS_LABEL[batch.status]}
        </Pill>
      </div>

      {/* Numbers — wet · days drying · dry · yield */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Wet input"
          value={fmtKG(batch.inputWetKg)}
          sub={`${fmtIN(batch.inputBags)} bags`}
        />
        <Metric
          label={isDrying ? "Days on yard" : "Days drying"}
          value={`${days}`}
          sub={
            isDrying
              ? `Since ${fmtShortDate(batch.spreadDate)}`
              : batch.collectedDate
                ? `Collected ${fmtShortDate(batch.collectedDate)}`
                : undefined
          }
          highlight={isDrying}
        />
        <Metric
          label="Dry output"
          value={
            batch.outputDryKg !== undefined ? fmtKG(batch.outputDryKg) : "—"
          }
          sub={isDrying ? "Pending collection" : undefined}
        />
        <Metric
          label="Yield"
          value={yieldPct !== null ? fmtPct(yieldPct, 1) : "—"}
          sub={
            yieldPct !== null
              ? `${fmtKG(Math.max(0, batch.inputWetKg - (batch.outputDryKg ?? 0)))} water lost`
              : isDrying
                ? "Records on collection"
                : undefined
          }
        />
      </div>

      {/* Left over — dry output minus what's been sold to orders. Dry output
          value itself is unchanged; this strip just surfaces the unsold
          remainder. Only rendered for collected batches. */}
      {showLeftOver && (
        <div className="flex flex-col gap-1 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-2.5 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Package
              size={11}
              className={
                remainingKg === 0
                  ? "text-[var(--vv-t3)]"
                  : "text-[var(--vv-acc)]"
              }
            />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
              Left over
            </span>
            <span
              className={
                "vv-mono text-[12px] font-bold " +
                (remainingKg === 0
                  ? "text-[var(--vv-t2)]"
                  : "text-[var(--vv-t0)]")
              }
            >
              {fmtKG(remainingKg)}
            </span>
            <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
              of {fmtKG(dryTotal)} dry
            </span>
            <span className="vv-mono ml-auto text-[10px] text-[var(--vv-t2)]">
              {orderAllocatedKg > 0
                ? `${fmtKG(orderAllocatedKg)} sold (${fmtPct(100 - remainingPct, 0)})`
                : "Nothing sold"}
            </span>
          </div>
          <div className="relative h-[4px] overflow-hidden rounded-full bg-[var(--vv-bg2)]">
            <div
              className="absolute inset-y-0 left-0 bg-[var(--vv-acc)]"
              style={{ width: `${remainingPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Notes timeline (last few) */}
      {batch.notes.length > 0 && (
        <div className="flex flex-col gap-1 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Notes
          </div>
          {batch.notes.slice(-4).map((n, i) => (
            <div
              key={i}
              className="text-[11px] leading-snug text-[var(--vv-t2)]"
            >
              {n.text}
            </div>
          ))}
        </div>
      )}

      {/* Footer action */}
      <div className="flex items-center gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-2.5">
        {isDrying ? (
          <Button
            size="sm"
            variant="soft-primary"
            onClick={handleCollect}
            className="flex-1"
          >
            <PackageCheck size={13} />
            Collect from yard
          </Button>
        ) : (
          <Pill tone="success" className="text-[10px]">
            <Sparkles size={11} />
            Bagged · {yieldPct !== null ? `${fmtPct(yieldPct, 1)} yield` : ""}
          </Pill>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-vv-sm border-[0.5px] border-[var(--vv-am-bd)] bg-[var(--vv-am-bg)] px-2 py-1.5"
          : ""
      }
    >
      <div
        className={
          "text-[9px] font-bold uppercase tracking-wider " +
          (highlight ? "text-[var(--vv-am)]" : "text-[var(--vv-t3)]")
        }
      >
        {label}
      </div>
      <div
        className={
          "vv-mono text-[13px] font-medium " +
          (highlight ? "text-[var(--vv-am)]" : "text-[var(--vv-t0)]")
        }
      >
        {value}
      </div>
      {sub && (
        <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t2)]">
          {sub}
        </div>
      )}
    </div>
  );
}
