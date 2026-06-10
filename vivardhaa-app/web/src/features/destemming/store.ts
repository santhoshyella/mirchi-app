import { create } from "zustand";
import {
  type DestemmingDispatch,
  type DestemmingFilters,
  type DestemmingJob,
  type DestemmingNote,
  type DestemmingPoint,
  type DestemmingStatus,
} from "@/types/domain";
import { todayISO } from "@/lib/format";
import { destemmingApi, type DestemmingJobApiItem } from "@/lib/api";

export const defaultFilters: DestemmingFilters = {
  dateMode: "single",
  rangeStart: todayISO(),
  rangeEnd: todayISO(),
  singleDate: todayISO(),
  variety: "all",
  status: "all",
  point: "all",
  pointStatus: "all",
};

export interface DestemmingJobDraft {
  purchaseId: string;
  initialNote?: string;
  initialDispatches?: Array<{
    point: DestemmingPoint;
    sentBags: number;
    sentKg: number;
    pricePerKg?: number;
  }>;
}

function mapApiJob(j: DestemmingJobApiItem): DestemmingJob {
  return {
    id: j.id,
    purchaseId: j.purchaseId,
    shop: j.shop,
    variety: j.variety as DestemmingJob["variety"],
    type: j.type,
    mark: j.mark as DestemmingJob["mark"],
    inputBags: Number(j.inputBags),
    inputKg: Number(j.inputKg),
    sourcePricePerKg: Number(j.sourcePricePerKg),
    destination: j.destination as DestemmingJob["destination"],
    date: j.date,
    dispatches: j.dispatches.map(
      (d): DestemmingDispatch => ({
        id: d.id,
        point: d.point as DestemmingPoint,
        sentBags: Number(d.sentBags),
        sentKg: Number(d.sentKg),
        sentAt: d.sentAt,
        returnType: d.returnType,
        receivedKg: d.receivedKg !== undefined ? Number(d.receivedKg) : undefined,
        returnedStemKg: d.returnedStemKg !== undefined ? Number(d.returnedStemKg) : undefined,
        returnedStemBags: d.returnedStemBags !== undefined ? Number(d.returnedStemBags) : undefined,
        receivedAt: d.receivedAt,
        pricePerKg: d.pricePerKg !== undefined ? Number(d.pricePerKg) : undefined,
        shortagePct: d.shortagePct !== undefined ? Number(d.shortagePct) : undefined,
        bagWeightKg: d.bagWeightKg !== undefined ? Number(d.bagWeightKg) : undefined,
        note: d.note,
      })
    ),
    status: j.status as DestemmingStatus,
    notes: j.notes.map(
      (n): DestemmingNote => ({
        text: n.text,
        at: n.at,
        point: n.point as DestemmingPoint | undefined,
      })
    ),
    createdAt: j.createdAt,
  };
}

interface DestemmingState {
  jobs: DestemmingJob[];
  loading: boolean;
  error: string | null;
  filters: DestemmingFilters;
  setFilters: (next: Partial<DestemmingFilters>) => void;
  resetFilters: () => void;
  fetchJobs: () => Promise<void>;
  createJob: (draft: DestemmingJobDraft) => Promise<DestemmingJob | undefined>;
  sendToPoint: (
    jobId: string,
    point: DestemmingPoint,
    sentBags: number,
    sentKg: number,
    pricePerKg?: number,
    shortagePct?: number,
    bagWeightKg?: number,
    note?: string
  ) => Promise<void>;
  receiveFromPoint: (
    jobId: string,
    dispatchId: string,
    payload: {
      receivedKg?: number;
      returnedStemKg?: number;
      returnedStemBags?: number;
      note?: string;
    }
  ) => Promise<void>;
  addNote: (jobId: string, text: string, point?: DestemmingPoint) => Promise<void>;
  getJob: (id: string) => DestemmingJob | undefined;
}

export const useDestemmingStore = create<DestemmingState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,
  filters: defaultFilters,

  setFilters: (next) =>
    set((state) => ({ filters: { ...state.filters, ...next } })),

  resetFilters: () => set({ filters: defaultFilters }),

  getJob: (id) => get().jobs.find((j) => j.id === id),

  fetchJobs: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params: Parameters<typeof destemmingApi.list>[0] = {};
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

      const data = await destemmingApi.list(params);
      set({ jobs: data.map(mapApiJob), loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createJob: async (draft) => {
    try {
      const data = await destemmingApi.create({
        purchaseId: draft.purchaseId,
        initialNote: draft.initialNote,
        initialDispatches: draft.initialDispatches,
      });
      const job = mapApiJob(data);
      set((state) => ({ jobs: [job, ...state.jobs] }));
      return job;
    } catch (e) {
      set({ error: String(e) });
      return undefined;
    }
  },

  sendToPoint: async (jobId, point, sentBags, sentKg, pricePerKg, shortagePct, bagWeightKg, note) => {
    try {
      const data = await destemmingApi.sendToPoint(jobId, point, sentBags, sentKg, pricePerKg, shortagePct, bagWeightKg, note);
      const updated = mapApiJob(data);
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === jobId ? updated : j)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  receiveFromPoint: async (jobId, dispatchId, payload) => {
    try {
      const data = await destemmingApi.receiveFromPoint(jobId, dispatchId, payload);
      const updated = mapApiJob(data);
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === jobId ? updated : j)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addNote: async (jobId, text, point) => {
    try {
      const data = await destemmingApi.addNote(jobId, text, point);
      const updated = mapApiJob(data);
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === jobId ? updated : j)),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
