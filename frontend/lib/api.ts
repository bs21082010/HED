export type Cadet = {
  id: number;
  name: string;
  house_id: number;
  cadet_class: string;
  dorm_id: number | null;
};

export type House = {
  id: number;
  name: string;
  code: string;
};

export type Dorm = {
  id: number;
  name: string;
  house_id: number;
  rows: number;
  cols: number;
  house: House;
};

export type BedStatus = "empty" | "normal" | "warning" | "red";

export type BedWithCadet = {
  id: number;
  row: number;
  col: number;
  location: string;
  cadet: Cadet | null;
  status: BedStatus;
};

export type LayoutItem = {
  row: number;
  col: number;
  location: string;
};

export type DormMap = {
  id: number;
  name: string;
  house: House;
  rows: number;
  cols: number;
  beds: BedWithCadet[];
};

export type AlertType = "warning" | "red";

export type Alert = {
  id: number;
  cadet_id: number;
  type: AlertType;
  message: string;
  created_at: string;
  resolved_at: string | null;
  cadet: Cadet | null;
};

export type EdAssignment = {
  id: number;
  alert_id: number;
  cadet_id: number;
  drill_type: "ED" | "HED";
  scheduled_for: string;
  created_at: string;
  cadet: Cadet | null;
};

export type Contact = {
  id: number;
  name: string;
  role: string;
  phone: string;
};

export type SmsLog = {
  id: number;
  alert_id: number;
  to_name: string;
  to_phone: string;
  body: string;
  status: string;
  created_at: string;
};

export type SmsResult = {
  to_name: string;
  to_phone: string;
  body: string;
  status: string;
  sent_at: string;
};

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STORAGE_KEY = "ssa_api_url";

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return saved.replace(/\/+$/, "");
  }
  return DEFAULT_API_URL;
}

export function setApiUrl(url: string) {
  window.localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ""));
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  dorms: () => request<Dorm[]>("/api/dorms"),
  dormMap: (id: number | string) => request<DormMap>(`/api/dorms/${id}`),
  alerts: (dormId?: number) => {
    const params = new URLSearchParams({ limit: "50" });
    if (dormId) params.set("dorm_id", String(dormId));
    return request<Alert[]>(`/api/alerts?${params.toString()}`);
  },
  edSchedule: () => request<EdAssignment[]>("/api/ed"),
  contacts: () => request<Contact[]>("/api/contacts"),
  createContact: (c: { name: string; role: string; phone: string }) =>
    request<Contact>("/api/contacts", { method: "POST", body: JSON.stringify(c) }),
  updateContact: (id: number, c: { name: string; role: string; phone: string }) =>
    request<Contact>(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(c) }),
  deleteContact: (id: number) =>
    request<void>(`/api/contacts/${id}`, { method: "DELETE" }),
  cadets: () => request<Cadet[]>("/api/cadets"),
  createCadet: (c: { name: string; house_id: number; cadet_class: string }) =>
    request<Cadet>("/api/cadets", { method: "POST", body: JSON.stringify({ ...c, dorm_id: null }) }),
  updateCadet: (id: number, c: { name: string; house_id: number; cadet_class: string }) =>
    request<Cadet>(`/api/cadets/${id}`, { method: "PUT", body: JSON.stringify({ ...c, dorm_id: null }) }),
  deleteCadet: (id: number) =>
    request<void>(`/api/cadets/${id}`, { method: "DELETE" }),
  raiseAlert: (bedId: number, type: AlertType, message = "", drillType: "ED" | "HED" = "ED") =>
    request<Alert>(`/api/beds/${bedId}/alerts`, {
      method: "POST",
      body: JSON.stringify({ type, message, drill_type: drillType }),
    }),
  resolveAlert: (alertId: number) =>
    request<Alert>(`/api/alerts/${alertId}/resolve`, { method: "POST" }),
  sendSms: (phone: string, alertId?: number) =>
    request<SmsResult>(`/api/sms/send`, {
      method: "POST",
      body: JSON.stringify({ phone, alert_id: alertId }),
    }),
  updateBed: (
    bedId: number,
    patch: Partial<Pick<BedWithCadet, "row" | "col" | "location">>,
  ) =>
    request<BedWithCadet>(`/api/beds/${bedId}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  addBed: (dormId: number, item: LayoutItem) =>
    request<BedWithCadet>(`/api/beds/dorms/${dormId}`, {
      method: "POST",
      body: JSON.stringify(item),
    }),
  deleteBed: (bedId: number) =>
    request<void>(`/api/beds/${bedId}`, { method: "DELETE" }),
  submitLayout: (dormId: number, rows: number, cols: number, beds: LayoutItem[]) =>
    request<DormMap>(`/api/dorms/${dormId}/layout`, {
      method: "POST",
      body: JSON.stringify({ rows, cols, beds }),
    }),
};
