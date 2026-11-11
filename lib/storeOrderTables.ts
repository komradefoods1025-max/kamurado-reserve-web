/** 店内オーダー座席数（表示 URL・QR は 1〜この数） */
export const STORE_ORDER_TABLE_COUNT = 4;

function tableNoInRange(n: number): string | null {
  if (!Number.isFinite(n) || n < 1 || n > STORE_ORDER_TABLE_COUNT) return null;
  return String(n);
}

/** 卓番だけを受け付ける（文字列中の偶然の数字は拾わない） */
export function normalizeStoreTableId(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    return tableNoInRange(Number(raw));
  }

  const zu = raw.match(/^(\d+)\s*卓$/);
  if (zu) return tableNoInRange(Number(zu[1]));

  const seatOnly = raw.match(/^席[:：]\s*(\d+)\s*卓?$/);
  if (seatOnly) return tableNoInRange(Number(seatOnly[1]));

  return null;
}

export function storeTableLabel(tableId: string): string {
  return `${tableId}卓`;
}

function tableIdFromOrderNote(note: unknown): string | null {
  const text = String(note ?? "");
  const seat = text.match(/席[:：]\s*(\d+)\s*卓?/);
  if (seat) return tableNoInRange(Number(seat[1]));
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
