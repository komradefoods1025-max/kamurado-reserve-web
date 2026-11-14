import { readStoreOrderDraft } from "./storeOrderDraft";
import { readStoreOrderTableCookie, readStoreOrderTableSession } from "./storeOrderTableSession";
import { normalizeStoreTableId, storeTableLabel } from "./storeOrderTables";

/** 現在の卓番（draft → sessionStorage → cookie） */
export function resolveActiveStoreTableId(): string | null {
  if (typeof window === "undefined") return null;
  const draft = readStoreOrderDraft();
  return (
    normalizeStoreTableId(draft.tableId || draft.seatLabel) ||
    readStoreOrderTableSession() ||
    readStoreOrderTableCookie()
  );
}

export function storeOrderMenuHref(
  tableId?: string | null,
  extra?: Record<string, string>,
): string {
  const id =
    normalizeStoreTableId(tableId) ?? resolveActiveStoreTableId();
  const params = new URLSearchParams();
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
  }
  if (id) {
    params.set("table", id);
    params.set("seat", storeTableLabel(id));
  }
  const q = params.toString();
  return q ? `/order/menu?${q}` : "/order/menu";
}

/** 卓QRと同じ入口（Cookie 更新 → メニューへ） */
export function storeOrderTableEntryHref(tableId?: string | null): string {
  const id =
    normalizeStoreTableId(tableId) ?? resolveActiveStoreTableId();
  return id ? `/order/t/${id}` : "/order/seats";
}

function tableQueryString(tableId: string | null): string {
  if (!tableId) return "";
  const params = new URLSearchParams();
  params.set("table", tableId);
  params.set("seat", storeTableLabel(tableId));
  return `?${params.toString()}`;
}

export function storeOrderHistoryHref(tableId?: string | null): string {
  const id =
    normalizeStoreTableId(tableId) ?? resolveActiveStoreTableId();
  return `/order/history${tableQueryString(id)}`;
}

export function storeOrderBillHref(tableId?: string | null): string {
  const id =
    normalizeStoreTableId(tableId) ?? resolveActiveStoreTableId();
  return `/order/bill${tableQueryString(id)}`;
}
