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

export async function enqueueStoreDisplayOrder(
  order: StoreDisplayOrder,
): Promise<boolean> {
  if (!isStoreDisplayQueueEnabled()) return false;
  const key = dayKey(order.pickupDate || getTodayYmdJst());
  const payload = JSON.stringify(order);
  const pushed = await redisCmd<number>(
    `lpush/${key}/${encodeRedisValue(payload)}`,
  );
  if (pushed === null) return false;
  await redisCmd<number>(`ltrim/${key}/0/199`);
  return true;
}

export async function listStoreDisplayOrders(
  ymd = getTodayYmdJst(),
): Promise<StoreDisplayOrder[]> {
  if (!isStoreDisplayQueueEnabled()) return [];
  const key = dayKey(ymd);
  const rows = await redisCmd<string[]>(`lrange/${key}/0/-1`);
  if (!rows?.length) return [];

  const orders: StoreDisplayOrder[] = [];
  const seen = new Set<string>();

  for (const raw of rows) {
    try {
      const parsed = JSON.parse(decodeRedisValue(raw)) as StoreDisplayOrder;
      const no = String(parsed.reservationNo || "").trim();
      if (!no || seen.has(no)) continue;
      seen.add(no);
      orders.push(parsed);
    } catch {
      /* skip */
    }
  }

  orders.sort((a, b) => {
    const ta = Date.parse(a.submittedAt || "") || 0;
    const tb = Date.parse(b.submittedAt || "") || 0;
    return tb - ta;
  });

  return orders;
}

export async function updateStoreDisplayOrderStatus(
  reservationNo: string,
  status: StoreDisplayOrder["status"],
  ymd = getTodayYmdJst(),
): Promise<boolean> {
  if (!isStoreDisplayQueueEnabled()) return false;
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
