import { useEffect, useMemo, useRef, useState } from "react";
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
  Eye,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageSquare,
} from "lucide-react";
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
  type Probability,
  type SourceType,
  STAGE_NAMES,
  STAGE_TEAMS,
  VARIETY_COLOR,
  DESTINATION_ICON,
  SOURCE_TYPE_ICON,
  isLotNote,
  isWorkflowNote,
} from "@/types/domain";
import { cn } from "@/lib/cn";
import {
  DEFAULT_ADVANCE_NOTE,
  DEFAULT_INFO_REQUEST_NOTE,
  DEFAULT_SETTLE_NOTE,
  usePurchaseStore,
} from "./store";
import { usersApi, type UserApiItem } from "@/lib/api";
import type { PurchaseGroup, VarietyGroup } from "./selectors";
import { lotCost } from "./selectors";

const STAGE_MENU_PATH: Record<number, string> = {
  1: "/purchase",
  2: "/machule",
  3: "/weighing",
  4: "/loading",
  5: "/receipt",
  6: "/accounts",
};

// ── Assign popover (same as PurchaseRow) ─────────────────────────────────────

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
  }, []);

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

// ── Level 3: Lot detail row (view-only + reject toggle) ───────────────────────

function LotDetailRow({
  lot,
  lotIndex,
}: {
  lot: PurchaseItem;
  lotIndex: number;
}) {
  const location = useLocation();
  const rejectItem = usePurchaseStore((s) => s.rejectItem);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const value = lotCost(lot);
  const lotDaysToDispatch = daysUntil(lot.dispatchDeadline);
  const lotDeadlineHot = !lot.isRejected && lotDaysToDispatch !== null && lotDaysToDispatch <= 5;
  const lotNoteCount = lot.notes.filter(isLotNote).length;

  const handleReject = async () => {
    setRejecting(true);
    try {
      await rejectItem(lot.id, "Rejected.");
    } finally {
      setRejecting(false);
      setConfirmReject(false);
    }
  };

  return (
    <div
      className={cn(
        "border-t-[0.5px] border-[var(--vv-bd)]",
        lot.isRejected && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        {/* Lot index badge — always shows note dot (muted when none, amber when present) */}
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--vv-bg2)] text-[10px] font-bold text-[var(--vv-t2)]">
          {lotIndex}
          <span
            title={lotNoteCount > 0 ? `${lotNoteCount} lot note${lotNoteCount !== 1 ? "s" : ""}` : "No remarks yet"}
            className={`absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-extrabold ${
              lotNoteCount > 0
                ? "bg-[var(--vv-warn,#f59e0b)] text-white"
                : "bg-[var(--vv-bg3,#e5e7eb)] text-[var(--vv-t3)]"
            }`}
          >
            {lotNoteCount > 0 ? (lotNoteCount > 9 ? "9+" : lotNoteCount) : "·"}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          {/* Source · Variety · Mark */}
          <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-[var(--vv-t0)]">
            <span>{lot.sourceType}</span>
            <span className="text-[var(--vv-t3)]">·</span>
            <span>{lot.variety}</span>
            {lot.type && (
              <>
                <span className="text-[var(--vv-t3)]">·</span>
                <span>{lot.type}</span>
              </>
            )}
            {lot.mark && (
              <>
                <span className="text-[var(--vv-t3)]">·</span>
                <span>Mark {lot.mark}</span>
              </>
            )}
            {lot.isRejected && (
              <span className="ml-1 font-bold text-[var(--vv-dan)]">Rejected</span>
            )}
          </div>

          {/* Bags · Weight · Price · Value · Dispatch deadline */}
          <div className="vv-mono mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--vv-t2)]">
            {(lot.bags ?? 0) > 0 && <span>{fmtIN(lot.bags)} bags</span>}
            {(lot.kg ?? 0) > 0 && <span>{fmtKG(lot.kg)}</span>}
            {(lot.price ?? 0) > 0 && <span>{fmtINR(lot.price)}/kg</span>}
            {value > 0 && (
              <span className="font-semibold text-[var(--vv-t1)]">{fmtINR(value)}</span>
            )}
            {!lot.isRejected && lot.dispatchDeadline && (
              <Pill tone={lotDeadlineHot ? "danger" : "neutral"} className="text-[9px]">
                <Flag size={9} />
                Dispatch {fmtDeadline(lot.dispatchDeadline)}
              </Pill>
            )}
          </div>

          {/* Date & Time */}
          <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t3)]">
            {fmtDateTimeStamp(lot.date, lot.createdAt)}
          </div>

          {/* Lot notes ONLY — creation / edit remarks for this specific lot.
              Stage transition / workflow notes are NEVER shown here. */}
          {lotNoteCount > 0 && (() => {
            const lotNotes = lot.notes.filter(isLotNote);
            return (
              <div className="mt-1.5 rounded-sm border-l-2 border-[var(--vv-warn,#f59e0b)] bg-[color-mix(in_srgb,var(--vv-warn,#f59e0b)_8%,transparent)] pl-2 pr-2 py-1.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <MessageSquare size={9} className="shrink-0 text-[var(--vv-warn,#f59e0b)]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-warn,#f59e0b)]">
                    Lot {lotNoteCount > 1 ? `Notes (${lotNoteCount})` : "Note"}
                  </span>
                </div>
                {lotNotes.map((n, i) => (
                  <div key={i} className="text-[10px] leading-snug">
                    <span className="vv-mono text-[9px] text-[var(--vv-t3)]">({fmtDateTime(n.at)}):</span>{" "}
                    <span className="text-[var(--vv-t1)]">{n.text}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Edit / View link + Reject toggle */}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to={`/purchase/${lot.id}/edit`}
            state={{ returnTo: location.pathname }}
            title={!lot.isRejected && lot.currentStage <= 3 ? "Edit lot" : "View lot"}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--vv-t3)] transition-colors hover:bg-[var(--vv-bg2)] hover:text-[var(--vv-t1)]"
            style={{ opacity: 1 }}
          >
            {!lot.isRejected && lot.currentStage <= 3 ? <Pencil size={12} /> : <Eye size={12} />}
          </Link>
          {!lot.isRejected && (
            <button
              type="button"
              title="Reject this lot"
              onClick={() => setConfirmReject(true)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--vv-t3)] transition-colors hover:bg-[var(--vv-dan-bg)] hover:text-[var(--vv-dan)]"
            >
              <XCircle size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Inline reject confirmation */}
      {confirmReject && (
        <div className="flex items-center gap-2 border-t-[0.5px] border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)] px-3 py-2">
          <span className="flex-1 text-[11px] font-semibold text-[var(--vv-dan)]">
            Reject Lot {lotIndex}?
          </span>
          <Button
            size="sm"
            variant="soft-danger"
            onClick={handleReject}
            disabled={rejecting}
            className="h-6 px-2 text-[10px]"
          >
            <Check size={11} />
            {rejecting ? "…" : "Yes, reject"}
          </Button>
          <button
            type="button"
            onClick={() => setConfirmReject(false)}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--vv-t2)] hover:text-[var(--vv-t0)]"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Level 2: Variety section ──────────────────────────────────────────────────

function VarietySection({
  vg,
  expanded,
  onToggle,
}: {
  vg: VarietyGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Aggregate dispatch deadlines for open (non-rejected) lots in this variety.
  // Groups by formatted deadline label, sorted most-urgent first.
  const deadlineSummary = useMemo(() => {
    const map = new Map<string, { label: string; count: number; daysLeft: number | null }>();
    for (const lot of vg.items) {
      if (lot.isRejected || lot.accountsStatus === "settled") continue;
      if (!lot.dispatchDeadline) continue;
      const label = fmtDeadline(lot.dispatchDeadline);
      const days = daysUntil(lot.dispatchDeadline);
      if (!map.has(label)) map.set(label, { label, count: 0, daysLeft: days });
      map.get(label)!.count++;
    }
    return [...map.values()].sort((a, b) => {
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });
  }, [vg.items]);

  const totalLotsWithDeadline = deadlineSummary.reduce((s, d) => s + d.count, 0);

  // Note count across all lots in this variety group
  const varietyNoteCount = useMemo(
    () => vg.items.reduce((sum, lot) => sum + lot.notes.filter(isLotNote).length, 0),
    [vg.items]
  );

  return (
    <div className="overflow-hidden rounded-vv-sm border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)]">
      {/* Variety header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 bg-[var(--vv-bg1)] px-3 py-2 text-left transition-colors hover:bg-[var(--vv-bg2)]"
      >
        <VarietyDot variety={vg.variety as any} />
        <span className="flex-1 text-[11px] font-bold text-[var(--vv-t0)]">
          {vg.variety}
        </span>
        {/* Note indicator for this variety group — always visible */}
        <span
          title={varietyNoteCount > 0 ? `${varietyNoteCount} lot note${varietyNoteCount !== 1 ? "s" : ""} in this variety` : "No remarks in this variety"}
          className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            varietyNoteCount > 0
              ? "bg-[color-mix(in_srgb,var(--vv-warn,#f59e0b)_15%,transparent)] text-[var(--vv-warn,#f59e0b)]"
              : "bg-[var(--vv-bg3,#e5e7eb)] text-[var(--vv-t3)]"
          }`}
        >
          <MessageSquare size={8} />
          {varietyNoteCount > 0 ? varietyNoteCount : ""}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 text-[10px] text-[var(--vv-t2)]">
          <span>{vg.items.length} lot{vg.items.length !== 1 ? "s" : ""}</span>
          {vg.totalBags > 0 && <span>· {fmtIN(vg.totalBags)} bags</span>}
          {vg.totalKg > 0 && <span>· {fmtKG(vg.totalKg)}</span>}
          {vg.totalValue > 0 && (
            <span className="font-semibold text-[var(--vv-t1)]">
              · {fmtINR(vg.totalValue)}
            </span>
          )}
        </div>
        <span className={cn(
          "ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
          expanded
            ? "bg-[var(--vv-acc-bg)] text-[var(--vv-acc)]"
            : "bg-[var(--vv-bg2)] text-[var(--vv-t1)]"
        )}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {/* Dispatch deadline summary — one pill per unique deadline, sorted by urgency.
          Shows how many / total lots need dispatching at this variety level. */}
      {deadlineSummary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)] px-3 py-1.5">
          <Flag size={10} className="shrink-0 text-[var(--vv-t3)]" />
          <span className="text-[10px] font-semibold text-[var(--vv-t2)]">
            {totalLotsWithDeadline}/{vg.items.length} lot{vg.items.length !== 1 ? "s" : ""} to dispatch:
          </span>
          {deadlineSummary.map((d) => {
            const hot = d.daysLeft !== null && d.daysLeft <= 5;
            return (
              <Pill key={d.label} tone={hot ? "danger" : "neutral"} className="text-[9px]">
                <Flag size={9} />
                {d.count > 1 && <span className="font-bold">{d.count}×</span>}
                Dispatch {d.label}
              </Pill>
            );
          })}
        </div>
      )}

      {/* Lot detail rows */}
      {expanded &&
        vg.items.map((lot, idx) => (
          <LotDetailRow key={lot.id} lot={lot} lotIndex={idx + 1} />
        ))}
    </div>
  );
}

// ── Level 1: Purchase group card ──────────────────────────────────────────────

export interface PurchaseGroupCardProps {
  group: PurchaseGroup;
  focusedId?: string;
  focusedRef?: React.RefObject<HTMLDivElement>;
  destemmingByPurchase: Map<string, string>;
  raasiByPurchase: Map<string, string>;
  orderAllocationsByLot: Map<string, number>;
}

function nextActionLabel(stage: PurchaseStage): string | null {
  if (stage >= 6) return null;
  const nextTeam = STAGE_TEAMS[(stage + 1) as PurchaseStage];
  switch (stage) {
    case 1: return `Move to ${nextTeam}`;
    case 3: return `Confirm weight · Move to ${nextTeam}`;
    case 4: return `Hand over · Move to ${nextTeam}`;
    case 5: return `Mark received · Move to ${nextTeam}`;
    default: return `Move to ${nextTeam}`;
  }
}

export function PurchaseGroupCard({
  group,
  focusedId,
  focusedRef,
  destemmingByPurchase,
  raasiByPurchase,
  orderAllocationsByLot,
}: PurchaseGroupCardProps) {
  const advanceStage = usePurchaseStore((s) => s.advanceStage);
  const rejectItem = usePurchaseStore((s) => s.rejectItem);
  const settleAtAccounts = usePurchaseStore((s) => s.settleAtAccounts);
  const requestAccountsInfo = usePurchaseStore((s) => s.requestAccountsInfo);
  const assignToStage = usePurchaseStore((s) => s.assignToStage);
  const location = useLocation();
  const isAdmin = getSessionUser()?.isAdmin ?? true;

  // Active lots = non-rejected, non-settled (used for workflow actions)
  const activeLots = group.items.filter(
    (i) => !i.isRejected && i.accountsStatus !== "settled"
  );
  // Representative lot for stage/assignment display
  const repLot: PurchaseItem | undefined = activeLots[0] ?? group.items[0];

  // Aggregated totals (exclude rejected)
  const nonRejected = group.items.filter((i) => !i.isRejected);
  const totalKg = nonRejected.reduce((s, i) => s + (i.kg ?? 0), 0);
  const totalBags = nonRejected.reduce((s, i) => s + (i.bags ?? 0), 0);
  const totalValue = nonRejected.reduce((s, i) => s + lotCost(i), 0);
  const totalAllocatedKg = nonRejected.reduce(
    (s, i) => s + (orderAllocationsByLot.get(`purchase::${i.id}`) ?? 0),
    0
  );

  // Merged + sorted notes from all lots
  const allNotes = group.items
    .flatMap((i) => i.notes.map((n) => ({ ...n, lotId: i.id })))
    .sort((a, b) => a.at.localeCompare(b.at));

  // Count lot-level remarks across all lots in this group (for the header indicator)
  const groupLotNoteCount = group.items.reduce(
    (sum, i) => sum + i.notes.filter(isLotNote).length,
    0
  );

  // Shop-level workflow notes: keep only workflow kind, then deduplicate by
  // stage+text so the same advance note (stored on every lot) appears once.
  const shopWorkflowNotes = (() => {
    const seen = new Set<string>();
    return allNotes.filter((n) => {
      if (!isWorkflowNote(n)) return false;
      const key = `${n.stage}::${n.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Destemming / Raasi links (from any lot in group)
  const linkedDestemmingJobId = group.items
    .map((i) => destemmingByPurchase.get(i.id))
    .find(Boolean);
  const linkedRaasiBatchId = group.items
    .map((i) => raasiByPurchase.get(i.id))
    .find(Boolean);

  // Variety section expand state
  const [expandedVarieties, setExpandedVarieties] = useState<Set<string>>(
    () => {
      const focused = group.items.find((i) => i.id === focusedId);
      return focused ? new Set([focused.variety]) : new Set();
    }
  );
  const [showVarieties, setShowVarieties] = useState(
    group.items.length > 1 || !!focusedId
  );

  const toggleVariety = (variety: string) =>
    setExpandedVarieties((prev) => {
      const next = new Set(prev);
      next.has(variety) ? next.delete(variety) : next.add(variety);
      return next;
    });

  // Action state
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "advance" | "reject" | "settle" | "request-info" | null
  >(null);
  const [noteText, setNoteText] = useState("");
  const [acting, setActing] = useState(false);

  if (!repLot) return null;

  const currentAssignee = repLot.stageAssignee[repLot.currentStage];
  const enteredAt = repLot.stageEnteredAt[repLot.currentStage];
  const isOpen = activeLots.length > 0;
  const daysToDispatch = daysUntil(repLot.dispatchDeadline);
  const deadlineHot = isOpen && daysToDispatch !== null && daysToDispatch <= 5;
  const stagePct = (repLot.currentStage / 6) * 100;
  const advanceLabel = nextActionLabel(repLot.currentStage);
  const allRejected = group.items.every((i) => i.isRejected);
  const allSettled = group.items.every((i) => i.accountsStatus === "settled");
  const repProbability =
    nonRejected.length > 0
      ? Math.round(nonRejected.reduce((s, i) => s + (i.probability ?? 0), 0) / nonRejected.length)
      : 0;

  function defaultNoteFor(action: typeof pendingAction): string {
    if (action === "advance") {
      const base = DEFAULT_ADVANCE_NOTE[repLot!.currentStage] ?? "";
      if (repLot!.currentStage === 5)
        return `${base} Destination: ${repLot!.destination}${repLot!.destinationDetails ? ` · ${repLot!.destinationDetails}` : ""}.`;
      return base;
    }
    if (action === "reject") return "Rejected.";
    if (action === "settle") return DEFAULT_SETTLE_NOTE;
    if (action === "request-info") return DEFAULT_INFO_REQUEST_NOTE;
    return "";
  }

  const openAction = (action: NonNullable<typeof pendingAction>) => {
    // Block advancing from Stage 3 if any active lot is missing weighing data
    if (action === "advance" && repLot?.currentStage === 3) {
      const missing = activeLots.filter((l) => !(l.bags > 0) || !(l.kg > 0));
      if (missing.length > 0) {
        alert(
          `${missing.length} lot${missing.length !== 1 ? "s" : ""} missing weighing data (bags + weight).\n\nEdit each lot to enter the weighing details before confirming weight.`
        );
        return;
      }
    }
    setNoteText(defaultNoteFor(action));
    setPendingAction(action);
  };
  const cancelAction = () => { setPendingAction(null); setNoteText(""); };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    try {
      const note = noteText.trim() || defaultNoteFor(pendingAction);
      if (pendingAction === "advance") {
        for (const lot of activeLots) await advanceStage(lot.id, note);
      } else if (pendingAction === "reject") {
        for (const lot of group.items.filter((i) => !i.isRejected))
          await rejectItem(lot.id, note);
      } else if (pendingAction === "settle") {
        for (const lot of activeLots) await settleAtAccounts(lot.id, note);
      } else if (pendingAction === "request-info") {
        for (const lot of activeLots) await requestAccountsInfo(lot.id, note);
      }
      setPendingAction(null);
      setNoteText("");
    } finally { setActing(false); }
  };

  return (
    <div
      ref={group.isFocused ? focusedRef : undefined}
      className={cn(
        "rounded-vv-md border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)]",
        "flex flex-col gap-2.5 px-3.5 py-3",
        "transition-all hover:border-[var(--vv-bd2)] hover:shadow-sm",
        allRejected && "opacity-80",
        deadlineHot && "bg-[var(--vv-dan-bg)]/30 ring-1 ring-[var(--vv-dan-bd)]",
        group.isFocused &&
          "ring-2 ring-[var(--vv-acc)] ring-offset-2 ring-offset-[var(--vv-bg1)]"
      )}
      style={{ borderLeft: `3px solid ${VARIETY_COLOR[repLot.variety] ?? "var(--vv-bd2)"}` }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <VarietyDot variety={repLot.variety} />
            <span className="truncate text-[12px] font-bold text-[var(--vv-t0)]">
              {group.shop || "—"}
            </span>
            <span className="rounded-full bg-[var(--vv-bg2)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--vv-t2)]">
              {group.items.length} lot{group.items.length !== 1 ? "s" : ""}
            </span>
            {/* Note indicator — always visible; amber with count when remarks exist */}
            <span
              title={groupLotNoteCount > 0 ? `${groupLotNoteCount} lot note${groupLotNoteCount !== 1 ? "s" : ""} across lots` : "No lot remarks yet"}
              className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                groupLotNoteCount > 0
                  ? "bg-[color-mix(in_srgb,var(--vv-warn,#f59e0b)_15%,transparent)] text-[var(--vv-warn,#f59e0b)]"
                  : "bg-[var(--vv-bg3,#e5e7eb)] text-[var(--vv-t3)]"
              }`}
            >
              <MessageSquare size={9} />
              {groupLotNoteCount > 0 ? groupLotNoteCount : ""}
            </span>
          </div>
          <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t2)]">
            {fmtDateTimeStamp(group.date, repLot.createdAt)} ·{" "}
            <span title={`Source: ${group.sourceType}`}>
              {SOURCE_TYPE_ICON[group.sourceType as SourceType]} {group.sourceType}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {allRejected ? (
            <XCircle size={13} className="text-[var(--vv-dan)]" />
          ) : allSettled ? (
            <Lock size={13} className="text-[var(--vv-suc)]" />
          ) : null}
          <ProbabilityPill value={repProbability as Probability} />
          {repLot.currentStage === 1 && (
            <Link
              to={`/purchase/${repLot.id}/edit?shopOnly=true`}
              state={{ returnTo: location.pathname }}
              title="Edit shop source info"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--vv-t3)] transition-colors hover:bg-[var(--vv-bg2)] hover:text-[var(--vv-t1)]"
            >
              <Pencil size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Numbers row (aggregated from all valid lots, excluding rejected) ── */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Total Lots</div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">
            {nonRejected.length}
            {nonRejected.length !== group.items.length && (
              <span className="ml-1 text-[10px] text-[var(--vv-dan)]">
                ({group.items.length - nonRejected.length} rej)
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Total Bags</div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">{fmtIN(totalBags)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Total Weight</div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">{fmtKG(totalKg)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Total Value</div>
          <div className="vv-mono text-[13px] font-medium text-[var(--vv-t0)]">{fmtINR(totalValue)}</div>
        </div>
      </div>

      {/* ── Stage progress + links ── */}
      <div className="flex flex-wrap items-center gap-2">
        {linkedDestemmingJobId && (
          <Link
            to={`/destemming?focus=${linkedDestemmingJobId}`}
            title={`Open destemming job ${linkedDestemmingJobId}`}
            className="inline-flex"
          >
            <Pill tone="purple" className="text-[9px] hover:bg-[var(--vv-pu)] hover:text-white">
              <Wind size={10} />
              Destemming · {fmtId(linkedDestemmingJobId)}
              <ArrowRight size={9} />
            </Pill>
          </Link>
        )}
        {linkedRaasiBatchId && (
          <Link
            to={`/raasi?focus=${linkedRaasiBatchId}`}
            title={`Open Raasi batch ${linkedRaasiBatchId}`}
            className="inline-flex"
          >
            <Pill tone="warning" className="text-[9px] hover:bg-[var(--vv-am)] hover:text-white">
              <Sun size={10} />
              Raasi · {fmtId(linkedRaasiBatchId)}
              <ArrowRight size={9} />
            </Pill>
          </Link>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ProgressBar
            value={stagePct}
            color={allRejected ? "var(--vv-dan)" : "var(--vv-acc)"}
            height={4}
          />
          <span className="vv-mono whitespace-nowrap text-[10px] text-[var(--vv-t2)]">
            {repLot.currentStage}/6 · {STAGE_NAMES[repLot.currentStage]}
          </span>
        </div>
      </div>

      {/* ── Left-over strip (stage 6) ── */}
      {repLot.currentStage === 6 && !allRejected && (() => {
        const remaining = Math.max(0, totalKg - totalAllocatedKg);
        const remainingPct = totalKg > 0 ? (remaining / totalKg) * 100 : 0;
        return (
          <div className="flex flex-col gap-1 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-2.5 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Package size={11} className={remaining === 0 ? "text-[var(--vv-t3)]" : "text-[var(--vv-acc)]"} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Left over</span>
              <span className={"vv-mono text-[12px] font-bold " + (remaining === 0 ? "text-[var(--vv-t2)]" : "text-[var(--vv-t0)]")}>
                {fmtKG(remaining)}
              </span>
              <span className="vv-mono text-[10px] text-[var(--vv-t2)]">of {fmtKG(totalKg)} purchased</span>
              <span className="vv-mono ml-auto text-[10px] text-[var(--vv-t2)]">
                {totalAllocatedKg > 0
                  ? `${fmtKG(totalAllocatedKg)} sold (${fmtPct(100 - remainingPct, 0)})`
                  : "Nothing sold"}
              </span>
            </div>
            <div className="relative h-[4px] overflow-hidden rounded-full bg-[var(--vv-bg2)]">
              <div className="absolute inset-y-0 left-0 bg-[var(--vv-acc)]" style={{ width: `${remainingPct}%` }} />
            </div>
          </div>
        );
      })()}

      {/* ── Variety & Lots section (above Assignment) ── */}
      <div className="border-t-[0.5px] border-[var(--vv-bd)] pt-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowVarieties((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
              Varieties &amp; Lots
            </span>
            <span className="text-[10px] text-[var(--vv-t3)]">
              {group.varietyGroups.length} {group.varietyGroups.length === 1 ? "variety" : "varieties"} · {group.items.length} lot{group.items.length !== 1 ? "s" : ""}
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vv-bg2)] text-[var(--vv-t1)] transition-colors hover:bg-[var(--vv-acc-bg)] hover:text-[var(--vv-acc)]">
              {showVarieties ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>
          {repLot && repLot.currentStage <= 3 && (
            <Link
              to={`/purchase/new?shop=${encodeURIComponent(group.shop)}&sourceType=${encodeURIComponent(group.sourceType)}&date=${encodeURIComponent(group.date)}&stage=${repLot.currentStage}`}
              state={{ returnTo: location.pathname }}
              title="Add a new lot to this shop visit"
              className="flex items-center gap-1 rounded-vv-sm bg-[var(--vv-acc-bg)] px-2 py-1 text-[10px] font-bold text-[var(--vv-acc)] transition-colors hover:bg-[var(--vv-acc)] hover:text-white"
            >
              <Plus size={11} />
              Add Lot
            </Link>
          )}
        </div>

        {showVarieties && (
          <div className="mt-2 flex flex-col gap-1.5">
            {group.varietyGroups.map((vg) => (
              <VarietySection
                key={vg.variety}
                vg={vg}
                expanded={expandedVarieties.has(vg.variety)}
                onToggle={() => toggleVariety(vg.variety)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Assignment strip (Moto/Muscle Team) ── */}
      {!allRejected && !allSettled && (
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
              title={`Entered ${STAGE_NAMES[repLot.currentStage]} at ${new Date(enteredAt).toLocaleString("en-IN")}`}
            >
              <Clock size={10} className="-mt-0.5 mr-0.5 inline" />
              At {STAGE_NAMES[repLot.currentStage]} since {fmtTime(enteredAt)} · {fmtRelTime(enteredAt)}
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
                  menuPath={STAGE_MENU_PATH[repLot.currentStage] ?? "/purchase"}
                  current={currentAssignee}
                  onSelect={async (name) => {
                    for (const lot of activeLots) await assignToStage(lot.id, name);
                    setAssignOpen(false);
                  }}
                  onClose={() => setAssignOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Shop Stage History — workflow notes only, deduplicated ── */}
      {shopWorkflowNotes.length > 0 && (
        <div className="border-t-[0.5px] border-[var(--vv-bd)] pt-2">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
            Stage History
          </div>
          <div className="flex flex-col gap-1.5">
            {shopWorkflowNotes.map((n, i) => (
              <div key={i} className="flex flex-wrap items-baseline gap-x-1 text-[10px] leading-snug">
                <span className="font-bold text-[var(--vv-t1)]">
                  {STAGE_TEAMS[n.stage as PurchaseStage] ?? `Stage ${n.stage}`}
                </span>
                <span className="vv-mono text-[9px] text-[var(--vv-t3)]">({fmtDateTime(n.at)}):</span>
                <span className="text-[var(--vv-t2)]">{n.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action footer ── */}
      <div className="flex flex-col gap-2 border-t-[0.5px] border-[var(--vv-bd)] pt-2.5">
        {pendingAction && (
          <div className="flex flex-col gap-2 rounded-vv-sm border border-[var(--vv-bd2)] bg-[var(--vv-bg1)] p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
              {pendingAction === "advance" && `Note for ${STAGE_TEAMS[(repLot.currentStage + 1) as PurchaseStage] ?? "next team"}`}
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

        {!pendingAction && (
          allRejected ? (
            <Pill tone="danger">
              <XCircle size={11} />
              Rejected · stage closed
            </Pill>
          ) : repLot.currentStage >= 6 ? (
            allSettled ? (
              <Pill tone="success">
                <Lock size={11} />
                Settled · payment closed
              </Pill>
            ) : (
              <>
                {repLot.accountsStatus === "info-requested" && (
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
          ) : repLot.currentStage === 2 ? (
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
                <ArrowRight size={13} className="shrink-0" />
              </Button>
              <Button size="sm" variant="soft-danger" onClick={() => openAction("reject")} title="Reject all lots" className="shrink-0">
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
