export type StoreCartLine = {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
  image?: string;
  /** グリーンサラダ等のドレッシング */
  dressing?: string;
};

export function storeCartLineKey(line: Pick<StoreCartLine, "id" | "dressing">) {
  return line.dressing ? `${line.id}::${line.dressing}` : line.id;
}

export type StoreOrderDraft = {
  items: StoreCartLine[];
  pickupDate?: string;
  pickupTime?: string;
  /** 店内席番号・テーブル（任意） */
  seatLabel?: string;
  /** 1〜4 など（QR / ?table= 用） */
  tableId?: string;
  customerName?: string;
  phone?: string;
  note?: string;
  totalAmount?: number;
  totalQuantity?: number;
  updatedAt?: number;
};

export const STORE_ORDER_DRAFT_KEY = "kamurado-store-order-draft";

export function readStoreOrderDraft(): StoreOrderDraft {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = window.localStorage.getItem(STORE_ORDER_DRAFT_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as StoreOrderDraft;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      pickupDate: parsed.pickupDate || "",
      pickupTime: parsed.pickupTime || "",
      seatLabel: parsed.seatLabel || "",
      tableId: parsed.tableId || "",
      customerName: parsed.customerName || "",
      phone: parsed.phone || "",
      note: parsed.note || "",
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { items: [] };
  }
}

export function writeStoreOrderDraft(draft: StoreOrderDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORE_ORDER_DRAFT_KEY,
    JSON.stringify({ ...draft, updatedAt: Date.now() }),
  );
}

export function clearStoreOrderDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORE_ORDER_DRAFT_KEY);
}

export function storeCartQuantity(items: StoreCartLine[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
