/**
 * Vivardhaa domain types — shared across all features.
 */

export type Variety = "Teja" | "334" | "341" | "Number 5";

export type Mark = "AA" | "A" | "B" | "C";

export type Destination = "Godown" | "AC" | "Direct Load" | "Raasi";

/** Where the purchase originates — captured at Stage 1. */
export type SourceType = "Agri Form" | "AC" | "Yard" | "Network";

export type DestemmingPoint = "Point A" | "Point B" | "Point C" | "Point D";

export type Probability = 0 | 30 | 70 | 100;

export type PurchaseStage = 1 | 2 | 3 | 4 | 5 | 6;

export const VARIETIES: Variety[] = ["Teja", "334", "341", "Number 5"];
export const MARKS: Mark[] = ["AA", "A", "B", "C"];
export const DESTINATIONS: Destination[] = [
  "Godown",
  "AC",
  "Direct Load",
  "Raasi",
];
export const SOURCE_TYPES: SourceType[] = [
  "Agri Form",
  "AC",
  "Yard",
  "Network",
];
export const DESTEMMING_POINTS: DestemmingPoint[] = [
  "Point A",
  "Point B",
  "Point C",
  "Point D",
];

export const DESTEMMING_POINT_COLOR: Record<DestemmingPoint, string> = {
  "Point A": "#3b82f6",
  "Point B": "#10b981",
  "Point C": "#f97316",
  "Point D": "#8b5cf6",
};

export const DESTEMMING_POINT_ICON: Record<DestemmingPoint, string> = {
  "Point A": "🅰",
  "Point B": "🅱",
  "Point C": "🅲",
  "Point D": "🅳",
};

export const DESTEMMING_POINT_SUBTITLE: Record<DestemmingPoint, string> = {
  "Point A": "Main floor · north line",
  "Point B": "Main floor · south line",
  "Point C": "Annexe · slow line",
  "Point D": "Yard shed · overflow",
};

export const SOURCE_TYPE_COLOR: Record<SourceType, string> = {
  "Agri Form": "#10b981",
  AC: "#3b82f6",
  Yard: "#f97316",
  Network: "#8b5cf6",
};

export const SOURCE_TYPE_ICON: Record<SourceType, string> = {
  "Agri Form": "🌾",
  AC: "❄",
  Yard: "🏬",
  Network: "👥",
};

export const SOURCE_TYPE_SUBTITLE: Record<SourceType, string> = {
  "Agri Form": "Direct from farmer",
  AC: "Cold-storage holder",
  Yard: "Market yard / mandi",
  Network: "Broker / agent network",
};

export const VARIETY_COLOR: Record<Variety, string> = {
  Teja: "#f97316",
  "334": "#3b82f6",
  "341": "#10b981",
  "Number 5": "#8b5cf6",
};

export const VARIETY_SUBTITLE: Record<Variety, string> = {
  Teja: "Most common",
  "334": "Premium grade",
  "341": "High demand",
  "Number 5": "Low grade",
};

export const DESTINATION_COLOR: Record<Destination, string> = {
  Godown: "#10b981",
  AC: "#3b82f6",
  "Direct Load": "#f97316",
  Raasi: "#8b5cf6",
};

export const DESTINATION_ICON: Record<Destination, string> = {
  Godown: "🏚",
  AC: "❄",
  "Direct Load": "🚛",
  Raasi: "☀",
};

export const DESTINATION_SUBTITLE: Record<Destination, string> = {
  Godown: "Main storage",
  AC: "Cold storage",
  "Direct Load": "Load to vehicle",
  Raasi: "Sun drying",
};

export const STAGE_NAMES: Record<PurchaseStage, string> = {
  1: "Purchase planning",
  2: "Machule check",
  3: "Weighing",
  4: "Loading",
  5: "Receipt confirm",
  6: "Accounts",
};

export const STAGE_TEAMS: Record<PurchaseStage, string> = {
  1: "Purchase Team",
  2: "Machule Team",
  3: "Weighing Team",
  4: "Loading Team",
  5: "Receipt Confirm",
  6: "Accounts Team",
};

export const MARK_LABEL: Record<Mark, string> = {
  AA: "AA — Top grade",
  A: "A — Grade 1",
  B: "B — Grade 2",
  C: "C — Grade 3",
};

/**
 * A note left by a team at a specific stage.
 *
 * kind:
 *  "lot"      → entered during lot creation or lot editing. Belongs to that lot only.
 *  "workflow" → entered during a stage transition (advance / reject / settle / assign).
 *               Belongs to the shop workflow, never to an individual lot.
 *  undefined  → legacy note (created before this field existed). Use isLotNote() /
 *               isWorkflowNote() which apply text-based heuristics for legacy records.
 */
export interface PurchaseNote {
  /** Stage at which the note was added */
  stage: PurchaseStage;
  /** Free-form text */
  text: string;
  /** ISO timestamp */
  at: string;
  /** Discriminates lot notes from shop-level workflow notes. */
  kind?: "lot" | "workflow";
}

/**
 * Texts that the system auto-fills for stage transitions (advance / reject / etc.).
 * Any legacy note (no kind field) whose text matches one of these is a workflow note,
 * not a lot note — even if its stage number is 1.
 */
const WORKFLOW_SYSTEM_TEXTS = new Set([
  "Sent to Machule team.",
  "Cleared Machule.",
  "Weight confirmed.",
  "Handed over to vehicle.",
  "Received at destination.",
  "Validated · payment settled.",
  "Holding for more info.",
  "Rejected.",
]);

/** Returns true if this note was entered at lot creation or lot editing. */
export function isLotNote(n: PurchaseNote): boolean {
  // New data: trust the explicit kind tag
  if (n.kind !== undefined) return n.kind === "lot";
  // Legacy fallback: stage > 1 is always a workflow note
  if (n.stage !== 1) return false;
  // Legacy stage-1 note: workflow if it matches a system default text or is an assignment note
  if (WORKFLOW_SYSTEM_TEXTS.has(n.text)) return false;
  if (n.text.startsWith("Assigned to ") || n.text.startsWith("Unassigned at stage")) return false;
  // Any other stage-1 text was typed by the user at lot creation/edit → lot note
  return true;
}

/** Returns true if this note belongs to the shop-level workflow (stage transitions). */
export function isWorkflowNote(n: PurchaseNote): boolean {
  if (n.kind !== undefined) return n.kind === "workflow";
  return !isLotNote(n);
}

/**
 * Sub-status while an item sits at stage 6 (Accounts).
 *  - pending          → Just arrived. Awaiting validation by Accounts team.
 *  - info-requested   → Accounts is holding for clarification (missing slip,
 *                       price mismatch, etc.). Earlier teams should respond.
 *  - settled          → Validated, payment closed. Terminal — no further action.
 */
export type AccountsStatus = "pending" | "info-requested" | "settled";

/**
 * A purchase item — captured at Stage 1, then progressed through stages 2-6.
 */
export interface PurchaseItem {
  id: string;
  date: string; // ISO date
  /** Where this purchase happened — farm, AC holder, yard, or broker network. */
  sourceType: SourceType;
  shop: string;
  /** For non-Yard source types: additional details about the source (e.g. agent name, farm details). */
  sourceDetails?: string;
  variety: Variety;
  type: string;
  mark: Mark;
  bags: number;
  kg: number;
  price: number; // ₹ per KG
  /** Individual bag weights in KG, recorded when using individual-bags weighing mode. */
  bagWeights?: number[];
  destination: Destination;
  /** Optional details about the destination — e.g. address, contact, bay number. */
  destinationDetails?: string;
  /**
   * Deadline by which this lot must be dispatched out of its destination
   * (godown / AC / direct load / Raasi). Stored as an ISO date (YYYY-MM-DD).
   * The list view flags rows in red when ≤ 5 days remain so the team can
   * prioritise outward movement.
   */
  dispatchDeadline: string;
  /** current stage 1-6 */
  currentStage: PurchaseStage;
  /** buy probability — 30 initial, 70 after Machule pass, 100 after Weighing pass, 0 if rejected */
  probability: Probability;
  /** true if rejected at any stage */
  isRejected: boolean;
  /** Per-stage notes timeline — every team's remark is preserved here. */
  notes: PurchaseNote[];
  /**
   * ISO timestamp captured the moment the item *entered* each stage. Stage 1
   * is set at creation; later stages are filled in by advanceStage. Used by
   * the UI to show "Entered Machule at 14:32" so each team knows how long an
   * item has been waiting in their queue.
   */
  stageEnteredAt: Partial<Record<PurchaseStage, string>>;
  /**
   * Per-stage assignment — who is responsible for this item at each stage.
   * Filled in by the team lead once the item arrives in their queue.
   * Resets per stage: the Machule assignee differs from the Weighing assignee.
   */
  stageAssignee: Partial<Record<PurchaseStage, string>>;
  /**
   * Accounts validation state. Only meaningful while currentStage === 6;
   * undefined for items that haven't reached Accounts yet.
   */
  accountsStatus?: AccountsStatus;
  /** ISO timestamp */
  createdAt: string;
}

export interface PurchaseFilters {
  /** "all" → no date filter at all, "single" → one day, "range" → from/to */
  dateMode: "all" | "range" | "single";
  rangeStart: string;
  rangeEnd: string;
  singleDate: string;
  variety: Variety | "all";
  stage: PurchaseStage | "all";
  /**
   * Dispatch-window filter — when a number N is set, only items whose
   * `dispatchDeadline` is within N days (or already overdue) are kept.
   * `"all"` disables the filter. Anchored to today.
   */
  dispatchWithinDays: number | "all";
  /** Shop filter — empty string means "all shops". */
  shop: string;
}

// ---------------------------------------------------------------------------
// Destemming · Phase 2
// ---------------------------------------------------------------------------

/**
 * A destemming job's lifecycle status.
 *  - draft    → Created from a settled purchase. No dispatches yet.
 *  - sent     → Stock allocated to one or more points; nothing received back.
 *  - partial  → Some dispatches closed (stemless or with-stem returned to
 *               pool); others still in flight, OR returned-with-stem stock
 *               is waiting in the pool to be re-dispatched.
 *  - received → All dispatches closed AND the unallocated pool is empty
 *               (every KG has ultimately come back stemless).
 */
export type DestemmingStatus = "draft" | "sent" | "partial" | "received";

export const DESTEMMING_STATUSES: DestemmingStatus[] = [
  "draft",
  "sent",
  "partial",
  "received",
];

export const DESTEMMING_STATUS_LABEL: Record<DestemmingStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partial: "Partially received",
  received: "Received",
};

/**
 * A single send/receive pair: stock dispatched to one destemming point and
 * (eventually) the weight returned from that point. A job can have many of
 * these — one per point, or one per re-send after an evening with-stem return.
 *
 * Return types:
 *   'stemless'  → destemming complete at the point; `receivedKg` = clean output.
 *   'with-stem' → returned unfinished (e.g. evening close-out); `returnedStemKg`
 *                 / `returnedStemBags` re-enter the unallocated pool so the lot
 *                 can be re-dispatched next day or when a point is available.
 *
 * A dispatch is "closed" (no longer in-flight) when `receivedAt` is set,
 * regardless of which return type was used.
 */
export interface DestemmingDispatch {
  /** Unique within the parent job; lets the UI key/edit a single row. */
  id: string;
  point: DestemmingPoint;
  /** Stock sent to the point — bags + gross (with-stem) KG. */
  sentBags: number;
  sentKg: number;
  /** ISO timestamp when this dispatch was sent. */
  sentAt: string;
  /**
   * How the stock was returned. Undefined while the dispatch is in flight.
   *   'stemless'  → job done at the point; receivedKg holds the clean weight.
   *   'with-stem' → returned unfinished; returnedStemKg/Bags re-enter pool.
   */
  returnType?: "stemless" | "with-stem" | "partial";
  /** Stem-free output weight. Set when returnType === 'stemless'. */
  receivedKg?: number;
  /** Weight returned WITH stems still attached. Set when returnType === 'with-stem'. */
  returnedStemKg?: number;
  /** Bags returned with stems. Set when returnType === 'with-stem'. */
  returnedStemBags?: number;
  /** ISO timestamp set for both return types when the dispatch is closed. */
  receivedAt?: string;
  /** ₹ per KG charged by the destemming point for this dispatch. */
  pricePerKg?: number;
  /** Allowed shortage as a percentage of sentKg (e.g. 2 = 2%). */
  shortagePct?: number;
  /** Gunny-bag tare weight per bag in KG (default 1.5). */
  bagWeightKg?: number;
  /** Operator note tagged to this dispatch. */
  note?: string;
}

/** A note attached to a destemming job. Free-form audit timeline. */
export interface DestemmingNote {
  text: string;
  /** ISO timestamp */
  at: string;
  /** Optional context — which dispatch / point this relates to. */
  point?: DestemmingPoint;
}

/**
 * One destemming job — destems all the chillies of a single settled purchase
 * lot. The job links back to the source purchase for traceability and snapshots
 * the relevant fields so rendering doesn't depend on join lookups.
 */
export interface DestemmingJob {
  id: string;
  /** ID of the source PurchaseItem (must be currentStage 6 + settled). */
  purchaseId: string;
  /** Snapshotted at job creation so the row renders cleanly. */
  shop: string;
  variety: Variety;
  type: string;
  mark: Mark;
  /** Whole-lot input, copied from the source purchase at creation time. */
  inputBags: number;
  inputKg: number;
  /** ₹ / KG of the source purchase — used to compute lot value. */
  sourcePricePerKg: number;
  /**
   * Where the lot is currently sitting (Godown / AC / Direct Load / Raasi).
   * Snapshotted from the source purchase at job-creation time so the row can
   * tell the operator which floor to send people to.
   */
  destination: Destination;
  /** ISO date the destemming job was created. */
  date: string;
  /** Send-outs and receipts. Empty for a draft job. */
  dispatches: DestemmingDispatch[];
  /** Computed status (see DestemmingStatus). Stored so chips render fast. */
  status: DestemmingStatus;
  /** Optional ops notes timeline. */
  notes: DestemmingNote[];
  /** ISO timestamp */
  createdAt: string;
}

export interface DestemmingFilters {
  dateMode: "all" | "range" | "single";
  rangeStart: string;
  rangeEnd: string;
  singleDate: string;
  variety: Variety | "all";
  status: DestemmingStatus | "all";
  point: DestemmingPoint | "all";
  /**
   * Only meaningful when `point` is set. Lets the operator narrow the row's
   * projection to in-flight (sent · not yet received) or received dispatches.
   * "all" keeps both. Has no effect when `point === "all"`.
   */
  pointStatus: "all" | "in-flight" | "received";
}

// ---------------------------------------------------------------------------
// Raasi (sun drying) · Phase 2
// ---------------------------------------------------------------------------

/**
 * Source of the chillies entering a Raasi batch. Operators may either send a
 * settled purchase whose destination was Raasi straight to the yard, OR send
 * the destemmed output of a destemming job for further drying.
 */
export type RaasiSourceType = "purchase" | "destemming";

/**
 * Lifecycle of a Raasi batch.
 *  - drying    → Spread on the yard. Days-drying counter ticks until collected.
 *  - collected → Swept up and bagged. Output dry KG + collection date set.
 */
export type RaasiStatus = "drying" | "collected";

export const RAASI_STATUSES: RaasiStatus[] = ["drying", "collected"];

export const RAASI_STATUS_LABEL: Record<RaasiStatus, string> = {
  drying: "Drying",
  collected: "Collected",
};

export const RAASI_SOURCE_TYPES: RaasiSourceType[] = ["purchase", "destemming"];

export const RAASI_SOURCE_LABEL: Record<RaasiSourceType, string> = {
  purchase: "Purchase",
  destemming: "Destemming",
};

export const RAASI_SOURCE_ICON: Record<RaasiSourceType, string> = {
  purchase: "🛒",
  destemming: "🌬",
};

/** Free-form note attached to a Raasi batch's audit timeline. */
export interface RaasiNote {
  text: string;
  /** ISO timestamp */
  at: string;
}

/**
 * One Raasi (sun-drying) batch. The whole lot moves together — there's no
 * splitting like Destemming has. The operator records wet KG when spread,
 * then dry KG when collected; days drying = collectedDate − spreadDate (or
 * today − spreadDate while still drying).
 */
export interface RaasiBatch {
  id: string;
  /** Where the input came from. */
  sourceType: RaasiSourceType;
  /**
   * IDs of every source record merged into this batch. All entries are of
   * the same `sourceType` (purchases OR destemming jobs, never mixed).
   * Length ≥ 1; multiple entries means the operator combined several lots
   * onto one yard plot to dry as a single batch.
   */
  sourceIds: string[];
  /**
   * Snapshotted at create time from the *first* selected source — used for
   * the colored variety stripe and the row's primary identity. When more
   * than one source is merged, `shop` reads "Lakshmi + 2 more" so the row
   * still reads cleanly. Source-level traceability lives in `sourceIds`.
   */
  shop: string;
  variety: Variety;
  type: string;
  mark: Mark;
  /** Bags spread on the yard. */
  inputBags: number;
  /** Wet KG laid out. For destemming-sourced batches this is the destemmed
   *  weight that's still moist enough to need sun. */
  inputWetKg: number;
  /** ISO date the batch was spread (drying began). */
  spreadDate: string;
  /** ISO date when collected. Undefined while still drying. */
  collectedDate?: string;
  /** Output (dry) KG. Undefined while still drying. */
  outputDryKg?: number;
  /** Lifecycle. Stored so chips render fast. */
  status: RaasiStatus;
  /** Audit notes timeline. */
  notes: RaasiNote[];
  /** ISO timestamp */
  createdAt: string;
}

export interface RaasiFilters {
  dateMode: "all" | "range" | "single";
  rangeStart: string;
  rangeEnd: string;
  singleDate: string;
  variety: Variety | "all";
  status: RaasiStatus | "all";
  sourceType: RaasiSourceType | "all";
}

// ---------------------------------------------------------------------------
// Outward orders · Phase 4
// ---------------------------------------------------------------------------

/**
 * Lifecycle of an outward order.
 *  1 Order      → Customer request booked. No inventory allocated yet.
 *  2 Allocate   → Inventory lots tagged. Total allocated KG ≥ targetKg.
 *  3 Deliver    → Vehicle loaded, dispatched and delivered to customer.
 *                 (Combines what used to be Dispatch + Delivered into one
 *                  visible "in flight + handed over" step.)
 *  4 Settlement → Awaiting payment. Pending until operator clicks
 *                 "Mark settled" → `settledAt` set, terminal.
 */
export type OrderStage = 1 | 2 | 3 | 4;

export const ORDER_STAGES: OrderStage[] = [1, 2, 3, 4];

export const ORDER_STAGE_NAMES: Record<OrderStage, string> = {
  1: "Order",
  2: "Allocate",
  3: "Deliver",
  4: "Settlement",
};

export const ORDER_STAGE_TEAMS: Record<OrderStage, string> = {
  1: "Sales",
  2: "Warehouse",
  3: "Loading",
  4: "Accounts",
};

/**
 * Kind of source an order allocation pulls from. Inventory unifies three
 * upstream paths: a Raasi collected batch, a destemming received job, or a
 * stage-6 purchase that never went through processing.
 */
export type OrderSourceKind = "purchase" | "destemming" | "raasi";

export const ORDER_SOURCE_ICON: Record<OrderSourceKind, string> = {
  purchase: "🛒",
  destemming: "🌬",
  raasi: "☀",
};

export const ORDER_SOURCE_LABEL: Record<OrderSourceKind, string> = {
  purchase: "Purchase",
  destemming: "Destemming",
  raasi: "Raasi",
};

/**
 * A single chunk of inventory tagged to fulfill an order. An order can have
 * many of these — small orders take from one lot, larger orders pull bits
 * from several.
 */
export interface OrderAllocationLot {
  /** Unique within the parent order; lets the UI key/edit a single row. */
  id: string;
  sourceKind: OrderSourceKind;
  /** ID of the upstream record (purchase / destemming job / raasi batch). */
  sourceId: string;
  /** Snapshotted for display + traceability — copied at allocation time. */
  shop: string;
  variety: Variety;
  type: string;
  mark: Mark;
  /** KG drawn from this lot. */
  allocatedKg: number;
  /** ISO timestamp when allocation happened. */
  allocatedAt: string;
  /** Optional operator note attached to the allocation. */
  note?: string;
}

/** Audit note tagged with the stage at which it was added. */
export interface OrderNote {
  stage: OrderStage;
  text: string;
  at: string;
}

/**
 * One outward sales order. Customer-driven entry point for the dispatch
 * pipeline. Allocations link forward to inventory lots; the row uses those
 * links for traceability and for the per-lot back-pills shown elsewhere.
 */
export interface Order {
  id: string;
  /** Customer / buyer name. */
  customer: string;
  /** Optional city / town for the dispatch address. */
  destinationCity?: string;
  /** ISO date the order was taken. */
  date: string;
  /** What the customer wants. */
  variety: Variety;
  mark: Mark;
  /** Target KG to fulfill. */
  targetKg: number;
  /** ₹ per KG sale price. */
  pricePerKg: number;
  /** ISO date by which delivery must happen. Optional. */
  deliveryDeadline?: string;
  /** Where in the pipeline this order currently sits. */
  currentStage: OrderStage;
  /**
   * ISO timestamp captured when the operator clicked "Mark settled" at
   * Stage 4 (Settlement). Undefined while the order is sitting in
   * pending-settlement. Presence flips Stage 4 to its terminal state.
   */
  settledAt?: string;
  /** True if the order was cancelled at any stage. */
  isCancelled: boolean;
  /** Source lots tagged to this order. Length 0 in stage 1, grows over time. */
  allocations: OrderAllocationLot[];
  /** Audit timeline; every stage advance / assignment auto-appends one. */
  notes: OrderNote[];
  /** ISO timestamp captured when the order *entered* each stage. */
  stageEnteredAt: Partial<Record<OrderStage, string>>;
  /** Per-stage assignment — who's responsible at each stage. */
  stageAssignee: Partial<Record<OrderStage, string>>;
  /** ISO timestamp */
  createdAt: string;
}

export interface OrderFilters {
  dateMode: "all" | "range" | "single";
  rangeStart: string;
  rangeEnd: string;
  singleDate: string;
  variety: Variety | "all";
  stage: OrderStage | "all";
  /** Free-text customer name substring. Empty = no filter. */
  customer: string;
}
