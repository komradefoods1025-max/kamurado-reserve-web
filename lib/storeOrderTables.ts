/** 店内オーダー座席数（表示 URL・QR は 1〜この数） */
export const STORE_ORDER_TABLE_COUNT = 4;

export function normalizeStoreTableId(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 1 || n > STORE_ORDER_TABLE_COUNT) return null;
  return String(n);
}

export function storeTableLabel(tableId: string): string {
  return `${tableId}卓`;
}

export function orderMatchesStoreTable(
  order: { seatLabel?: string; tableId?: string },
  tableId: string,
): boolean {
  const want = normalizeStoreTableId(tableId);
  if (!want) return false;
  const fromField = normalizeStoreTableId(order.tableId);
  if (fromField === want) return true;
  return normalizeStoreTableId(order.seatLabel) === want;
}
