import { create } from "zustand";
import {
  type RaasiBatch,
  type RaasiFilters,
  type RaasiNote,
  type RaasiSourceType,
  type RaasiStatus,
} from "@/types/domain";
import { todayISO } from "@/lib/format";
import { raasiApi, type RaasiBatchApiItem } from "@/lib/api";

export const defaultFilters: RaasiFilters = {
  dateMode: "single",
  rangeStart: todayISO(),
  rangeEnd: todayISO(),
  singleDate: todayISO(),
  variety: "all",
  status: "all",
  sourceType: "all",
};

export interface RaasiBatchDraft {
  sourceType: RaasiSourceType;
  sourceIds: string[];
  inputBags: number;
  inputWetKg: number;
  spreadDate: string;
  initialNote?: string;
}

function mapApiBatch(b: RaasiBatchApiItem): RaasiBatch {
  return {
    id: b.id,
    sourceType: b.sourceType as RaasiSourceType,
    sourceIds: b.sourceIds,
    shop: b.shop,
    variety: b.variety as RaasiBatch["variety"],
    type: b.type,
    mark: b.mark as RaasiBatch["mark"],
    inputBags: Number(b.inputBags),
    inputWetKg: Number(b.inputWetKg),
    spreadDate: b.spreadDate,
    collectedDate: b.collectedDate,
    outputDryKg: b.outputDryKg !== undefined ? Number(b.outputDryKg) : undefined,
    status: b.status as RaasiStatus,
    notes: b.notes.map((n): RaasiNote => ({ text: n.text, at: n.at })),
    createdAt: b.createdAt,
  };
}

interface RaasiState {
  batches: RaasiBatch[];
  loading: boolean;
  error: string | null;
  filters: RaasiFilters;
  setFilters: (next: Partial<RaasiFilters>) => void;
  resetFilters: () => void;
  fetchBatches: () => Promise<void>;
  createBatch: (draft: RaasiBatchDraft) => Promise<RaasiBatch | undefined>;
  markCollected: (id: string, outputDryKg: number, note?: string) => Promise<void>;
  addNote: (id: string, text: string) => Promise<void>;
  getBatch: (id: string) => RaasiBatch | undefined;
}

export const useRaasiStore = create<RaasiState>((set, get) => ({
  batches: [],
  loading: false,
  error: null,
  filters: defaultFilters,

  setFilters: (next) =>
    set((state) => ({ filters: { ...state.filters, ...next } })),

  resetFilters: () => set({ filters: defaultFilters }),

  getBatch: (id) => get().batches.find((b) => b.id === id),

  fetchBatches: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params: Parameters<typeof raasiApi.list>[0] = {};
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
      if (filters.status !== "all") params.status = filters.status;
      if (filters.sourceType !== "all") params.sourceType = filters.sourceType;

      const data = await raasiApi.list(params);
      set({ batches: data.map(mapApiBatch), loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createBatch: async (draft) => {
    try {
      const data = await raasiApi.create({
        sourceType: draft.sourceType,
        sourceIds: draft.sourceIds,
        inputBags: draft.inputBags,
        inputWetKg: draft.inputWetKg,
        spreadDate: draft.spreadDate,
        initialNote: draft.initialNote,
      });
      const batch = mapApiBatch(data);
      set((state) => ({ batches: [batch, ...state.batches] }));
      return batch;
    } catch (e) {
      set({ error: String(e) });
      return undefined;
    }
  },

  markCollected: async (id, outputDryKg, note) => {
    try {
      const data = await raasiApi.markCollected(id, outputDryKg, note);
      const updated = mapApiBatch(data);
      set((state) => ({
        batches: state.batches.map((b) => (b.id === id ? updated : b)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addNote: async (id, text) => {
    try {
      const data = await raasiApi.addNote(id, text);
      const updated = mapApiBatch(data);
      set((state) => ({
        batches: state.batches.map((b) => (b.id === id ? updated : b)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
