import { normalizeStoreTableId } from "./storeOrderTables";

export const STORE_ORDER_TABLE_SESSION_KEY = "kamurado-store-table-id";

export function persistStoreOrderTableId(tableId: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeStoreTableId(tableId);
  if (!normalized) return;
  try {
    sessionStorage.setItem(STORE_ORDER_TABLE_SESSION_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function readStoreOrderTableSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeStoreTableId(
      sessionStorage.getItem(STORE_ORDER_TABLE_SESSION_KEY),
    );
  } catch {
    return null;
  }
}

export function clearStoreOrderTableSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORE_ORDER_TABLE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
