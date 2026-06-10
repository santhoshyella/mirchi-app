import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  HelpCircle,
  Package,
  UserPlus,
  UserCheck,
  Flag,
  Sun,
  Wind,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getSessionUser } from "@/lib/permissions";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { ProbabilityPill } from "@/components/ProbabilityPill";
import { ProgressBar } from "@/components/ProgressBar";
import { VarietyDot } from "@/components/VarietyDot";
import {
  daysUntil,
  fmtDeadline,
  fmtDateTime,
  fmtId,
  fmtIN,
  fmtINR,
  fmtKG,
  fmtPct,
  fmtRelTime,
  fmtDateTimeStamp,
  fmtTime,
} from "@/lib/format";
import {
  type PurchaseItem,
  type PurchaseStage,
  STAGE_NAMES,
  STAGE_TEAMS,
  VARIETY_COLOR,
  DESTINATION_ICON,
  SOURCE_TYPE_ICON,
} from "@/types/domain";
import { cn } from "@/lib/cn";
import {
  DEFAULT_ADVANCE_NOTE,
  DEFAULT_INFO_REQUEST_NOTE,
  DEFAULT_SETTLE_NOTE,
  usePurchaseStore,
} from "./store";
import { usersApi, type UserApiItem } from "@/lib/api";

const STAGE_MENU_PATH: Record<number, string> = {
  1: "/purchase",
  2: "/machule",
  3: "/weighing",
  4: "/loading",
  5: "/receipt",
  6: "/accounts",
};

// ─── Assign popover ──────────────────────────────────────────────────────────

function AssignPopover({
  menuPath,
  current,
  onSelect,
  onClose,
}: {
  menuPath: string;
  current: string | undefined;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    usersApi.list().then((all) => {
      const filtered = all.filter(
        (u) =>
          u.isActive &&
          (u.isAdmin ||
            u.menuItems.includes("*") ||
            u.menuItems.includes(menuPath))
      );
      setUsers(filtered);
      setLoading(false);
    });
  }, []); // mounts fresh on every open (conditional render)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 z-50 mt-1 w-56 rounded-vv-md border border-[var(--vv-bd2)] bg-white shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[var(--vv-bd)] px-3 py-2">
        <span className="text-[11px] font-bold text-[var(--vv-t2)]">Assign to</span>
        <button type="button" onClick={onClose} className="text-[var(--vv-t3)] hover:text-[var(--vv-t1)]">
          <X size={12} />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {loading && (
          <p className="px-3 py-2 text-[12px] text-[var(--vv-t3)]">Loading…</p>
        )}
        {!loading && users.length === 0 && (
          <p className="px-3 py-2 text-[12px] text-[var(--vv-t3)]">No users with access</p>
        )}
        {users.map((u) => {
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
          const isActive = fullName === current;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => { onSelect(fullName); onClose(); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-[var(--vv-bg1)]",
                isActive && "bg-[var(--vv-acc-bg)] font-semibold text-[var(--vv-acc)]"
              )}
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--vv-bg2)] text-[10px] font-bold text-[var(--vv-t1)]">
                {u.firstName[0]?.toUpperCase()}
              </span>
              <span className="truncate">{fullName}</span>
              {isActive && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  item: PurchaseItem;
  className?: string;
  /**
   * If set, mark this row as the focused item — adds a strong ring
   * highlight. Used by the list page when navigated to with `?focus=p-XXX`
   * (e.g. from a destemming row's "from p-XXX" back-link).
   */
  focused?: boolean;
  /**
   * If a destemming job exists for this purchase, its id. Triggers a
   * "Destemming · d-XXX →" pill on the row that links into the destemming
   * list focused on that job.
   */
  linkedDestemmingJobId?: string;
  /**
   * If a Raasi batch was created from this purchase, its id. Triggers a
   * "Raasi · r-XXX →" pill linking into the Raasi list focused on that batch.
   */
  linkedRaasiBatchId?: string;
  /**
   * KG already allocated from this purchase to open outward orders. Drives
   * the "Left over" indicator for stage-6 items that are still sellable.
   * Defaults to 0.
   */
  orderAllocatedKg?: number;
  /** Imperative ref attached to the outer card — list page uses it to scroll the focused row into view. */
  outerRef?: React.RefObject<HTMLDivElement>;
}

/** Action label for moving an item from `stage` to `stage + 1`. */
function nextActionLabel(stage: PurchaseStage): string | null {
  if (stage >= 6) return null;
  const nextTeam = STAGE_TEAMS[(stage + 1) as PurchaseStage];
  switch (stage) {
    case 1:
      return `Move to ${nextTeam}`;
    case 3:
      return `Confirm weight · Move to ${nextTeam}`;
    case 4:
      return `Hand over · Move to ${nextTeam}`;
    case 5:
      return `Mark received · Move to ${nextTeam}`;
    default:
      return `Move to ${nextTeam}`;
  }
}

/**
 * One row of the purchase list. Designed to read both as a desktop tabular row
 * and as a mobile card — the layout collapses on small screens.
 */
export function PurchaseRow({
  item,
  className,
  focused,
  linkedDestemmingJobId,
  linkedRaasiBatchId,
  orderAllocatedKg = 0,
  outerRef,
}: Props) {
  const advanceStage = usePurchaseStore((s) => s.advanceStage);
  const rejectItem = usePurchaseStore((s) => s.rejectItem);
  const settleAtAccounts = usePurchaseStore((s) => s.settleAtAccounts);
  const requestAccountsInfo = usePurchaseStore((s) => s.requestAccountsInfo);
  const assignToStage = usePurchaseStore((s) => s.assignToStage);
  const location = useLocation();
  const isAdmin = getSessionUser()?.isAdmin ?? true; // default true in dev (no session)

  const currentAssignee = item.stageAssignee[item.currentStage];
  const enteredAt = item.stageEnteredAt[item.currentStage];

  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "advance" | "reject" | "settle" | "request-info" | null
  >(null);
  const [noteText, setNoteText] = useState("");
  const [acting, setActing] = useState(false);

  const value = item.kg * item.price;
  const stagePct = (item.currentStage / 6) * 100;
  const advanceLabel = nextActionLabel(item.currentStage);

  const daysToDispatch = daysUntil(item.dispatchDeadline);
  const isOpen = !item.isRejected && item.accountsStatus !== "settled";
  const deadlineHot = isOpen && daysToDispatch !== null && daysToDispatch <= 5;

  // Build default note for the current action
  function defaultNoteFor(action: typeof pendingAction): string {
    if (action === "advance") {
      const base = DEFAULT_ADVANCE_NOTE[item.currentStage] ?? "";
      // Stage 5 (Receipt confirm) — append destination
      if (item.currentStage === 5)
        return `${base} Destination: ${item.destination}${item.destinationDetails ? ` · ${item.destinationDetails}` : ""}.`;
      return base;
    }
    if (action === "reject") return "Rejected.";
    if (action === "settle") return DEFAULT_SETTLE_NOTE;
    if (action === "request-info") return DEFAULT_INFO_REQUEST_NOTE;
    return "";
  }

  const openAction = (action: NonNullable<typeof pendingAction>) => {
    setNoteText(defaultNoteFor(action));
    setPendingAction(action);
  };

  const cancelAction = () => { setPendingAction(null); setNoteText(""); };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    try {
      const note = noteText.trim() || defaultNoteFor(pendingAction);
      if (pendingAction === "advance") await advanceStage(item.id, note);
      else if (pendingAction === "reject") await rejectItem(item.id, note);
      else if (pendingAction === "settle") await settleAtAccounts(item.id, note);
      else if (pendingAction === "request-info") await requestAccountsInfo(item.id, note);
      setPendingAction(null);
      setNoteText("");
    } finally { setActing(false); }
  };

  const statusIcon = item.isRejected ? (
    <XCircle size={13} className="text-[var(--vv-dan)]" />
  ) : item.probability === 100 ? (
    <CheckCircle2 size={13} className="text-[var(--vv-suc)]" />
  ) : (
    <Clock size={13} className="text-[var(--vv-am)]" />
  );

  return (
    <div
      ref={outerRef}
      className={cn(
        "rounded-vv-md border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)]",
        "flex flex-col gap-2.5 px-3.5 py-3",
        "transition-all hover:border-[var(--vv-bd2)] hover:shadow-sm",
        item.isRejected && "opacity-80",
        // Red ring when the dispatch deadline is within 5 days — the row
        // becomes a visual flag without obscuring the variety stripe.
        deadlineHot &&
          "bg-[var(--vv-dan-bg)]/30 ring-1 ring-[var(--vv-dan-bd)]",
        // Focus ring wins over the deadline ring when both apply — the user
        // navigated here to look at *this* row.
        focused &&
          "ring-2 ring-[var(--vv-acc)] ring-offset-2 ring-offset-[var(--vv-bg1)]",
        className
      )}
      style={{ borderLeft: `3px solid ${VARIETY_COLOR[item.variety]}` }}
    >
      {/* Header: shop, variety, status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <VarietyDot variety={item.variety} />
            <span className="truncate text-[12px] font-bold text-[var(--vv-t0)]">
              {item.shop}
            </span>
          </div>
          <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t2)]">
            {fmtDateTimeStamp(item.date, item.createdAt)} ·{" "}
            <span title={`Source: ${item.sourceType}`}>
              {SOURCE_TYPE_ICON[item.sourceType]} {item.sourceType}
            </span>{" "}
            · {item.variety} · {item.type} ·{" "}
            <span className="font-semibold">Mark {item.mark}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {statusIcon}
          <ProbabilityPill value={item.probability} />
          <Link
            to={`/purchase/${item.id}/edit`}
            state={{ returnTo: location.pathname }}
            title="Edit lot"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--vv-t3)] transition-colors hover:bg-[var(--vv-bg2)] hover:text-[var(--vv-t1)]"
          >
            <Pencil size={13} />
          </Link>
        </div>
      </div>

      {/* Numbers row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Bags
          </div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">
            {fmtIN(item.bags)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Weight
          </div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">
            {fmtKG(item.kg)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Value · {fmtINR(item.price)}/KG
          </div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">
            {fmtINR(value)}
          </div>
        </div>
      </div>

      {/* Stage progress + destination */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral" className="text-[9px]">
          <span>{DESTINATION_ICON[item.destination]}</span>
          {item.destination}
        </Pill>
        {/* Dispatch deadline. Hot (≤ 5 days) → red flag pill; otherwise a
            quiet neutral chip with just the date. Hidden once the item has
            been settled at Accounts (terminal — already moved on). */}
        {isOpen && item.dispatchDeadline && (
          <Pill
            tone={deadlineHot ? "danger" : "neutral"}
            className="text-[9px]"
          >
            <Flag size={10} />
            Dispatch {fmtDeadline(item.dispatchDeadline)}
          </Pill>
        )}
        {/* Forward-link to the destemming job for this lot. Hidden when no
            job exists yet — the lot might still be earlier in the pipeline. */}
        {linkedDestemmingJobId && (
          <Link
            to={`/destemming?focus=${linkedDestemmingJobId}`}
            title={`Open destemming job ${linkedDestemmingJobId}`}
            className="inline-flex"
          >
            <Pill
              tone="purple"
              className="text-[9px] hover:bg-[var(--vv-pu)] hover:text-white"
            >
              <Wind size={10} />
              Destemming · {fmtId(linkedDestemmingJobId)}
              <ArrowRight size={9} />
            </Pill>
          </Link>
        )}
        {/* Forward-link to the Raasi batch (sun-drying) for this lot. Only
            shows when destination = Raasi and a batch has been created. */}
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
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ProgressBar
            value={stagePct}
            color={item.isRejected ? "var(--vv-dan)" : "var(--vv-acc)"}
            height={4}
          />
          <span className="vv-mono whitespace-nowrap text-[10px] text-[var(--vv-t2)]">
            {item.currentStage}/6 · {STAGE_NAMES[item.currentStage]}
          </span>
        </div>
      </div>

      {/* Left over — purchased KG minus what's been allocated to open
          outward orders. Only rendered at the Accounts stage (currentStage
          === 6) and only when the lot is still sellable (not consumed by
          destemming/raasi — those purchases are hidden from the main list).
          The "Weight" metric itself stays unchanged; this strip surfaces the
          unsold remainder. */}
      {item.currentStage === 6 &&
        !item.isRejected &&
        (() => {
          const remaining = Math.max(0, item.kg - orderAllocatedKg);
          const remainingPct = item.kg > 0 ? (remaining / item.kg) * 100 : 0;
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
                  of {fmtKG(item.kg)} purchased
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

      {/* Assignment strip — who owns this stage + when it landed here. Only
          actionable while the item is open (not rejected, not settled). */}
      {!item.isRejected && item.accountsStatus !== "settled" && (
        <div className="flex flex-wrap items-center gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          {currentAssignee ? (
            <Pill tone="info">
              <UserCheck size={11} />
              {currentAssignee}
            </Pill>
          ) : (
            <Pill tone="warning">
              <UserPlus size={11} />
              Unassigned
            </Pill>
          )}
          {enteredAt && (
            <span
              className="vv-mono text-[10px] text-[var(--vv-t2)]"
              title={`Entered ${STAGE_NAMES[item.currentStage]} at ${new Date(
                enteredAt
              ).toLocaleString("en-IN")}`}
            >
              <Clock size={10} className="-mt-0.5 mr-0.5 inline" />
              At {STAGE_NAMES[item.currentStage]} since {fmtTime(enteredAt)} ·{" "}
              {fmtRelTime(enteredAt)}
            </span>
          )}
          {isAdmin && (
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setAssignOpen((o) => !o)}
                className="text-[10px] font-bold text-[var(--vv-acc)] hover:underline"
              >
                {currentAssignee ? "Reassign" : "Assign"}
              </button>
              {assignOpen && (
                <AssignPopover
                  menuPath={STAGE_MENU_PATH[item.currentStage] ?? "/purchase"}
                  current={currentAssignee}
                  onSelect={(name) => assignToStage(item.id, name)}
                  onClose={() => setAssignOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {item.notes.length > 0 && (
        <div className="flex flex-col gap-1 border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
            Notes
          </div>
          {item.notes.map((n, i) => (
            <div key={i} className="text-[11px] leading-snug">
              <span className="font-bold text-[var(--vv-t1)]">
                {STAGE_TEAMS[n.stage]}
              </span>
              <span className="vv-mono text-[9px] text-[var(--vv-t3)]">
                {" "}({fmtDateTime(n.at)}):
              </span>{" "}
              <span className="text-[var(--vv-t2)]">{n.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action footer — moves the item to the next team / stage. */}
      <div className="flex flex-col gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-2.5">

        {/* ── Inline note panel (shown when an action is pending) ── */}
        {pendingAction && (
          <div className="flex flex-col gap-2 rounded-vv-sm border border-[var(--vv-bd2)] bg-[var(--vv-bg1)] p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
              {pendingAction === "advance" && `Note for ${STAGE_TEAMS[(item.currentStage + 1) as PurchaseStage] ?? "next team"}`}
              {pendingAction === "reject" && "Rejection reason"}
              {pendingAction === "settle" && "Settlement note"}
              {pendingAction === "request-info" && "Info needed"}
            </div>
            <textarea
              autoFocus
              rows={2}
              className="w-full resize-none rounded border border-[var(--vv-bd2)] bg-white px-2.5 py-1.5 text-[12px] leading-relaxed text-[var(--vv-t0)] focus:border-[var(--vv-acc)] focus:outline-none focus:ring-1 focus:ring-[var(--vv-acc-bg)]"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirmAction(); }}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={pendingAction === "reject" ? "soft-danger" : pendingAction === "settle" ? "soft-success" : "soft-primary"}
                onClick={confirmAction}
                disabled={acting}
                className="flex-1"
              >
                <Check size={12} />
                {acting ? "Saving…" : (
                  pendingAction === "advance" ? "Confirm & move" :
                  pendingAction === "reject" ? "Confirm reject" :
                  pendingAction === "settle" ? "Settle" : "Send"
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelAction} disabled={acting}>
                <X size={12} /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Action buttons (hidden while a note panel is open) ── */}
        {!pendingAction && (
          item.isRejected ? (
            <Pill tone="danger">
              <XCircle size={11} />
              Rejected · stage closed
            </Pill>
          ) : item.currentStage >= 6 ? (
            item.accountsStatus === "settled" ? (
              <Pill tone="success">
                <Lock size={11} />
                Settled · payment closed
              </Pill>
            ) : (
              <>
                {item.accountsStatus === "info-requested" && (
                  <Pill tone="warning">
                    <HelpCircle size={11} />
                    Awaiting more info
                  </Pill>
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="soft-success" onClick={() => openAction("settle")} className="flex-1">
                    <CheckCircle2 size={13} /> Validate & settle
                  </Button>
                  <Button size="sm" variant="soft-warning" onClick={() => openAction("request-info")} className="flex-1">
                    <HelpCircle size={13} /> Request info
                  </Button>
                </div>
              </>
            )
          ) : item.currentStage === 2 ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="soft-success" onClick={() => openAction("advance")} className="flex-1">
                <CheckCircle2 size={13} /> Pass
              </Button>
              <Button size="sm" variant="soft-danger" onClick={() => openAction("reject")} className="flex-1">
                <XCircle size={13} /> Reject
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="soft-primary" onClick={() => openAction("advance")} className="min-w-0 flex-1 justify-between">
                <span className="inline-flex items-center gap-1.5 truncate">{advanceLabel}</span>
                <ArrowRight size={13} className="flex-shrink-0" />
              </Button>
              <Button size="sm" variant="soft-danger" onClick={() => openAction("reject")} title="Reject this purchase" className="flex-shrink-0">
                <XCircle size={13} />
                <span className="hidden sm:inline">Reject</span>
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
