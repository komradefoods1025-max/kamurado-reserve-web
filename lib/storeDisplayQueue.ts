import { getTodayYmdJst } from "./bookingDates";

export type StoreDisplayItem = {
  menuKey?: string;
  menuName?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  total?: number;
  dressing?: string;
};

export type StoreDisplayOrder = {
  reservationNo: string;
  name: string;
  phone: string;
  seatLabel?: string;
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

export function isStoreDisplayQueueEnabled(): boolean {
  return Boolean(redisRestBase());
}

/** 開発時のみ: Redis なしで単一プロセス内にキューを保持 */
export function isStoreDisplayMemoryQueueActive(): boolean {
  return process.env.NODE_ENV === "development" && !redisRestBase();
}

export function isStoreDisplayQueueAvailable(): boolean {
  return isStoreDisplayQueueEnabled() || isStoreDisplayMemoryQueueActive();
}

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

function memoryUpdateStatus(
  reservationNo: string,
  status: StoreDisplayOrder["status"],
  ymd: string,
): boolean {
  const key = dayKey(ymd);
  const list = memoryStore().get(key);
  if (!list?.length) return false;
  let updated = false;
  const next = list.map((o) => {
    if (String(o.reservationNo) === reservationNo) {
      updated = true;
      return { ...o, status };
    }
    return o;
  });
  if (!updated) return false;
  memoryStore().set(key, next);
  return true;
}

export async function enqueueStoreDisplayOrder(
  order: StoreDisplayOrder,
): Promise<boolean> {
  if (isStoreDisplayQueueEnabled()) {
    const key = dayKey(order.pickupDate || getTodayYmdJst());
    const payload = JSON.stringify(order);
    const pushed = await redisCmd<number>(
      `lpush/${key}/${encodeRedisValue(payload)}`,
    );
    if (pushed === null) return false;
    await redisCmd<number>(`ltrim/${key}/0/199`);
    return true;
  }
  if (isStoreDisplayMemoryQueueActive()) {
    return memoryEnqueue(order);
  }
  return false;
}

export async function listStoreDisplayOrders(
  ymd = getTodayYmdJst(),
): Promise<StoreDisplayOrder[]> {
  if (isStoreDisplayQueueEnabled()) {
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
    return dedupeSort(orders);
  }
  if (isStoreDisplayMemoryQueueActive()) {
    return memoryList(ymd);
  }
  return [];
}

export async function updateStoreDisplayOrderStatus(
  reservationNo: string,
  status: StoreDisplayOrder["status"],
  ymd = getTodayYmdJst(),
): Promise<boolean> {
  if (isStoreDisplayQueueEnabled()) {
    const key = dayKey(ymd);
    const rows = await redisCmd<string[]>(`lrange/${key}/0/-1`);
    if (!rows?.length) return false;

    let updated = false;
    const nextRows: string[] = [];

    for (const raw of rows) {
      try {
        const parsed = JSON.parse(decodeRedisValue(raw)) as StoreDisplayOrder;
        if (String(parsed.reservationNo) === reservationNo) {
          parsed.status = status;
          nextRows.push(encodeRedisValue(JSON.stringify(parsed)));
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
  if (isStoreDisplayMemoryQueueActive()) {
    return memoryUpdateStatus(reservationNo, status, ymd);
  }
  return false;
}

export function storeDisplayQueueHintMessage(): string {
  if (isStoreDisplayQueueEnabled()) return "";
  if (isStoreDisplayMemoryQueueActive()) {
    return "開発モード: メモリ上の注文キュー（npm run dev のみ）";
  }
  return "注文キュー未設定（UPSTASH_REDIS_REST_URL / TOKEN）— 注文を店舗画面に出すには Redis が必要です";
}

export function buildStoreDisplayOrderFromPayload(
  payload: Record<string, unknown>,
): StoreDisplayOrder {
  const items = (Array.isArray(payload.items) ? payload.items : []) as StoreDisplayItem[];
  return {
    reservationNo: String(payload.reservationNo || ""),
    name: String(payload.name || ""),
    phone: String(payload.phone || ""),
    seatLabel: payload.seatLabel ? String(payload.seatLabel) : undefined,
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
}
