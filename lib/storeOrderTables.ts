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

function tableIdFromOrderNote(note: unknown): string | null {
  const text = String(note ?? "");
  const seat = text.match(/席[:：]\s*(\d+)\s*卓?/);
  if (seat) return normalizeStoreTableId(seat[1]);
  const labeled = text.match(/(\d+)\s*卓/);
  if (labeled) return normalizeStoreTableId(labeled[1]);
  return null;
}

/** 表示用: tableId → seatLabel → 備考欄の「席:N卓」 */
export function resolveStoreOrderTableId(order: {
  tableId?: string;
  seatLabel?: string;
  note?: string;
}): string | null {
  return (
    normalizeStoreTableId(order.tableId) ??
    normalizeStoreTableId(order.seatLabel) ??
    tableIdFromOrderNote(order.note)
  );
}

export function orderMatchesStoreTable(
  order: { seatLabel?: string; tableId?: string; note?: string },
  tableId: string,
): boolean {
  const want = normalizeStoreTableId(tableId);
  if (!want) return false;
  return resolveStoreOrderTableId(order) === want;
}
