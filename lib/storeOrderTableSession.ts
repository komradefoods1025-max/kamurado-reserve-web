import { normalizeStoreTableId } from "./storeOrderTables";

/** Cookie / sessionStorage 共通キー */
export const STORE_ORDER_TABLE_SESSION_KEY = "kamurado-store-table-id";

const TABLE_COOKIE_RE = new RegExp(
  `(?:^|;\\s*)${STORE_ORDER_TABLE_SESSION_KEY}=([^;]*)`,
);

export function readStoreOrderTableCookie(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.match(TABLE_COOKIE_RE);
    if (!m?.[1]) return null;
    return normalizeStoreTableId(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

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
