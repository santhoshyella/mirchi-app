import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
  Package,
  Send,
  Sparkles,
  StickyNote,
  Sun,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { VarietyDot } from "@/components/VarietyDot";
import {
  fmtId,
  fmtIN,
  fmtINR,
  fmtKG,
  fmtPct,
  fmtDateTime,
} from "@/lib/format";
import {
  DESTEMMING_POINTS,
  DESTEMMING_POINT_COLOR,
  DESTEMMING_POINT_ICON,
  DESTEMMING_STATUS_LABEL,
  DESTINATION_ICON,
  type DestemmingDispatch,
  type DestemmingJob,
  type DestemmingPoint,
  VARIETY_COLOR,
} from "@/types/domain";
import { cn } from "@/lib/cn";
import { useDestemmingStore } from "./store";
import {
  totalDestemmingCost,
  totalReceivedKg,
  unallocatedBags,
  unallocatedKg,
  visibleDispatches,
} from "./selectors";

interface Props {
  job: DestemmingJob;
  className?: string;
  /** Highlight ring + scroll target when navigated to with `?focus=d-XXX`. */
  focused?: boolean;
  /** Ref for the list page to scroll the focused row into view. */
  outerRef?: React.RefObject<HTMLDivElement>;
  /**
   * If a Raasi batch was created from this destemming job, its id. Triggers
   * a "Raasi · r-XXX →" pill linking into the Raasi list focused on that
   * batch.
   */
  linkedRaasiBatchId?: string;
  /**
   * KG already allocated from this destemming job to open outward orders.
   * Drives the "Left over" indicator. Defaults to 0.
   */
  orderAllocatedKg?: number;
}

interface SendForm {
  point: DestemmingPoint;
  bags: string;
  kg: string;
  pricePerKg: string;
  shortagePct: string;
  bagWeightKg: string;
  note: string;
}

interface ReceiveForm {
  receivedKg: string;
  returnedStemKg: string;
  returnedStemBags: string;
  note: string;
}


const STATUS_TONE: Record<
  DestemmingJob["status"],
  "neutral" | "info" | "warning" | "success"
> = {
  draft: "neutral",
  sent: "info",
  partial: "warning",
  received: "success",
};

export function DestemmingRow({
  job,
  className,
  focused,
  outerRef,
  linkedRaasiBatchId,
  orderAllocatedKg = 0,
}: Props) {
  const sendToPoint = useDestemmingStore((s) => s.sendToPoint);
  const receiveFromPoint = useDestemmingStore((s) => s.receiveFromPoint);
  const filterPoint = useDestemmingStore((s) => s.filters.point);
  const filterPointStatus = useDestemmingStore((s) => s.filters.pointStatus);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState<SendForm>({
    point: DESTEMMING_POINTS[0],
    bags: "",
    kg: "",
    pricePerKg: "",
    shortagePct: "",
    bagWeightKg: "1.5",
    note: "",
  });
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [receiveOpenId, setReceiveOpenId] = useState<string | null>(null);
  const [receiveForm, setReceiveForm] = useState<ReceiveForm>({
    receivedKg: "",
    returnedStemKg: "",
    returnedStemBags: "",
    note: "",
  });
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Whenever the operator narrows by point (and/or status at that point), we
  // project the row to JUST those dispatches.
  const projecting = filterPoint !== "all" || filterPointStatus !== "all";
  const visible = visibleDispatches(job, filterPoint, filterPointStatus);

  const sentKg = visible.reduce((s, d) => s + d.sentKg, 0);
  const sentBags = visible.reduce((s, d) => s + d.sentBags, 0);
  // receivedKg / yield only count stemless-returned dispatches
  const receivedKg = visible
    .filter((d) => d.returnType === "stemless" || d.returnType === "partial")
    .reduce((s, d) => s + (d.receivedKg ?? 0), 0);
  const pendingKg = visible
    .filter((d) => d.receivedAt === undefined)
    .reduce((s, d) => s + d.sentKg, 0);
  const pendingBags = visible
    .filter((d) => d.receivedAt === undefined)
    .reduce((s, d) => s + d.sentBags, 0);
  const pendingPoints = visible.filter(
    (d) => d.receivedAt === undefined
  ).length;

  // Yield is over stemless-received dispatches only
  const receivedSourceKg = visible
    .filter((d) => (d.returnType === "stemless" || d.returnType === "partial") && d.receivedAt !== undefined)
    .reduce((s, d) => s + d.sentKg, 0);
  const yieldPct =
    receivedSourceKg > 0 ? (receivedKg / receivedSourceKg) * 100 : null;

  const unKg = unallocatedKg(job);
  const unBags = unallocatedBags(job);
  const sourceValue = job.inputKg * job.sourcePricePerKg;
  const destemmingCost = totalDestemmingCost(job);

  const barDenominator = projecting ? sentKg : job.inputKg;
  const sentPct =
    barDenominator > 0 ? Math.min(100, (sentKg / barDenominator) * 100) : 0;
  const receivedPct =
    barDenominator > 0 ? Math.min(100, (receivedKg / barDenominator) * 100) : 0;

  // ── Send form handlers ──────────────────────────────────────────────────

  const openSend = () => {
    setSendForm({
      point: DESTEMMING_POINTS[0],
      bags: unBags > 0 ? String(unBags) : "",
      kg: unKg > 0 ? String(unKg) : "",
      pricePerKg: "",
      shortagePct: "",
      bagWeightKg: "1.5",
      note: "",
    });
    setSendError(null);
    setSendOpen(true);
  };

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bags = parseInt(sendForm.bags, 10);
    const kg = parseFloat(sendForm.kg);
    if (Number.isNaN(bags) || bags <= 0) {
      setSendError("Bags must be a positive whole number.");
      return;
    }
    if (bags > unBags) {
      setSendError(`Max ${unBags} unallocated bags.`);
      return;
    }
    if (Number.isNaN(kg) || kg <= 0) {
      setSendError("KG must be a positive number.");
      return;
    }
    if (kg > unKg + 0.001) {
      setSendError(`Max ${fmtKG(unKg)} unallocated.`);
      return;
    }
    const pricePerKg = parseFloat(sendForm.pricePerKg);
    if (sendForm.pricePerKg === "" || Number.isNaN(pricePerKg) || pricePerKg < 0) {
      setSendError("Destemming price is required and must be ≥ 0.");
      return;
    }
    const shortagePct = sendForm.shortagePct !== "" ? parseFloat(sendForm.shortagePct) : undefined;
    const bagWeightKg = sendForm.bagWeightKg !== "" ? parseFloat(sendForm.bagWeightKg) : undefined;
    setSendLoading(true);
    setSendError(null);
    await sendToPoint(job.id, sendForm.point, bags, kg, pricePerKg, shortagePct, bagWeightKg, sendForm.note || undefined);
    setSendLoading(false);
    setSendOpen(false);
  };

  // ── Receive form handlers ───────────────────────────────────────────────

  const openReceive = (d: DestemmingDispatch) => {
    setReceiveForm({
      receivedKg: "",
      returnedStemKg: "",
      returnedStemBags: "",
      note: "",
    });
    setReceiveError(null);
    setReceiveOpenId(d.id);
  };

  const handleReceiveSubmit = async (
    e: React.FormEvent,
    dispatch: DestemmingDispatch
  ) => {
    e.preventDefault();
    const recKg = receiveForm.receivedKg !== "" ? parseFloat(receiveForm.receivedKg) : undefined;
    const stemKg = receiveForm.returnedStemKg !== "" ? parseFloat(receiveForm.returnedStemKg) : undefined;
    const stemBags = receiveForm.returnedStemBags !== "" ? parseInt(receiveForm.returnedStemBags, 10) : undefined;

    if (recKg === undefined && stemKg === undefined) {
      setReceiveError("Enter at least one: destemmed KG or returned-with-stems KG.");
      return;
    }
    if (recKg !== undefined && (Number.isNaN(recKg) || recKg < 0)) {
      setReceiveError("Destemmed KG must be ≥ 0.");
      return;
    }
    if (recKg !== undefined && recKg > dispatch.sentKg + 0.001) {
      setReceiveError(`Destemmed KG cannot exceed sent weight of ${fmtKG(dispatch.sentKg)}.`);
      return;
    }
    if (stemKg !== undefined && (Number.isNaN(stemKg) || stemKg < 0)) {
      setReceiveError("Returned KG must be ≥ 0.");
      return;
    }
    if (stemKg !== undefined && stemKg > dispatch.sentKg + 0.001) {
      setReceiveError(`Returned KG cannot exceed sent weight of ${fmtKG(dispatch.sentKg)}.`);
      return;
    }
    if (stemBags !== undefined && (Number.isNaN(stemBags) || stemBags < 0)) {
      setReceiveError("Returned bags must be ≥ 0.");
      return;
    }
    setReceiveLoading(true);
    setReceiveError(null);
    await receiveFromPoint(job.id, dispatch.id, {
      receivedKg: recKg,
      returnedStemKg: stemKg,
      returnedStemBags: stemBags,
      note: receiveForm.note || undefined,
    });
    setReceiveLoading(false);
    setReceiveOpenId(null);
  };

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
      style={{ borderLeft: `3px solid ${VARIETY_COLOR[job.variety]}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <VarietyDot variety={job.variety} />
            <span className="truncate text-[12px] font-bold text-[var(--vv-t0)]">
              {job.shop}
            </span>
          </div>
          <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t2)]">
            {fmtDateTime(job.createdAt)} · {job.variety} · {job.type} ·{" "}
            <span className="font-semibold">Mark {job.mark}</span>{" "}
            <span className="text-[var(--vv-t3)]">·</span>{" "}
            <span title={`Currently sitting at ${job.destination}`}>
              {DESTINATION_ICON[job.destination]} {job.destination}
            </span>{" "}
            <span className="text-[var(--vv-t3)]">·</span>{" "}
            <Link
              to={`/purchase?focus=${job.purchaseId}`}
              title={`Open source purchase ${job.purchaseId}`}
              className="font-semibold text-[var(--vv-acc)] hover:underline"
            >
              from {fmtId(job.purchaseId)}
              <ArrowRight size={9} className="-mt-0.5 ml-0.5 inline" />
            </Link>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <Pill tone={STATUS_TONE[job.status]}>
            {job.status === "received" && <CheckCircle2 size={11} />}
            {job.status === "partial" && <Clock size={11} />}
            {job.status === "sent" && <Send size={11} />}
            {job.status === "draft" && <StickyNote size={11} />}
            {DESTEMMING_STATUS_LABEL[job.status]}
          </Pill>
          {linkedRaasiBatchId && (
            <Link
              to={`/raasi?focus=${linkedRaasiBatchId}`}
              title={`Open Raasi batch ${linkedRaasiBatchId}`}
              className="inline-flex"
            >
              <Pill
                tone="warning"
                className="text-[9px] hover:bg-[var(--vv-am)] hover:text-white"
              >
                <Sun size={10} />
                Raasi · {fmtId(linkedRaasiBatchId)}
                <ArrowRight size={9} />
              </Pill>
            </Link>
          )}
        </div>
      </div>

      {/* Numbers — Input → Sent → To receive → Destemmed */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label={projecting ? "Lot total" : "Input"}
          value={fmtKG(job.inputKg)}
          sub={`${fmtIN(job.inputBags)} bags`}
        />
        <Metric
          label={
            projecting && filterPoint !== "all"
              ? `Sent · ${filterPoint}`
              : "Sent"
          }
          value={fmtKG(sentKg)}
          sub={
            projecting
              ? `${fmtIN(sentBags)} bag${sentBags === 1 ? "" : "s"}`
              : `${fmtIN(sentBags)} of ${fmtIN(job.inputBags)} bags`
          }
        />
        <Metric
          label="To receive"
          value={pendingKg > 0 ? fmtKG(pendingKg) : "—"}
          sub={
            pendingKg > 0
              ? projecting
                ? `${fmtIN(pendingBags)} bags · ${pendingPoints} dispatch${
                    pendingPoints === 1 ? "" : "es"
                  }`
                : `${fmtIN(pendingBags)} bags · ${pendingPoints} point${
                    pendingPoints === 1 ? "" : "s"
                  }`
              : sentKg === 0
                ? "No dispatches yet"
                : "All received"
          }
          highlight={pendingKg > 0}
        />
        <Metric
          label="Destemmed"
          value={receivedKg > 0 ? fmtKG(receivedKg) : "—"}
          sub={
            yieldPct !== null
              ? `Yield ${fmtPct(yieldPct, 1)}`
              : projecting
                ? "No receipts at this point"
                : `Lot value ${fmtINR(sourceValue)}`
          }
        />
      </div>

      {/* Allocation bar */}
      <div className="flex flex-col gap-1">
        <div className="relative h-[6px] overflow-hidden rounded-full bg-[var(--vv-bg2)]">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--vv-acc)]"
            style={{ width: `${sentPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-[var(--vv-suc)]"
            style={{ width: `${receivedPct}%` }}
          />
        </div>
        <div className="vv-mono flex flex-wrap items-center justify-between gap-x-2 text-[10px] text-[var(--vv-t2)]">
          <span>
            {fmtKG(receivedKg)} destemmed
            {pendingKg > 0 && (
              <>
                <span className="text-[var(--vv-t3)]"> · </span>
                <span className="font-bold text-[var(--vv-am)]">
                  {fmtKG(pendingKg)} to receive
                </span>
              </>
            )}
            <span className="text-[var(--vv-t3)]"> · </span>
            {fmtKG(sentKg)} sent
            {projecting && filterPoint !== "all" && (
              <span className="text-[var(--vv-t3)]"> at {filterPoint}</span>
            )}
          </span>
          <span>
            {unKg > 0
              ? `${fmtKG(unKg)} unallocated · ${fmtIN(unBags)} bags`
              : "Fully allocated"}
          </span>
        </div>
      </div>

      {/* Destemming cost summary */}
      {destemmingCost !== null && (
        <div className="vv-mono flex flex-col gap-1 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-2.5 py-1.5 text-[10px]">
          {/* Per-point rows */}
          {job.dispatches
            .filter((d) => d.pricePerKg !== undefined)
            .map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <span style={{ color: DESTEMMING_POINT_COLOR[d.point] }}>
                  {DESTEMMING_POINT_ICON[d.point]}
                </span>
                <span className="text-[var(--vv-t2)]">{d.point}</span>
                <span className="text-[var(--vv-t3)]">
                  {fmtKG(d.sentKg)} × {fmtINR(d.pricePerKg!)}/KG
                </span>
                <span className="ml-auto font-semibold text-[var(--vv-t1)]">
                  {fmtINR(Math.round(d.sentKg * d.pricePerKg!))}
                </span>
              </div>
            ))}
          {/* Total row */}
          <div className="flex items-center gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
              Total destemming cost
            </span>
            {job.dispatches.filter((d) => d.pricePerKg !== undefined).length <
              job.dispatches.length && (
              <span className="text-[var(--vv-t3)]">
                ({job.dispatches.filter((d) => d.pricePerKg !== undefined).length}/
                {job.dispatches.length} priced)
              </span>
            )}
            <span className="ml-auto font-bold text-[var(--vv-t0)]">
              {fmtINR(Math.round(destemmingCost))}
            </span>
          </div>
        </div>
      )}

      {/* Dispatches list */}
      {visible.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            <span>
              {projecting && filterPoint !== "all"
                ? `${filterPoint}`
                : "Points"}
            </span>
            {projecting && filterPointStatus !== "all" && (
              <Pill
                tone={filterPointStatus === "in-flight" ? "warning" : "success"}
                className="text-[9px] normal-case tracking-normal"
              >
                {filterPointStatus === "in-flight" ? "In flight" : "Received"}
              </Pill>
            )}
            {projecting && (
              <span className="font-normal normal-case tracking-normal text-[var(--vv-t3)]">
                · {visible.length} of {job.dispatches.length}
              </span>
            )}
          </div>
          {visible.map((d) => (
            <div key={d.id} className="flex flex-col gap-1">
              <DispatchLine
                dispatch={d}
                onReceive={() => openReceive(d)}
                receiveOpen={receiveOpenId === d.id}
                onCancelReceive={() => setReceiveOpenId(null)}
              />
              {/* Inline receive form */}
              {receiveOpenId === d.id && d.receivedAt === undefined && (
                <form
                  onSubmit={(e) => handleReceiveSubmit(e, d)}
                  className="ml-2 flex flex-col gap-2.5 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-3 py-2.5"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                    Receive back from {d.point}{" "}
                    <span className="font-normal normal-case">
                      — sent {fmtKG(d.sentKg)} · {fmtIN(d.sentBags)} bags
                    </span>
                  </div>

                  {/* Two sections side by side — fill either or both */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {/* Stemless section */}
                    <div className="flex flex-col gap-1.5 rounded-vv-sm border-[0.5px] border-[var(--vv-suc)] bg-[var(--vv-suc-bg)] px-2.5 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-suc)]">
                        ✅ Destemmed (stemless)
                      </div>
                      <label className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                          Destemmed KG
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={d.sentKg}
                          value={receiveForm.receivedKg}
                          onChange={(e) =>
                            setReceiveForm((f) => ({ ...f, receivedKg: e.target.value }))
                          }
                          placeholder={`max ${fmtKG(d.sentKg)}`}
                          className="vv-mono w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-suc)]"
                        />
                      </label>
                      <p className="text-[9px] text-[var(--vv-t3)]">
                        Clean stemless output returned to godown.
                      </p>
                    </div>

                    {/* With-stem section */}
                    <div className="flex flex-col gap-1.5 rounded-vv-sm border-[0.5px] border-[var(--vv-am)] bg-[var(--vv-am-bg)] px-2.5 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-am)]">
                        🌿 Returned with stems
                      </div>
                      <div className="flex gap-2">
                        <label className="flex flex-1 flex-col gap-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                            Returned KG
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={d.sentKg}
                            value={receiveForm.returnedStemKg}
                            onChange={(e) =>
                              setReceiveForm((f) => ({ ...f, returnedStemKg: e.target.value }))
                            }
                            placeholder={`max ${fmtKG(d.sentKg)}`}
                            className="vv-mono w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-am)]"
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                            Bags
                          </span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max={d.sentBags}
                            value={receiveForm.returnedStemBags}
                            onChange={(e) =>
                              setReceiveForm((f) => ({ ...f, returnedStemBags: e.target.value }))
                            }
                            placeholder="0"
                            className="vv-mono w-16 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-am)]"
                          />
                        </label>
                      </div>
                      <p className="text-[9px] text-[var(--vv-t3)]">
                        ↩ Re-enters unallocated pool for re-dispatch.
                      </p>
                    </div>
                  </div>

                  {/* Note */}
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                      Note (optional)
                    </span>
                    <input
                      type="text"
                      value={receiveForm.note}
                      onChange={(e) =>
                        setReceiveForm((f) => ({ ...f, note: e.target.value }))
                      }
                      placeholder="e.g. partial — remaining tomorrow"
                      className="w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
                    />
                  </label>

                  {receiveError && (
                    <p className="text-[10px] font-semibold text-[var(--vv-err)]">
                      {receiveError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      variant="soft-primary"
                      disabled={receiveLoading}
                    >
                      {receiveLoading ? "Saving…" : "Confirm receipt"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setReceiveOpenId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Left over — destemmed KG minus allocated to orders */}
      {job.status === "received" &&
        (() => {
          const destemmedTotal = totalReceivedKg(job);
          const remaining = Math.max(0, destemmedTotal - orderAllocatedKg);
          const remainingPct =
            destemmedTotal > 0 ? (remaining / destemmedTotal) * 100 : 0;
          return (
            <div className="flex flex-col gap-1 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-2.5 py-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Package
                  size={11}
                  className={
                    remaining === 0
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
                    (remaining === 0
                      ? "text-[var(--vv-t2)]"
                      : "text-[var(--vv-t0)]")
                  }
                >
                  {fmtKG(remaining)}
                </span>
                <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
                  of {fmtKG(Math.round(destemmedTotal))} destemmed
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
          );
        })()}

      {/* Notes timeline */}
      {job.notes.length > 0 && (
        <div className="flex flex-col gap-1 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Notes
          </div>
          {job.notes.slice(-4).map((n, i) => (
            <div
              key={i}
              className="text-[11px] leading-snug text-[var(--vv-t2)]"
            >
              <span className="vv-mono mr-1.5 text-[9px] text-[var(--vv-t3)]">
                {fmtDateTime(n.at)}
              </span>
              {n.point && (
                <span className="font-bold text-[var(--vv-t1)]">
                  {n.point}:{" "}
                </span>
              )}
              {n.text}
            </div>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-col gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-2.5">
        <div className="flex items-center gap-2">
          {unKg > 0 ? (
            <Button
              size="sm"
              variant="soft-primary"
              onClick={() => (sendOpen ? setSendOpen(false) : openSend())}
              className="flex-1"
            >
              <Send size={13} />
              Send {fmtKG(unKg)} to a point
              {sendOpen ? (
                <ChevronUp size={12} className="ml-auto" />
              ) : (
                <ChevronDown size={12} className="ml-auto" />
              )}
            </Button>
          ) : job.status === "received" ? (
            <Pill tone="success" className="text-[10px]">
              <Sparkles size={11} />
              Job complete ·{" "}
              {yieldPct !== null ? `${fmtPct(yieldPct, 1)} yield` : ""}
            </Pill>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--vv-t2)]">
              <Inbox size={12} />
              Awaiting receipts from points
            </span>
          )}
        </div>

        {/* Inline send form */}
        {sendOpen && (
          <form
            onSubmit={handleSendSubmit}
            className="flex flex-col gap-2 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-3 py-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                Send to destemming point
              </span>
              <button
                type="button"
                onClick={() => setSendOpen(false)}
                className="text-[var(--vv-t3)] hover:text-[var(--vv-t1)]"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Point selector */}
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                  Point
                </span>
                <select
                  value={sendForm.point}
                  onChange={(e) =>
                    setSendForm((f) => ({
                      ...f,
                      point: e.target.value as DestemmingPoint,
                    }))
                  }
                  className="rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
                >
                  {DESTEMMING_POINTS.map((p) => (
                    <option key={p} value={p}>
                      {DESTEMMING_POINT_ICON[p]} {p}
                    </option>
                  ))}
                </select>
              </label>

              {/* Bags */}
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                  Bags (max {unBags})
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={unBags}
                  required
                  value={sendForm.bags}
                  onChange={(e) =>
                    setSendForm((f) => ({ ...f, bags: e.target.value }))
                  }
                  className="vv-mono w-24 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
                />
              </label>

              {/* KG */}
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                  KG (max {fmtKG(unKg)})
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={unKg}
                  required
                  value={sendForm.kg}
                  onChange={(e) =>
                    setSendForm((f) => ({ ...f, kg: e.target.value }))
                  }
                  className="vv-mono w-28 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
                />
              </label>

              {/* Destemming Price */}
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                  Destemming Price (₹/KG)
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sendForm.pricePerKg}
                  onChange={(e) =>
                    setSendForm((f) => ({ ...f, pricePerKg: e.target.value }))
                  }
                  placeholder="e.g. 3.50"
                  className="vv-mono w-28 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
                />
              </label>

              {/* Allowed shortage % */}
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                  Shortage % (optional)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={sendForm.shortagePct}
                  onChange={(e) =>
                    setSendForm((f) => ({ ...f, shortagePct: e.target.value }))
                  }
                  placeholder="e.g. 2"
                  className="vv-mono w-24 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
                />
              </label>

              {/* Gunny bag weight per bag */}
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                  Bag tare (KG/bag)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={sendForm.bagWeightKg}
                  onChange={(e) =>
                    setSendForm((f) => ({ ...f, bagWeightKg: e.target.value }))
                  }
                  placeholder="1.5"
                  className="vv-mono w-24 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
                />
              </label>
            </div>

            {/* Read-only computed expectations */}
            {(() => {
              const kg = parseFloat(sendForm.kg);
              const bags = parseInt(sendForm.bags, 10);
              const pct = parseFloat(sendForm.shortagePct);
              const bagW = parseFloat(sendForm.bagWeightKg);
              if (Number.isNaN(kg) || Number.isNaN(bags)) return null;
              const shortageKg = (!Number.isNaN(pct) && pct > 0) ? (kg * pct) / 100 : 0;
              const bagDeductKg = (!Number.isNaN(bagW) && bagW > 0) ? bags * bagW : 0;
              const expectedKg = Math.max(0, kg - shortageKg - bagDeductKg);
              return (
                <div className="vv-mono flex flex-wrap gap-x-4 gap-y-0.5 rounded-vv-sm border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg2)] px-2.5 py-1.5 text-[10px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                    Expected receivables
                  </span>
                  {shortageKg > 0 && (
                    <span className="text-[var(--vv-t2)]">
                      Shortage{" "}
                      <span className="font-semibold text-[var(--vv-am)]">
                        −{fmtKG(shortageKg)}
                      </span>
                      <span className="text-[var(--vv-t3)]"> ({pct}%)</span>
                    </span>
                  )}
                  {bagDeductKg > 0 && (
                    <span className="text-[var(--vv-t2)]">
                      Gunny bags{" "}
                      <span className="font-semibold text-[var(--vv-am)]">
                        −{fmtKG(bagDeductKg)}
                      </span>
                      <span className="text-[var(--vv-t3)]">
                        {" "}
                        ({bags} × {bagW} KG)
                      </span>
                    </span>
                  )}
                  <span className="ml-auto">
                    Stemless receivable{" "}
                    <span className="font-bold text-[var(--vv-suc)]">
                      {fmtKG(expectedKg)}
                    </span>
                  </span>
                </div>
              );
            })()}

            {/* Note — full width row */}
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                Note (optional)
              </span>
              <input
                type="text"
                value={sendForm.note}
                onChange={(e) =>
                  setSendForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="e.g. morning batch"
                className="w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-2 py-1 text-[12px] text-[var(--vv-t0)] placeholder:text-[var(--vv-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc)]"
              />
            </label>

            {/* Live cost preview */}
            {sendForm.pricePerKg !== "" && sendForm.kg !== "" &&
              !Number.isNaN(parseFloat(sendForm.pricePerKg)) &&
              !Number.isNaN(parseFloat(sendForm.kg)) && (
              <p className="vv-mono text-[10px] text-[var(--vv-t2)]">
                Destemming cost for this dispatch:{" "}
                <span className="font-bold text-[var(--vv-t0)]">
                  {fmtINR(Math.round(parseFloat(sendForm.kg) * parseFloat(sendForm.pricePerKg)))}
                </span>
              </p>
            )}

            {sendError && (
              <p className="text-[10px] font-semibold text-[var(--vv-err)]">
                {sendError}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                variant="soft-primary"
                disabled={sendLoading}
              >
                {sendLoading ? "Sending…" : "Confirm dispatch"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSendOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DispatchLine({
  dispatch,
  onReceive,
  receiveOpen,
  onCancelReceive,
}: {
  dispatch: DestemmingDispatch;
  onReceive: () => void;
  receiveOpen: boolean;
  onCancelReceive: () => void;
}) {
  const isClosed = dispatch.receivedAt !== undefined;
  const isStemless = dispatch.returnType === "stemless";
  const isWithStem = dispatch.returnType === "with-stem";
  const isPartial = dispatch.returnType === "partial";

  const yieldPct =
    (isStemless || isPartial) && dispatch.sentKg > 0
      ? ((dispatch.receivedKg ?? 0) / dispatch.sentKg) * 100
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill tone="neutral" className="text-[9px]">
        <span style={{ color: DESTEMMING_POINT_COLOR[dispatch.point] }}>
          {DESTEMMING_POINT_ICON[dispatch.point]}
        </span>
        {dispatch.point}
      </Pill>
      <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
        Sent {fmtIN(dispatch.sentBags)} bags · {fmtKG(dispatch.sentKg)}
        {dispatch.pricePerKg !== undefined && (
          <>
            <span className="text-[var(--vv-t3)]"> · </span>
            <span className="font-semibold text-[var(--vv-t1)]">
              {fmtINR(dispatch.pricePerKg)}/KG
            </span>
            <span className="text-[var(--vv-t3)]"> = </span>
            <span className="font-bold text-[var(--vv-t0)]">
              {fmtINR(Math.round(dispatch.sentKg * dispatch.pricePerKg))}
            </span>
          </>
        )}
        {(dispatch.shortagePct !== undefined || dispatch.bagWeightKg !== undefined) && (() => {
          const shortageKg = dispatch.shortagePct ? (dispatch.sentKg * dispatch.shortagePct) / 100 : 0;
          const bagDeductKg = dispatch.bagWeightKg ? dispatch.sentBags * dispatch.bagWeightKg : 0;
          const expectedKg = Math.max(0, dispatch.sentKg - shortageKg - bagDeductKg);
          return (
            <>
              <span className="text-[var(--vv-t3)]"> · </span>
              <span className="text-[var(--vv-suc)]">exp. {fmtKG(expectedKg)}</span>
            </>
          );
        })()}
        <span className="text-[var(--vv-t3)]"> · </span>
        {fmtDateTime(dispatch.sentAt)}
      </span>

      {isClosed ? (
        isPartial ? (
          <div className="ml-auto flex flex-wrap gap-1">
            <Pill tone="success" className="text-[9px]">
              <CheckCircle2 size={10} />
              {fmtKG(dispatch.receivedKg ?? 0)} destemmed
              {yieldPct !== null && ` · ${fmtPct(yieldPct, 1)}`}
            </Pill>
            <Pill tone="warning" className="text-[9px]">
              🌿 {fmtKG(dispatch.returnedStemKg ?? 0)} with stems
            </Pill>
          </div>
        ) : isStemless ? (
          <Pill tone="success" className="ml-auto text-[9px]">
            <CheckCircle2 size={10} />
            {fmtKG(dispatch.receivedKg ?? 0)} destemmed
            {yieldPct !== null && ` · ${fmtPct(yieldPct, 1)}`}
          </Pill>
        ) : isWithStem ? (
          <Pill tone="warning" className="ml-auto text-[9px]">
            🌿 {fmtKG(dispatch.returnedStemKg ?? 0)} returned with stems
            {dispatch.returnedStemBags
              ? ` · ${fmtIN(dispatch.returnedStemBags)} bags`
              : ""}
          </Pill>
        ) : null
      ) : receiveOpen ? (
        <button
          type="button"
          onClick={onCancelReceive}
          className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-[var(--vv-t2)] hover:text-[var(--vv-t0)]"
        >
          <X size={11} />
          Cancel
        </button>
      ) : (
        <button
          type="button"
          onClick={onReceive}
          className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-[var(--vv-acc)] hover:underline"
        >
          <Inbox size={11} />
          Receive back
        </button>
      )}
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
