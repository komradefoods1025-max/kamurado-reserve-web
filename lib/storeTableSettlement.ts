import { put, head } from "@vercel/blob";
import { getTodayYmdJst } from "./bookingDates";
import {
  isStoreDisplayBlobQueueEnabled,
  isStoreDisplayMemoryQueueActive,
  isStoreDisplayRedisQueueEnabled,
} from "./storeDisplayQueue";
import type { StoreDisplayOrder } from "./storeDisplayQueue";
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

export function computeStoreTableRunningTotals(
  orders: StoreDisplayOrder[],
  settlements: Record<string, string>,
): StoreTableRunningTotals {
  const out: StoreTableRunningTotals = {};
  for (let i = 1; i <= STORE_ORDER_TABLE_COUNT; i++) {
    out[String(i)] = { total: 0, orderCount: 0 };
  }

  for (const order of orders) {
    if (!orderCountsForTableTotal(order)) continue;
    const tid = resolveStoreOrderTableId(order);
    if (!tid || !out[tid]) continue;

    const settledAt = settlements[tid];
    const submitted = Date.parse(order.submittedAt || "");
    const settled = settledAt ? Date.parse(settledAt) : 0;
    if (settledAt && Number.isFinite(submitted) && submitted <= settled) {
      continue;
    }

    out[tid].total += Number(order.total) || 0;
    out[tid].orderCount += 1;
  }

  return out;
}
