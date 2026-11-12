import { put, head } from "@vercel/blob";
import { getTodayYmdJst } from "./bookingDates";
import {
  isStoreDisplayBlobQueueEnabled,
  isStoreDisplayMemoryQueueActive,
  isStoreDisplayRedisQueueEnabled,
} from "./storeDisplayQueue";
import type { StoreDisplayItem, StoreDisplayOrder } from "./storeDisplayQueue";
import {
  normalizeStoreTableId,
  resolveStoreOrderTableId,
  STORE_ORDER_TABLE_COUNT,
} from "./storeOrderTables";

export type StoreTableRunningTotal = {
  total: number;
  orderCount: number;
};

export type StoreTableRunningTotals = Record<string, StoreTableRunningTotal>;

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

async function redisCmd<T>(path: string): Promise<T | null> {
  const cfg = redisRestBase();
  if (!cfg) return null;
  const res = await fetch(`${cfg.url}/${path}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[storeTableSettlement]", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { result?: T };
  return data.result ?? null;
}

function encodeRedisValue(json: string): string {
  return encodeURIComponent(json);
}

function settlementDayKey(ymd: string): string {
  return `store:table-settle:${ymd}`;
}

type MemorySettleStore = Map<string, Record<string, string>>;

function memorySettleStore(): MemorySettleStore {
  const g = globalThis as typeof globalThis & {
    __kamuradoTableSettleMem?: MemorySettleStore;
  };
  if (!g.__kamuradoTableSettleMem) {
    g.__kamuradoTableSettleMem = new Map();
  }
  return g.__kamuradoTableSettleMem;
}

function blobToken(): string | null {
  const t = String(process.env.BLOB_READ_WRITE_TOKEN || "").trim();
  return t || null;
}

function blobSettlePath(ymd: string): string {
  return `store-table-settle/${ymd}.json`;
}

function normalizeSettlements(
  raw: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) {
    const tid = normalizeStoreTableId(k);
    const at = String(v ?? "").trim();
    if (tid && at) out[tid] = at;
  }
  return out;
}

export function isStoreTableSettlementStorageAvailable(): boolean {
  return (
    isStoreDisplayRedisQueueEnabled() ||
    isStoreDisplayBlobQueueEnabled() ||
    isStoreDisplayMemoryQueueActive()
  );
}

export async function listStoreTableSettlements(
  ymd = getTodayYmdJst(),
): Promise<Record<string, string>> {
  if (isStoreDisplayRedisQueueEnabled()) {
    const rows = await redisCmd<string[] | Record<string, string>>(
      `hgetall/${settlementDayKey(ymd)}`,
    );
    if (!rows) return {};
    if (Array.isArray(rows)) {
      const out: Record<string, string> = {};
      for (let i = 0; i < rows.length; i += 2) {
        const tid = normalizeStoreTableId(rows[i]);
        const at = String(rows[i + 1] ?? "").trim();
        if (tid && at) out[tid] = at;
      }
      return out;
    }
    return normalizeSettlements(rows);
  }

  if (isStoreDisplayBlobQueueEnabled()) {
    const token = blobToken();
    if (!token) return {};
    const pathname = blobSettlePath(ymd);
    try {
      const meta = await head(pathname, { token });
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok) return {};
      return normalizeSettlements((await res.json()) as Record<string, unknown>);
    } catch {
      return {};
    }
  }

  if (isStoreDisplayMemoryQueueActive()) {
    return { ...(memorySettleStore().get(settlementDayKey(ymd)) ?? {}) };
  }

  return {};
}

async function writeBlobSettlements(
  ymd: string,
  map: Record<string, string>,
): Promise<boolean> {
  const token = blobToken();
  if (!token) return false;
  try {
    await put(blobSettlePath(ymd), JSON.stringify(map), {
      access: "public",
      addRandomSuffix: false,
      token,
      contentType: "application/json; charset=utf-8",
    });
    return true;
  } catch (err) {
    console.error("[storeTableSettlement] blob write", err);
    return false;
  }
}

export async function recordStoreTableSettlement(
  tableId: string,
  ymd = getTodayYmdJst(),
): Promise<{ ok: boolean; settledAt?: string }> {
  const tid = normalizeStoreTableId(tableId);
  if (!tid) return { ok: false };
  const settledAt = new Date().toISOString();

  if (isStoreDisplayRedisQueueEnabled()) {
    const key = settlementDayKey(ymd);
    const pushed = await redisCmd<number>(
      `hset/${key}/${tid}/${encodeRedisValue(settledAt)}`,
    );
    return { ok: pushed !== null, settledAt };
  }

  if (isStoreDisplayBlobQueueEnabled()) {
    const current = await listStoreTableSettlements(ymd);
    const next = { ...current, [tid]: settledAt };
    const ok = await writeBlobSettlements(ymd, next);
    return { ok, settledAt: ok ? settledAt : undefined };
  }

  if (isStoreDisplayMemoryQueueActive()) {
    const store = memorySettleStore();
    const key = settlementDayKey(ymd);
    const next = { ...(store.get(key) ?? {}), [tid]: settledAt };
    store.set(key, next);
    return { ok: true, settledAt };
  }

  return { ok: false };
}

function orderCountsForTableTotal(order: StoreDisplayOrder): boolean {
  if (order.fulfillment !== "dine_in") return false;
  const total = Number(order.total);
  if (!Number.isFinite(total) || total <= 0) return false;
  return Boolean(resolveStoreOrderTableId(order));
}

/** 清算後を除き、卓合計に含まれる店内注文か */
export function isStoreOrderInUnsettledTableTotal(
  order: StoreDisplayOrder,
  tableId: string,
  settlements: Record<string, string>,
): boolean {
  const want = normalizeStoreTableId(tableId);
  if (!want) return false;
  if (!orderCountsForTableTotal(order)) return false;
  const tid = resolveStoreOrderTableId(order);
  if (tid !== want) return false;

  const settledAt = settlements[want];
  const submitted = Date.parse(order.submittedAt || "");
  if (
    settledAt &&
    Number.isFinite(submitted) &&
    submitted <= Date.parse(settledAt)
  ) {
    return false;
  }
  return true;
}

export type StoreTableOrderSummaryLine = {
  label: string;
  qty: number;
  subtotal: number;
};

function displayItemLabel(item: StoreDisplayItem): string {
  const name = String(item.menuName || item.name || "").trim();
  if (!name) return "";
  const dressing = item.dressing ? `（${item.dressing}）` : "";
  return `${name}${dressing}`;
}

function itemLineSubtotal(item: StoreDisplayItem): number {
  const qty = Math.max(0, Number(item.qty ?? item.quantity ?? 0));
  const lineTotal = Number(item.total);
  if (Number.isFinite(lineTotal) && lineTotal > 0) return lineTotal;
  const price = Number(item.price);
  if (Number.isFinite(price) && qty > 0) return price * qty;
  return 0;
}

/** 未清算の卓注文を商品名でまとめた一覧 */
export function buildUnsettledTableOrderSummary(
  orders: StoreDisplayOrder[],
  tableId: string,
  settlements: Record<string, string>,
): StoreTableOrderSummaryLine[] {
  const map = new Map<string, StoreTableOrderSummaryLine>();

  for (const order of orders) {
    if (!isStoreOrderInUnsettledTableTotal(order, tableId, settlements)) {
      continue;
    }
    for (const item of order.items) {
      const label = displayItemLabel(item);
      if (!label) continue;
      const qty = Math.max(0, Number(item.qty ?? item.quantity ?? 0));
      const subtotal = itemLineSubtotal(item);
      const prev = map.get(label);
      if (prev) {
        prev.qty += qty;
        prev.subtotal += subtotal;
      } else {
        map.set(label, { label, qty, subtotal });
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "ja"),
  );
}

export function computeStoreTableRunningTotals(
  orders: StoreDisplayOrder[],
  settlements: Record<string, string>,
): StoreTableRunningTotals {
  const out: StoreTableRunningTotals = {};
  for (let i = 1; i <= STORE_ORDER_TABLE_COUNT; i++) {
    out[String(i)] = { total: 0, orderCount: 0 };
  }

  for (const order of orders) {
    const tid = resolveStoreOrderTableId(order);
    if (!tid || !out[tid]) continue;
    if (!isStoreOrderInUnsettledTableTotal(order, tid, settlements)) continue;
    out[tid].total += Number(order.total) || 0;
    out[tid].orderCount += 1;
  }

  return out;
}
