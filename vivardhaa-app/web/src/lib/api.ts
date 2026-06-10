/**
 * Thin fetch wrapper for the Vivardhaa REST API.
 * Base URL is read from VITE_API_URL (falls back to /api via the Vite proxy).
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const TOKEN_KEY = "vv_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${init?.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  requestOtp(phone: string): Promise<{ message: string }> {
    return request("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  verifyOtp(phone: string, otp: string): Promise<{ token: string }> {
    return request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
  },
};

// ── Purchases ──────────────────────────────────────────────────────────────

export interface PurchaseApiItem {
  id: string;
  date: string;
  sourceType: string;
  shop: string;
  sourceDetails?: string;
  variety: string;
  type: string;
  mark: string;
  bags: number;
  kg: number;
  price: number;
  bagWeights?: number[];
  destination: string;
  destinationDetails?: string;
  dispatchDeadline: string;
  currentStage: number;
  probability: number;
  isRejected: boolean;
  rejectionReason?: string;
  rejectionNote?: string;
  notes: Array<{ stage: number; text: string; at: string; kind?: 'lot' | 'workflow' }>;
  stageEnteredAt: Record<string, string>;
  stageAssignee: Record<string, string>;
  accountsStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchasePayload {
  date: string;
  sourceType: string;
  shop?: string;
  sourceDetails?: string;
  variety: string;
  type: string;
  mark: string;
  bags?: number;
  kg?: number;
  price: number;
  bagWeights?: number[];
  destination?: string;
  destinationDetails?: string;
  dispatchDeadline?: string;
  initialNote?: string;
  /** Stage to create the lot at (1–3). Used when adding a lot to an existing group. */
  initialStage?: number;
}

export interface UpdatePurchasePayload {
  date: string;
  sourceType: string;
  shop?: string;
  sourceDetails?: string;
  variety: string;
  type: string;
  mark: string;
  bags: number;
  kg: number;
  price: number;
  bagWeights?: number[];
  destination: string;
  destinationDetails?: string;
  dispatchDeadline: string;
  /** Optional note appended to the lot's notes timeline on save. */
  remark?: string;
}

export const purchasesApi = {
  list(params?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    stage?: number;
  }): Promise<PurchaseApiItem[]> {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.rangeStart) qs.set("rangeStart", params.rangeStart);
    if (params?.rangeEnd) qs.set("rangeEnd", params.rangeEnd);
    if (params?.variety) qs.set("variety", params.variety);
    if (params?.stage !== undefined) qs.set("stage", String(params.stage));
    const q = qs.toString();
    return request<PurchaseApiItem[]>(`/purchases${q ? `?${q}` : ""}`);
  },

  get(id: string): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}`);
  },

  create(payload: CreatePurchasePayload): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>("/purchases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdatePurchasePayload): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  advance(id: string, remark?: string): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}/advance`, {
      method: "PATCH",
      body: JSON.stringify({ remark }),
    });
  },

  reject(id: string, reason?: string, note?: string): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason, note }),
    });
  },

  settle(id: string, remark?: string): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}/settle`, {
      method: "PATCH",
      body: JSON.stringify({ remark }),
    });
  },

  requestInfo(id: string, remark?: string): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}/request-info`, {
      method: "PATCH",
      body: JSON.stringify({ remark }),
    });
  },

  assign(id: string, assignee: string, stage?: number): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignee, stage }),
    });
  },

  addNote(id: string, text: string): Promise<PurchaseApiItem> {
    return request<PurchaseApiItem>(`/purchases/${id}/note`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
};

// ── Destemming ─────────────────────────────────────────────────────────────

export interface DestemmingDispatchApi {
  id: string;
  point: string;
  sentBags: number;
  sentKg: number;
  sentAt: string;
  returnType?: "stemless" | "with-stem";
  receivedKg?: number;
  returnedStemKg?: number;
  returnedStemBags?: number;
  receivedAt?: string;
  pricePerKg?: number;
  shortagePct?: number;
  bagWeightKg?: number;
  note?: string;
}

export interface DestemmingJobApiItem {
  id: string;
  purchaseId: string;
  shop: string;
  variety: string;
  type: string;
  mark: string;
  inputBags: number;
  inputKg: number;
  sourcePricePerKg: number;
  destination: string;
  date: string;
  dispatches: DestemmingDispatchApi[];
  status: string;
  notes: Array<{ text: string; at: string; point?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDestemmingJobPayload {
  purchaseId: string;
  initialNote?: string;
  initialDispatches?: Array<{ point: string; sentBags: number; sentKg: number; pricePerKg?: number }>;
}

export const destemmingApi = {
  list(params?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    status?: string;
  }): Promise<DestemmingJobApiItem[]> {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.rangeStart) qs.set("rangeStart", params.rangeStart);
    if (params?.rangeEnd) qs.set("rangeEnd", params.rangeEnd);
    if (params?.variety) qs.set("variety", params.variety);
    if (params?.status) qs.set("status", params.status);
    const q = qs.toString();
    return request<DestemmingJobApiItem[]>(`/destemming${q ? `?${q}` : ""}`);
  },

  get(id: string): Promise<DestemmingJobApiItem> {
    return request<DestemmingJobApiItem>(`/destemming/${id}`);
  },

  create(payload: CreateDestemmingJobPayload): Promise<DestemmingJobApiItem> {
    return request<DestemmingJobApiItem>("/destemming", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  sendToPoint(
    id: string,
    point: string,
    sentBags: number,
    sentKg: number,
    pricePerKg?: number,
    shortagePct?: number,
    bagWeightKg?: number,
    note?: string
  ): Promise<DestemmingJobApiItem> {
    return request<DestemmingJobApiItem>(`/destemming/${id}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ point, sentBags, sentKg, pricePerKg, shortagePct, bagWeightKg, note }),
    });
  },

  receiveFromPoint(
    id: string,
    dispatchId: string,
    payload: {
      receivedKg?: number;
      returnedStemKg?: number;
      returnedStemBags?: number;
      note?: string;
    }
  ): Promise<DestemmingJobApiItem> {
    return request<DestemmingJobApiItem>(
      `/destemming/${id}/dispatches/${dispatchId}/receive`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  addNote(id: string, text: string, point?: string): Promise<DestemmingJobApiItem> {
    return request<DestemmingJobApiItem>(`/destemming/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ text, point }),
    });
  },
};

// ── Raasi ──────────────────────────────────────────────────────────────────

export interface RaasiBatchApiItem {
  id: string;
  sourceType: string;
  sourceIds: string[];
  shop: string;
  variety: string;
  type: string;
  mark: string;
  inputBags: number;
  inputWetKg: number;
  spreadDate: string;
  collectedDate?: string;
  outputDryKg?: number;
  status: string;
  notes: Array<{ text: string; at: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRaasiBatchPayload {
  sourceType: string;
  sourceIds: string[];
  inputBags: number;
  inputWetKg: number;
  spreadDate: string;
  initialNote?: string;
}

export const raasiApi = {
  list(params?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    status?: string;
    sourceType?: string;
  }): Promise<RaasiBatchApiItem[]> {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.rangeStart) qs.set("rangeStart", params.rangeStart);
    if (params?.rangeEnd) qs.set("rangeEnd", params.rangeEnd);
    if (params?.variety) qs.set("variety", params.variety);
    if (params?.status) qs.set("status", params.status);
    if (params?.sourceType) qs.set("sourceType", params.sourceType);
    const q = qs.toString();
    return request<RaasiBatchApiItem[]>(`/raasi${q ? `?${q}` : ""}`);
  },

  get(id: string): Promise<RaasiBatchApiItem> {
    return request<RaasiBatchApiItem>(`/raasi/${id}`);
  },

  create(payload: CreateRaasiBatchPayload): Promise<RaasiBatchApiItem> {
    return request<RaasiBatchApiItem>("/raasi", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  markCollected(id: string, outputDryKg: number, note?: string): Promise<RaasiBatchApiItem> {
    return request<RaasiBatchApiItem>(`/raasi/${id}/collect`, {
      method: "PATCH",
      body: JSON.stringify({ outputDryKg, note }),
    });
  },

  addNote(id: string, text: string): Promise<RaasiBatchApiItem> {
    return request<RaasiBatchApiItem>(`/raasi/${id}/note`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
};

// ── Orders ─────────────────────────────────────────────────────────────────

export interface OrderAllocationApi {
  id: string;
  sourceKind: string;
  sourceId: string;
  shop: string;
  variety: string;
  type: string;
  mark: string;
  allocatedKg: number;
  allocatedAt: string;
  note?: string;
}

export interface OrderApiItem {
  id: string;
  customer: string;
  destinationCity?: string;
  date: string;
  variety: string;
  mark: string;
  targetKg: number;
  pricePerKg: number;
  deliveryDeadline?: string;
  currentStage: number;
  settledAt?: string;
  isCancelled: boolean;
  allocations: OrderAllocationApi[];
  notes: Array<{ stage: number; text: string; at: string }>;
  stageEnteredAt: Record<string, string>;
  stageAssignee: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  customer: string;
  destinationCity?: string;
  date: string;
  variety: string;
  mark: string;
  targetKg: number;
  pricePerKg: number;
  deliveryDeadline?: string;
  initialNote?: string;
  initialAllocations?: Array<{
    sourceKind: string;
    sourceId: string;
    shop: string;
    variety: string;
    type: string;
    mark: string;
    allocatedKg: number;
    note?: string;
  }>;
}

export const ordersApi = {
  list(params?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    stage?: number;
    customer?: string;
  }): Promise<OrderApiItem[]> {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.rangeStart) qs.set("rangeStart", params.rangeStart);
    if (params?.rangeEnd) qs.set("rangeEnd", params.rangeEnd);
    if (params?.variety) qs.set("variety", params.variety);
    if (params?.stage !== undefined) qs.set("stage", String(params.stage));
    if (params?.customer) qs.set("customer", params.customer);
    const q = qs.toString();
    return request<OrderApiItem[]>(`/orders${q ? `?${q}` : ""}`);
  },

  get(id: string): Promise<OrderApiItem> {
    return request<OrderApiItem>(`/orders/${id}`);
  },

  create(payload: CreateOrderPayload): Promise<OrderApiItem> {
    return request<OrderApiItem>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  advance(id: string, remark?: string): Promise<OrderApiItem> {
    return request<OrderApiItem>(`/orders/${id}/advance`, {
      method: "PATCH",
      body: JSON.stringify({ remark }),
    });
  },

  settle(id: string, remark?: string): Promise<OrderApiItem> {
    return request<OrderApiItem>(`/orders/${id}/settle`, {
      method: "PATCH",
      body: JSON.stringify({ remark }),
    });
  },

  cancel(id: string, reason?: string): Promise<OrderApiItem> {
    return request<OrderApiItem>(`/orders/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },

  addAllocation(
    id: string,
    alloc: {
      sourceKind: string;
      sourceId: string;
      shop: string;
      variety: string;
      type: string;
      mark: string;
      allocatedKg: number;
      note?: string;
    }
  ): Promise<OrderApiItem> {
    return request<OrderApiItem>(`/orders/${id}/allocations`, {
      method: "POST",
      body: JSON.stringify(alloc),
    });
  },

  removeAllocation(orderId: string, allocId: string): Promise<OrderApiItem> {
    return request<OrderApiItem>(`/orders/${orderId}/allocations/${allocId}`, {
      method: "DELETE",
    });
  },

  assign(id: string, assignee: string, stage?: number): Promise<OrderApiItem> {
    return request<OrderApiItem>(`/orders/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignee, stage }),
    });
  },
};

// ── Users ──────────────────────────────────────────────────────────────────

export interface UserApiItem {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  /** ['*'] = all menus; specific paths otherwise */
  menuItems: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  isActive?: boolean;
  menuItems: string[];
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  menuItems?: string[];
}

export const usersApi = {
  list(search?: string): Promise<UserApiItem[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<UserApiItem[]>(`/users${qs}`);
  },

  get(id: string): Promise<UserApiItem> {
    return request<UserApiItem>(`/users/${id}`);
  },

  create(payload: CreateUserPayload): Promise<UserApiItem> {
    return request<UserApiItem>('/users', { method: 'POST', body: JSON.stringify(payload) });
  },

  update(id: string, payload: UpdateUserPayload): Promise<UserApiItem> {
    return request<UserApiItem>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  delete(id: string): Promise<void> {
    return request<void>(`/users/${id}`, { method: 'DELETE' });
  },
};

// ── Varieties & Marks ──────────────────────────────────────────────────────

export interface MarkApiItem {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
  varietyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VarietyApiItem {
  id: string;
  name: string;
  color: string;
  subtitle: string;
  sortOrder: number;
  marks: MarkApiItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateVarietyPayload {
  name: string;
  color?: string;
  subtitle?: string;
  sortOrder?: number;
}

export interface UpdateVarietyPayload {
  name?: string;
  color?: string;
  subtitle?: string;
  sortOrder?: number;
}

export interface CreateMarkPayload {
  name: string;
  label?: string;
  sortOrder?: number;
}

export interface UpdateMarkPayload {
  name?: string;
  label?: string;
  sortOrder?: number;
}

export const varietiesApi = {
  list(): Promise<VarietyApiItem[]> {
    return request<VarietyApiItem[]>("/varieties");
  },

  get(id: string): Promise<VarietyApiItem> {
    return request<VarietyApiItem>(`/varieties/${id}`);
  },

  create(payload: CreateVarietyPayload): Promise<VarietyApiItem> {
    return request<VarietyApiItem>("/varieties", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateVarietyPayload): Promise<VarietyApiItem> {
    return request<VarietyApiItem>(`/varieties/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string): Promise<void> {
    return request<void>(`/varieties/${id}`, { method: "DELETE" });
  },

  createMark(varietyId: string, payload: CreateMarkPayload): Promise<MarkApiItem> {
    return request<MarkApiItem>(`/varieties/${varietyId}/marks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateMark(varietyId: string, markId: string, payload: UpdateMarkPayload): Promise<MarkApiItem> {
    return request<MarkApiItem>(`/varieties/${varietyId}/marks/${markId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteMark(varietyId: string, markId: string): Promise<void> {
    return request<void>(`/varieties/${varietyId}/marks/${markId}`, { method: "DELETE" });
  },
}
