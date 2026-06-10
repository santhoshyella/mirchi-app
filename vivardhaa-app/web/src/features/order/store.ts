import { create } from "zustand";
import {
  type Order,
  type OrderAllocationLot,
  type OrderFilters,
  type OrderNote,
  type OrderSourceKind,
  type OrderStage,
  type Mark,
  type Variety,
} from "@/types/domain";
import { todayISO } from "@/lib/format";
import { ordersApi, type OrderApiItem } from "@/lib/api";

export const DEFAULT_ORDER_ADVANCE_NOTE: Record<OrderStage, string> = {
  1: "Inventory allocated.",
  2: "Loaded · dispatched to customer.",
  3: "Delivered · awaiting payment settlement.",
  4: "",
};

export const DEFAULT_ORDER_SETTLE_NOTE = "Payment received · settled.";

export const defaultFilters: OrderFilters = {
  dateMode: "single",
  rangeStart: todayISO(),
  rangeEnd: todayISO(),
  singleDate: todayISO(),
  variety: "all",
  stage: "all",
  customer: "",
};

export type OrderDraft = Omit<
  Order,
  | "id"
  | "currentStage"
  | "isCancelled"
  | "allocations"
  | "notes"
  | "stageEnteredAt"
  | "stageAssignee"
  | "createdAt"
> & {
  initialNote?: string;
  initialAllocations?: Array<{
    sourceKind: OrderSourceKind;
    sourceId: string;
    shop: string;
    variety: Variety;
    type: string;
    mark: Mark;
    allocatedKg: number;
    note?: string;
  }>;
};

function mapApiOrder(o: OrderApiItem): Order {
  return {
    id: o.id,
    customer: o.customer,
    destinationCity: o.destinationCity,
    date: o.date,
    variety: o.variety as Variety,
    mark: o.mark as Mark,
    targetKg: Number(o.targetKg),
    pricePerKg: Number(o.pricePerKg),
    deliveryDeadline: o.deliveryDeadline,
    currentStage: o.currentStage as OrderStage,
    settledAt: o.settledAt,
    isCancelled: o.isCancelled,
    allocations: o.allocations.map(
      (a): OrderAllocationLot => ({
        id: a.id,
        sourceKind: a.sourceKind as OrderSourceKind,
        sourceId: a.sourceId,
        shop: a.shop,
        variety: a.variety as Variety,
        type: a.type,
        mark: a.mark as Mark,
        allocatedKg: Number(a.allocatedKg),
        allocatedAt: a.allocatedAt,
        note: a.note,
      })
    ),
    notes: o.notes.map(
      (n): OrderNote => ({
        stage: n.stage as OrderStage,
        text: n.text,
        at: n.at,
      })
    ),
    stageEnteredAt: Object.fromEntries(
      Object.entries(o.stageEnteredAt).map(([k, v]) => [Number(k), v])
    ) as Order["stageEnteredAt"],
    stageAssignee: Object.fromEntries(
      Object.entries(o.stageAssignee).map(([k, v]) => [Number(k), v])
    ) as Order["stageAssignee"],
    createdAt: o.createdAt,
  };
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  setFilters: (next: Partial<OrderFilters>) => void;
  resetFilters: () => void;
  fetchOrders: () => Promise<void>;
  addOrder: (draft: OrderDraft) => Promise<Order>;
  getOrder: (id: string) => Order | undefined;
  advanceStage: (id: string, remark?: string) => Promise<void>;
  settleOrder: (id: string, remark?: string) => Promise<void>;
  cancelOrder: (id: string, reason?: string) => Promise<void>;
  addAllocation: (
    id: string,
    alloc: Omit<OrderAllocationLot, "id" | "allocatedAt">
  ) => Promise<void>;
  removeAllocation: (orderId: string, allocId: string) => Promise<void>;
  assignToStage: (id: string, assignee: string, stage?: OrderStage) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,
  filters: defaultFilters,

  setFilters: (next) =>
    set((state) => ({ filters: { ...state.filters, ...next } })),

  resetFilters: () => set({ filters: defaultFilters }),

  getOrder: (id) => get().orders.find((o) => o.id === id),

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params: Parameters<typeof ordersApi.list>[0] = {};
      if (filters.dateMode === "single" && filters.singleDate) {
        params.date = filters.singleDate;
      } else if (
        filters.dateMode === "range" &&
        filters.rangeStart &&
        filters.rangeEnd
      ) {
        params.rangeStart = filters.rangeStart;
        params.rangeEnd = filters.rangeEnd;
      }
      if (filters.variety !== "all") params.variety = filters.variety;
      if (filters.stage !== "all") params.stage = filters.stage as number;
      if (filters.customer) params.customer = filters.customer;

      const data = await ordersApi.list(params);
      set({ orders: data.map(mapApiOrder), loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  addOrder: async (draft) => {
    const { initialNote, initialAllocations, ...rest } = draft;
    const data = await ordersApi.create({
      ...rest,
      initialNote,
      initialAllocations,
    });
    const order = mapApiOrder(data);
    set((state) => ({ orders: [order, ...state.orders] }));
    return order;
  },

  advanceStage: async (id, remark) => {
    try {
      const data = await ordersApi.advance(id, remark);
      const updated = mapApiOrder(data);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updated : o)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  settleOrder: async (id, remark) => {
    try {
      const data = await ordersApi.settle(id, remark);
      const updated = mapApiOrder(data);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updated : o)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  cancelOrder: async (id, reason) => {
    try {
      const data = await ordersApi.cancel(id, reason);
      const updated = mapApiOrder(data);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updated : o)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addAllocation: async (id, alloc) => {
    try {
      const data = await ordersApi.addAllocation(id, alloc);
      const updated = mapApiOrder(data);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updated : o)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  removeAllocation: async (orderId, allocId) => {
    try {
      const data = await ordersApi.removeAllocation(orderId, allocId);
      const updated = mapApiOrder(data);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? updated : o)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  assignToStage: async (id, assignee, stage) => {
    try {
      const order = get().orders.find((o) => o.id === id);
      const targetStage = stage ?? order?.currentStage;
      const data = await ordersApi.assign(id, assignee, targetStage);
      const updated = mapApiOrder(data);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updated : o)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
