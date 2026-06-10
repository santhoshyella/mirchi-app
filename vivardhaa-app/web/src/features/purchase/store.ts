import { create } from "zustand";
import {
  type AccountsStatus,
  type Probability,
  type PurchaseFilters,
  type PurchaseItem,
  type PurchaseNote,
  type PurchaseStage,
} from "@/types/domain";
import { todayISO } from "@/lib/format";
import { purchasesApi, type CreatePurchasePayload, type UpdatePurchasePayload } from "@/lib/api";

/** Default note text Accounts leaves when settling / requesting info. */
export const DEFAULT_SETTLE_NOTE = "Validated · payment settled.";
export const DEFAULT_INFO_REQUEST_NOTE = "Holding for more info.";

/** Default note text the *acting* team leaves when moving an item forward. */
export const DEFAULT_ADVANCE_NOTE: Record<PurchaseStage, string> = {
  1: "Sent to Machule team.",
  2: "Cleared Machule.",
  3: "Weight confirmed.",
  4: "Handed over to vehicle.",
  5: "Received at destination.",
  6: "",
};

/** Map an API response object to the frontend PurchaseItem shape. */
function mapApiItem(raw: Awaited<ReturnType<typeof purchasesApi.get>>): PurchaseItem {
  return {
    id: raw.id,
    date: raw.date,
    sourceType: raw.sourceType as PurchaseItem["sourceType"],
    shop: raw.shop,
    sourceDetails: raw.sourceDetails,
    variety: raw.variety as PurchaseItem["variety"],
    type: raw.type,
    mark: raw.mark as PurchaseItem["mark"],
    bags: Number(raw.bags),
    kg: Number(raw.kg),
    price: Number(raw.price),
    bagWeights: raw.bagWeights ?? undefined,
    destination: raw.destination as PurchaseItem["destination"],
    destinationDetails: raw.destinationDetails,
    dispatchDeadline: raw.dispatchDeadline,
    currentStage: raw.currentStage as PurchaseStage,
    probability: raw.probability as Probability,
    isRejected: raw.isRejected,
    notes: (raw.notes ?? []) as PurchaseNote[],
    stageEnteredAt: raw.stageEnteredAt as PurchaseItem["stageEnteredAt"],
    stageAssignee: raw.stageAssignee as PurchaseItem["stageAssignee"],
    accountsStatus: raw.accountsStatus as AccountsStatus | undefined,
    createdAt: raw.createdAt,
  };
}

export const defaultFilters: PurchaseFilters = {
  dateMode: "single",
  rangeStart: todayISO(),
  rangeEnd: todayISO(),
  singleDate: todayISO(),
  variety: "all",
  stage: "all",
  dispatchWithinDays: "all",
  shop: "",
};

export type PurchaseDraft = Omit<
  PurchaseItem,
  | "id"
  | "currentStage"
  | "probability"
  | "isRejected"
  | "createdAt"
  | "notes"
  | "stageEnteredAt"
  | "stageAssignee"
  | "accountsStatus"
  | "bags"
  | "kg"
  | "destination"
  | "dispatchDeadline"
> & {
  bags?: number;
  kg?: number;
  destination?: PurchaseItem["destination"];
  dispatchDeadline?: string;
  initialNote?: string;
  /** Stage to create the lot at (1–3). Used when adding a lot to an existing group. */
  initialStage?: number;
};

interface PurchaseState {
  items: PurchaseItem[];
  loading: boolean;
  error: string | null;
  filters: PurchaseFilters;

  /** Load purchases from the API (call on list page mount). */
  fetchItems: () => Promise<void>;

  setFilters: (next: Partial<PurchaseFilters>) => void;
  resetFilters: () => void;

  /** Create a new purchase via the API and prepend it to local state. */
  addItem: (draft: PurchaseDraft) => Promise<PurchaseItem>;

  /** Update a stage-1 purchase's fields via the API. */
  updateItem: (id: string, payload: UpdatePurchasePayload) => Promise<PurchaseItem>;

  getItem: (id: string) => PurchaseItem | undefined;
  advanceStage: (id: string, remark?: string) => Promise<void>;
  rejectItem: (id: string, reason?: string) => Promise<void>;
  settleAtAccounts: (id: string, remark?: string) => Promise<void>;
  requestAccountsInfo: (id: string, remark?: string) => Promise<void>;
  assignToStage: (id: string, assignee: string, stage?: PurchaseStage) => Promise<void>;
  addNote: (id: string, text: string) => Promise<PurchaseItem>;
}

/** Replace a single item in the list by id with the API-returned version. */
function replaceItem(items: PurchaseItem[], updated: PurchaseItem): PurchaseItem[] {
  return items.map((it) => (it.id === updated.id ? updated : it));
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  filters: defaultFilters,

  // ── Filters ──────────────────────────────────────────────────────────────

  setFilters: (next) =>
    set((state) => ({ filters: { ...state.filters, ...next } })),

  resetFilters: () => set({ filters: defaultFilters }),

  // ── Read ─────────────────────────────────────────────────────────────────

  getItem: (id) => get().items.find((i) => i.id === id),

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params: Parameters<typeof purchasesApi.list>[0] = {};

      if (filters.dateMode === "single") {
        params.date = filters.singleDate;
      } else if (filters.dateMode === "range") {
        params.rangeStart = filters.rangeStart;
        params.rangeEnd = filters.rangeEnd;
      }
      if (filters.variety !== "all") params.variety = filters.variety;
      if (filters.stage !== "all") params.stage = filters.stage;

      const raw = await purchasesApi.list(params);
      set({ items: raw.map(mapApiItem), loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  // ── Mutations ────────────────────────────────────────────────────────────

  addItem: async (draft) => {
    const payload: CreatePurchasePayload = {
      date: draft.date,
      sourceType: draft.sourceType,
      shop: draft.shop,
      sourceDetails: (draft as any).sourceDetails,
      variety: draft.variety,
      type: draft.type,
      mark: draft.mark,
      bags: draft.bags,
      kg: draft.kg,
      price: draft.price,
      bagWeights: (draft as any).bagWeights,
      destination: draft.destination,
      destinationDetails: (draft as any).destinationDetails,
      dispatchDeadline: draft.dispatchDeadline,
      initialNote: draft.initialNote,
      initialStage: draft.initialStage,
    };
    const raw = await purchasesApi.create(payload);
    const item = mapApiItem(raw);
    set((state) => ({ items: [item, ...state.items] }));
    return item;
  },

  updateItem: async (id, payload) => {
    const raw = await purchasesApi.update(id, payload);
    const item = mapApiItem(raw);
    set((state) => ({ items: replaceItem(state.items, item) }));
    return item;
  },

  advanceStage: async (id, remark) => {
    const raw = await purchasesApi.advance(id, remark);
    const updated = mapApiItem(raw);
    set((state) => ({ items: replaceItem(state.items, updated) }));
  },

  rejectItem: async (id, reason) => {
    const raw = await purchasesApi.reject(id, reason);
    const updated = mapApiItem(raw);
    set((state) => ({ items: replaceItem(state.items, updated) }));
  },

  settleAtAccounts: async (id, remark) => {
    const raw = await purchasesApi.settle(id, remark);
    const updated = mapApiItem(raw);
    set((state) => ({ items: replaceItem(state.items, updated) }));
  },

  requestAccountsInfo: async (id, remark) => {
    const raw = await purchasesApi.requestInfo(id, remark);
    const updated = mapApiItem(raw);
    set((state) => ({ items: replaceItem(state.items, updated) }));
  },

  assignToStage: async (id, assignee, stage) => {
    const raw = await purchasesApi.assign(id, assignee, stage);
    const updated = mapApiItem(raw);
    set((state) => ({ items: replaceItem(state.items, updated) }));
  },

  addNote: async (id, text) => {
    const raw = await purchasesApi.addNote(id, text);
    const updated = mapApiItem(raw);
    set((state) => ({ items: replaceItem(state.items, updated) }));
    return updated;
  },
}));
