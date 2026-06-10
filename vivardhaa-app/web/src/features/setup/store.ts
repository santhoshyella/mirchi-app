import { create } from "zustand";
import {
  varietiesApi,
  type MarkApiItem,
  type VarietyApiItem,
  type CreateVarietyPayload,
  type UpdateVarietyPayload,
  type CreateMarkPayload,
  type UpdateMarkPayload,
} from "@/lib/api";

export type SetupVariety = VarietyApiItem;
export type SetupMark = MarkApiItem;

/** Ensure marks is always an array, even when the API omits it on a fresh create. */
function normalise(v: VarietyApiItem): SetupVariety {
  return { ...v, marks: v.marks ?? [] };
}

interface SetupState {
  varieties: SetupVariety[];
  loading: boolean;
  error: string | null;

  fetchVarieties: () => Promise<void>;

  createVariety: (payload: CreateVarietyPayload) => Promise<SetupVariety>;
  updateVariety: (id: string, payload: UpdateVarietyPayload) => Promise<SetupVariety>;
  deleteVariety: (id: string) => Promise<void>;

  createMark: (varietyId: string, payload: CreateMarkPayload) => Promise<SetupMark>;
  updateMark: (varietyId: string, markId: string, payload: UpdateMarkPayload) => Promise<SetupMark>;
  deleteMark: (varietyId: string, markId: string) => Promise<void>;
}

function replaceVariety(varieties: SetupVariety[], updated: SetupVariety): SetupVariety[] {
  return varieties.map((v) => (v.id === updated.id ? updated : v));
}

export const useSetupStore = create<SetupState>((set, get) => ({
  varieties: [],
  loading: false,
  error: null,

  fetchVarieties: async () => {
    set({ loading: true, error: null });
    try {
      const varieties = await varietiesApi.list();
      set({ varieties: varieties.map(normalise), loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createVariety: async (payload) => {
    const v = normalise(await varietiesApi.create(payload));
    set((s) => ({ varieties: [...s.varieties, v] }));
    return v;
  },

  updateVariety: async (id, payload) => {
    const v = normalise(await varietiesApi.update(id, payload));
    set((s) => ({ varieties: replaceVariety(s.varieties, v) }));
    return v;
  },

  deleteVariety: async (id) => {
    await varietiesApi.delete(id);
    set((s) => ({ varieties: s.varieties.filter((v) => v.id !== id) }));
  },

  createMark: async (varietyId, payload) => {
    const mark = await varietiesApi.createMark(varietyId, payload);
    const updated = normalise(await varietiesApi.get(varietyId));
    set((s) => ({ varieties: replaceVariety(s.varieties, updated) }));
    return mark;
  },

  updateMark: async (varietyId, markId, payload) => {
    const mark = await varietiesApi.updateMark(varietyId, markId, payload);
    const updated = normalise(await varietiesApi.get(varietyId));
    set((s) => ({ varieties: replaceVariety(s.varieties, updated) }));
    return mark;
  },

  deleteMark: async (varietyId, markId) => {
    await varietiesApi.deleteMark(varietyId, markId);
    const updated = normalise(await varietiesApi.get(varietyId));
    set((s) => ({ varieties: replaceVariety(s.varieties, updated) }));
  },
}));
