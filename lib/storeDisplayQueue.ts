import { getTodayYmdJst } from "./bookingDates";
import {
  resolveStoreOrderTableId,
  storeTableLabel,
} from "./storeOrderTables";
import {
  blobApplyStoreDisplayOrderUpdate,
  blobEnqueueStoreDisplayOrder,
  blobListStoreDisplayOrders,
  blobUpdateStoreDisplayOrderStatus,
  isStoreDisplayBlobQueueEnabled,
} from "./storeDisplayBlobQueue";
import { isStoreOrderTestMode } from "./storeOrderTestMode";

export type StoreDisplayItem = {
  menuKey?: string;
  menuName?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  total?: number;
  dressing?: string;
  /** キッチンで商品単位を完成にした時刻（ISO） */
  kitchenDoneAt?: string;
};

/** キッチン商品行: 表示からこの時間で遅延表示 */
export const STORE_KITCHEN_ITEM_OVERDUE_MS = 10 * 60 * 1000;

/** 商品単位の完成後、キッチンに残す秒数（注文の「完成」と同じ） */
export const STORE_KITCHEN_ITEM_DONE_VISIBLE_MS = 5000;

export function isStoreKitchenItemVisibleOnDisplay(
  item: StoreDisplayItem,
  nowMs: number,
): boolean {
  if (!item.kitchenDoneAt) return true;
  const doneAt = Date.parse(item.kitchenDoneAt);
  if (!Number.isFinite(doneAt)) return true;
  return nowMs - doneAt < STORE_KITCHEN_ITEM_DONE_VISIBLE_MS;
}

export function orderHasVisibleKitchenItems(
  order: StoreDisplayOrder,
  nowMs: number,
): boolean {
  return order.items.some((item) =>
    isStoreKitchenItemVisibleOnDisplay(item, nowMs),
  );
}

export function isStoreKitchenItemOverdue(
  order: StoreDisplayOrder,
  item: StoreDisplayItem,
  nowMs: number,
): boolean {
  if (item.kitchenDoneAt) return false;
  const at = Date.parse(order.submittedAt || "");
  if (!Number.isFinite(at)) return false;
  return nowMs - at >= STORE_KITCHEN_ITEM_OVERDUE_MS;
}

export type StoreDisplayOrder = {
  reservationNo: string;
  name: string;
  phone: string;
  seatLabel?: string;
  tableId?: string;
  pickupDate: string;
  pickupTime: string;
  items: StoreDisplayItem[];
  totalQty: number;
  total: number;
  note?: string;
  fulfillment: "dine_in" | "pickup";
  status: "受付済み" | "調理中" | "完成" | "提供済み";
  submittedAt: string;
};

function redisRestBase(): { url: string; token: string } | null {
  const url = String(
    process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      "",
  ).replace(/\/$/, "");
  const token = String(
    process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      "",
  ).trim();
  if (!url || !token) return null;
  return { url, token };
}

/** Upstash / Vercel KV (Redis REST) */
export function isStoreDisplayRedisQueueEnabled(): boolean {
  return Boolean(redisRestBase());
}

/** @deprecated use isStoreDisplayRedisQueueEnabled */
export function isStoreDisplayQueueEnabled(): boolean {
  return isStoreDisplayRedisQueueEnabled();
}

function isTruthyEnv(value: string | undefined): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Redis なし時のメモリキュー（dev / テストモード / 明示フラグ） */
export function isStoreDisplayMemoryQueueActive(): boolean {
  if (redisRestBase() || isStoreDisplayBlobQueueEnabled()) return false;
  if (process.env.NODE_ENV === "development") return true;
  /** Blob/Redis 未設定の Vercel 本番は暫定メモリ（小規模店向け・要 Storage 接続推奨） */
  if (process.env.VERCEL === "1") return true;
  if (isStoreOrderTestMode()) return true;
  return isTruthyEnv(process.env.STORE_ORDER_DISPLAY_MEMORY_FALLBACK);
}

export function isStoreDisplayQueueAvailable(): boolean {
  return (
    isStoreDisplayRedisQueueEnabled() ||
    isStoreDisplayBlobQueueEnabled() ||
    isStoreDisplayMemoryQueueActive()
  );
}

export { isStoreDisplayBlobQueueEnabled };

type MemoryDayStore = Map<string, StoreDisplayOrder[]>;

function memoryStore(): MemoryDayStore {
  const g = globalThis as typeof globalThis & {
    __kamuradoStoreDisplayMem?: MemoryDayStore;
  };
  if (!g.__kamuradoStoreDisplayMem) {
    g.__kamuradoStoreDisplayMem = new Map();
  }
  return g.__kamuradoStoreDisplayMem;
}

function dayKey(ymd = getTodayYmdJst()): string {
  return `store:display:${ymd}`;
}

async function redisCmd<T>(path: string): Promise<T | null> {
  const cfg = redisRestBase();
  if (!cfg) return null;
  const res = await fetch(`${cfg.url}/${path}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[storeDisplayQueue]", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { result?: T };
  return data.result ?? null;
}

function encodeRedisValue(json: string): string {
  return encodeURIComponent(json);
}

function decodeRedisValue(encoded: string): string {
  return decodeURIComponent(encoded);
}

function dedupeSort(orders: StoreDisplayOrder[]): StoreDisplayOrder[] {
  const seen = new Set<string>();
  const out: StoreDisplayOrder[] = [];
  for (const o of orders) {
    const no = String(o.reservationNo || "").trim();
    if (!no || seen.has(no)) continue;
    seen.add(no);
    out.push(o);
  }
  out.sort((a, b) => {
    const ta = Date.parse(a.submittedAt || "") || 0;
    const tb = Date.parse(b.submittedAt || "") || 0;
    return tb - ta;
  });
  return out;
}

function memoryEnqueue(order: StoreDisplayOrder): boolean {
  const key = dayKey(order.pickupDate || getTodayYmdJst());
  const store = memoryStore();
  const list = store.get(key) ?? [];
  const filtered = list.filter(
    (o) => o.reservationNo !== order.reservationNo,
  );
  filtered.unshift(order);
  store.set(key, filtered.slice(0, 200));
  return true;
}

function memoryList(ymd: string): StoreDisplayOrder[] {
  return dedupeSort(memoryStore().get(dayKey(ymd)) ?? []);
}

function memoryApplyOrderUpdate(
  reservationNo: string,
  ymd: string,
  apply: (order: StoreDisplayOrder) => boolean,
): boolean {
  const key = dayKey(ymd);
  const list = memoryStore().get(key);
  if (!list?.length) return false;
  let updated = false;
  const next = list.map((o) => {
    if (String(o.reservationNo) !== reservationNo) return o;
    const clone = { ...o, items: o.items.map((item) => ({ ...item })) };
    if (!apply(clone)) return o;
    updated = true;
    return clone;
  });
  if (!updated) return false;
  memoryStore().set(key, next);
  return true;
}

function memoryUpdateStatus(
  reservationNo: string,
  status: StoreDisplayOrder["status"],
  ymd: string,
): boolean {
  return memoryApplyOrderUpdate(reservationNo, ymd, (order) => {
    order.status = status;
    return true;
  });
}

export async function enqueueStoreDisplayOrder(
  order: StoreDisplayOrder,
): Promise<boolean> {
  const enriched = withResolvedTable(order);
  if (isStoreDisplayRedisQueueEnabled()) {
    const key = dayKey(enriched.pickupDate || getTodayYmdJst());
    const payload = JSON.stringify(enriched);
    const pushed = await redisCmd<number>(
      `lpush/${key}/${encodeRedisValue(payload)}`,
    );
    if (pushed === null) return false;
    await redisCmd<number>(`ltrim/${key}/0/199`);
    return true;
  }
  if (isStoreDisplayBlobQueueEnabled()) {
    return blobEnqueueStoreDisplayOrder(enriched);
  }
  if (isStoreDisplayMemoryQueueActive()) {
    return memoryEnqueue(enriched);
  }
  return false;
}

export async function listStoreDisplayOrders(
  ymd = getTodayYmdJst(),
): Promise<StoreDisplayOrder[]> {
  if (isStoreDisplayRedisQueueEnabled()) {
    const key = dayKey(ymd);
    const rows = await redisCmd<string[]>(`lrange/${key}/0/-1`);
    if (!rows?.length) return [];

    const orders: StoreDisplayOrder[] = [];
    for (const raw of rows) {
      try {
        orders.push(
          JSON.parse(decodeRedisValue(raw)) as StoreDisplayOrder,
        );
      } catch {
        /* skip */
      }
    }
    return dedupeSort(orders.map(withResolvedTable));
  }
  if (isStoreDisplayBlobQueueEnabled()) {
    return dedupeSort(
      (await blobListStoreDisplayOrders(ymd)).map(withResolvedTable),
    );
  }
  if (isStoreDisplayMemoryQueueActive()) {
    return memoryList(ymd).map(withResolvedTable);
  }
  return [];
}

async function applyStoreDisplayOrderUpdate(
  reservationNo: string,
  ymd: string,
  apply: (order: StoreDisplayOrder) => boolean,
): Promise<boolean> {
  if (isStoreDisplayRedisQueueEnabled()) {
    const key = dayKey(ymd);
    const rows = await redisCmd<string[]>(`lrange/${key}/0/-1`);
    if (!rows?.length) return false;

    let updated = false;
    const nextRows: string[] = [];

    for (const raw of rows) {
      try {
        const parsed = JSON.parse(decodeRedisValue(raw)) as StoreDisplayOrder;
        if (String(parsed.reservationNo) === reservationNo) {
          const clone: StoreDisplayOrder = {
            ...parsed,
            items: parsed.items.map((item) => ({ ...item })),
          };
          if (!apply(clone)) {
            nextRows.push(raw);
            continue;
          }
          nextRows.push(encodeRedisValue(JSON.stringify(clone)));
          updated = true;
        } else {
          nextRows.push(raw);
        }
      } catch {
        nextRows.push(raw);
      }
    }

    if (!updated) return false;

    await redisCmd<number>(`del/${key}`);
    for (let i = nextRows.length - 1; i >= 0; i--) {
      await redisCmd<number>(`lpush/${key}/${nextRows[i]}`);
    }
    await redisCmd<number>(`ltrim/${key}/0/199`);
    return true;
  }
  if (isStoreDisplayBlobQueueEnabled()) {
    return blobApplyStoreDisplayOrderUpdate(reservationNo, ymd, apply);
  }
  if (isStoreDisplayMemoryQueueActive()) {
    return memoryApplyOrderUpdate(reservationNo, ymd, apply);
  }
  return false;
}

export async function updateStoreDisplayOrderStatus(
  reservationNo: string,
  status: StoreDisplayOrder["status"],
  ymd = getTodayYmdJst(),
): Promise<boolean> {
  return applyStoreDisplayOrderUpdate(reservationNo, ymd, (order) => {
    order.status = status;
    return true;
  });
}

export async function markStoreDisplayItemKitchenDone(
  reservationNo: string,
  itemIndex: number,
  done: boolean,
  ymd = getTodayYmdJst(),
): Promise<boolean> {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return false;

  return applyStoreDisplayOrderUpdate(reservationNo, ymd, (order) => {
    const item = order.items[itemIndex];
    if (!item) return false;
    if (done) {
      item.kitchenDoneAt = new Date().toISOString();
    } else {
      delete item.kitchenDoneAt;
    }
    return true;
  });
}

export function storeDisplayQueueHintMessage(): string {
  if (isStoreDisplayRedisQueueEnabled()) return "";
  if (isStoreDisplayBlobQueueEnabled()) {
    return "Vercel Blob に注文を保存しています";
  }
  if (isStoreDisplayMemoryQueueActive()) {
    if (process.env.VERCEL === "1") {
      return "暫定: サーバーメモリで表示中です。Vercel → Storage で Blob 接続を推奨（安定稼働）";
    }
    return "開発用メモリキュー（npm run dev）";
  }
  return "注文キュー未設定 — Vercel で Blob または Upstash Redis をプロジェクトに接続してください";
}

function withResolvedTable(order: StoreDisplayOrder): StoreDisplayOrder {
  const resolved = resolveStoreOrderTableId(order);
  if (!resolved) return order;
  return {
    ...order,
    tableId: resolved,
    seatLabel: storeTableLabel(resolved),
  };
}

export function buildStoreDisplayOrderFromPayload(
  payload: Record<string, unknown>,
): StoreDisplayOrder {
  const items = (Array.isArray(payload.items) ? payload.items : []) as StoreDisplayItem[];
  const raw: StoreDisplayOrder = {
    reservationNo: String(payload.reservationNo || ""),
    name: String(payload.name || ""),
    phone: String(payload.phone || ""),
    seatLabel: String(payload.seatLabel || "").trim() || undefined,
    tableId: String(payload.tableId || "").trim() || undefined,
    pickupDate: String(payload.date || payload.pickupDate || ""),
    pickupTime: String(payload.time || payload.pickupTime || ""),
    items,
    totalQty: Number(payload.totalQty || 0),
    total: Number(payload.total || 0),
    note: payload.note ? String(payload.note) : undefined,
    fulfillment:
      payload.fulfillment === "dine_in" ||
      String(payload.source || "").includes("dine")
        ? "dine_in"
        : "pickup",
    status: "受付済み",
    submittedAt: String(payload.submittedAt || new Date().toISOString()),
  };
  return withResolvedTable(raw);
}
