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
  orderMatchesStoreTable,
  resolveStoreOrderTableId,
  STORE_ORDER_TABLE_COUNT,
} from "./storeOrderTables";

export type StoreTableRunningTotal = {
  total: number;
  orderCount: number;
};

export type StoreTableRunningTotals = Record<string, StoreTableRunningTotal>;

/** 卓ごとの清算状態（API・画面で共有） */
export type StoreTableSettlementState = {
  settledAt: Record<string, string>;
  clearedReservationNos: Record<string, string[]>;
};

const EMPTY_SETTLEMENT_STATE: StoreTableSettlementState = {
  settledAt: {},
  clearedReservationNos: {},
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

function decodeRedisFieldValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function settlementDayKey(ymd: string): string {
  return `store:table-settle:${ymd}`;
}

type MemorySettleStore = Map<string, StoreTableSettlementState>;

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

function uniqueReservationNos(values: Iterable<string>): string[] {
  return [...new Set([...values].filter(Boolean))];
}

function normalizeSettledAtMap(
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

function normalizeClearedMap(
  raw: Record<string, unknown> | null | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) {
    const tid = normalizeStoreTableId(k);
    if (!tid) continue;
    const nos = Array.isArray(v)
      ? uniqueReservationNos(v.map((x) => String(x ?? "").trim()))
      : [];
    if (nos.length) out[tid] = nos;
  }
  return out;
}

function mergeSettlementStates(
  ...parts: StoreTableSettlementState[]
): StoreTableSettlementState {
  const settledAt: Record<string, string> = {};
  const clearedReservationNos: Record<string, string[]> = {};

  for (const part of parts) {
    Object.assign(settledAt, part.settledAt);
    for (const [tid, nos] of Object.entries(part.clearedReservationNos)) {
      const prev = clearedReservationNos[tid] ?? [];
      clearedReservationNos[tid] = uniqueReservationNos([...prev, ...nos]);
    }
  }

  return { settledAt, clearedReservationNos };
}

function parseRedisTableSettlementField(
  raw: string,
): { settledAt?: string; clearedReservationNos?: string[] } {
  const decoded = decodeRedisFieldValue(String(raw ?? "").trim());
  if (!decoded) return {};
  if (decoded.startsWith("{")) {
    try {
      const obj = JSON.parse(decoded) as {
        settledAt?: unknown;
        clearedReservationNos?: unknown;
      };
      const settledAt = String(obj.settledAt ?? "").trim() || undefined;
      const cleared = Array.isArray(obj.clearedReservationNos)
        ? uniqueReservationNos(
            obj.clearedReservationNos.map((x) => String(x ?? "").trim()),
          )
        : undefined;
      return { settledAt, clearedReservationNos: cleared };
    } catch {
      /* legacy ISO */
    }
  }
  return { settledAt: decoded };
}

function parseBlobSettlementPayload(
  raw: unknown,
): StoreTableSettlementState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SETTLEMENT_STATE };

  const body = raw as Record<string, unknown>;
  if (body.v === 2) {
    return {
      settledAt: normalizeSettledAtMap(
        body.settledAt as Record<string, unknown>,
      ),
      clearedReservationNos: normalizeClearedMap(
        body.clearedReservationNos as Record<string, unknown>,
      ),
    };
  }

  return {
    settledAt: normalizeSettledAtMap(body),
    clearedReservationNos: {},
  };
}

export function isStoreTableSettlementStorageAvailable(): boolean {
  return (
    isStoreDisplayRedisQueueEnabled() ||
    isStoreDisplayBlobQueueEnabled() ||
    isStoreDisplayMemoryQueueActive()
  );
}

export async function listStoreTableSettlementState(
  ymd = getTodayYmdJst(),
): Promise<StoreTableSettlementState> {
  if (isStoreDisplayRedisQueueEnabled()) {
    const rows = await redisCmd<string[] | Record<string, string>>(
      `hgetall/${settlementDayKey(ymd)}`,
    );
    if (!rows) return { ...EMPTY_SETTLEMENT_STATE };

    const settledAt: Record<string, string> = {};
    const clearedReservationNos: Record<string, string[]> = {};

    const pairs: [string, string][] = Array.isArray(rows)
      ? (() => {
          const out: [string, string][] = [];
          for (let i = 0; i < rows.length; i += 2) {
            out.push([String(rows[i] ?? ""), String(rows[i + 1] ?? "")]);
          }
          return out;
        })()
      : Object.entries(rows).map(([k, v]) => [k, String(v ?? "")]);

    for (const [field, value] of pairs) {
      const tid = normalizeStoreTableId(field);
      if (!tid) continue;
      const parsed = parseRedisTableSettlementField(value);
      if (parsed.settledAt) settledAt[tid] = parsed.settledAt;
      if (parsed.clearedReservationNos?.length) {
        const prev = clearedReservationNos[tid] ?? [];
        clearedReservationNos[tid] = uniqueReservationNos([
          ...prev,
          ...parsed.clearedReservationNos,
        ]);
      }
    }

    return { settledAt, clearedReservationNos };
  }

  if (isStoreDisplayBlobQueueEnabled()) {
    const token = blobToken();
    if (!token) return { ...EMPTY_SETTLEMENT_STATE };
    const pathname = blobSettlePath(ymd);
    try {
      const meta = await head(pathname, { token });
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok) return { ...EMPTY_SETTLEMENT_STATE };
      return parseBlobSettlementPayload(await res.json());
    } catch {
      return { ...EMPTY_SETTLEMENT_STATE };
    }
  }

  if (isStoreDisplayMemoryQueueActive()) {
    return {
      ...(memorySettleStore().get(settlementDayKey(ymd)) ??
        EMPTY_SETTLEMENT_STATE),
    };
  }

  return { ...EMPTY_SETTLEMENT_STATE };
}

/** 後方互換: 最終清算時刻のみ */
export async function listStoreTableSettlements(
  ymd = getTodayYmdJst(),
): Promise<Record<string, string>> {
  const state = await listStoreTableSettlementState(ymd);
  return { ...state.settledAt };
}

async function writeBlobSettlementState(
  ymd: string,
  state: StoreTableSettlementState,
): Promise<boolean> {
  const token = blobToken();
  if (!token) return false;
  try {
    await put(
      blobSettlePath(ymd),
      JSON.stringify({
        v: 2,
        settledAt: state.settledAt,
        clearedReservationNos: state.clearedReservationNos,
      }),
      {
        access: "public",
        addRandomSuffix: false,
        token,
        contentType: "application/json; charset=utf-8",
      },
    );
    return true;
  } catch (err) {
    console.error("[storeTableSettlement] blob write", err);
    return false;
  }
}

function reservationNosForTableUnsettledSnapshot(
  orders: StoreDisplayOrder[],
  tableId: string,
  state: StoreTableSettlementState,
): string[] {
  const want = normalizeStoreTableId(tableId);
  if (!want) return [];
  return uniqueReservationNos(
    orders
      .filter((o) => isStoreOrderInUnsettledTableTotal(o, want, state))
      .map((o) => String(o.reservationNo || "").trim()),
  );
}

export async function recordStoreTableSettlement(
  tableId: string,
  ymd = getTodayYmdJst(),
  orders: StoreDisplayOrder[] = [],
): Promise<{
  ok: boolean;
  settledAt?: string;
  settlements?: Record<string, string>;
  settlementCleared?: Record<string, string[]>;
  settlementState?: StoreTableSettlementState;
}> {
  const tid = normalizeStoreTableId(tableId);
  if (!tid) return { ok: false };
  const settledAt = new Date().toISOString();

  const current = await listStoreTableSettlementState(ymd);
  const snapshotNos = reservationNosForTableUnsettledSnapshot(
    orders,
    tid,
    current,
  );
  const prevCleared = current.clearedReservationNos[tid] ?? [];
  const nextCleared = uniqueReservationNos([...prevCleared, ...snapshotNos]);
  const nextState: StoreTableSettlementState = {
    settledAt: { ...current.settledAt, [tid]: settledAt },
    clearedReservationNos: {
      ...current.clearedReservationNos,
      [tid]: nextCleared,
    },
  };

  if (isStoreDisplayRedisQueueEnabled()) {
    const key = settlementDayKey(ymd);
    const payload = JSON.stringify({
      settledAt,
      clearedReservationNos: nextCleared,
    });
    const pushed = await redisCmd<number>(
      `hset/${key}/${tid}/${encodeRedisValue(payload)}`,
    );
    if (pushed === null) return { ok: false };
    return {
      ok: true,
      settledAt,
      settlements: { ...nextState.settledAt },
      settlementCleared: { ...nextState.clearedReservationNos },
      settlementState: nextState,
    };
  }

  if (isStoreDisplayBlobQueueEnabled()) {
    const ok = await writeBlobSettlementState(ymd, nextState);
    return {
      ok,
      settledAt: ok ? settledAt : undefined,
      settlements: ok ? { ...nextState.settledAt } : { ...current.settledAt },
      settlementCleared: ok
        ? { ...nextState.clearedReservationNos }
        : { ...current.clearedReservationNos },
      settlementState: ok ? nextState : current,
    };
  }

  if (isStoreDisplayMemoryQueueActive()) {
    const store = memorySettleStore();
    const key = settlementDayKey(ymd);
    store.set(key, nextState);
    return {
      ok: true,
      settledAt,
      settlements: { ...nextState.settledAt },
      settlementCleared: { ...nextState.clearedReservationNos },
      settlementState: nextState,
    };
  }

  return { ok: false };
}

function orderCountsForTableTotal(order: StoreDisplayOrder): boolean {
  if (order.fulfillment !== "dine_in") return false;
  const total = Number(order.total);
  if (!Number.isFinite(total) || total <= 0) return false;
  return Boolean(resolveStoreOrderTableId(order));
}

function isReservationClearedForTable(
  reservationNo: string,
  tableId: string,
  state: StoreTableSettlementState,
): boolean {
  const want = normalizeStoreTableId(tableId);
  if (!want) return false;
  const no = String(reservationNo || "").trim();
  if (!no) return false;
  const list = state.clearedReservationNos[want];
  return Boolean(list?.includes(no));
}

/** 清算後を除き、卓合計に含まれる店内注文か */
export function isStoreOrderInUnsettledTableTotal(
  order: StoreDisplayOrder,
  tableId: string,
  state: StoreTableSettlementState,
): boolean {
  const want = normalizeStoreTableId(tableId);
  if (!want) return false;
  if (!orderCountsForTableTotal(order)) return false;
  if (!orderMatchesStoreTable(order, want)) return false;

  return !isReservationClearedForTable(order.reservationNo, want, state);
}

export type StoreTableOrderSummaryLine = {
  id: string;
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
  state: StoreTableSettlementState,
): StoreTableOrderSummaryLine[] {
  const want = normalizeStoreTableId(tableId);
  if (!want) return [];

  const map = new Map<string, StoreTableOrderSummaryLine>();

  for (const order of orders) {
    if (!isStoreOrderInUnsettledTableTotal(order, want, state)) {
      continue;
    }
    for (const item of order.items) {
      const label = displayItemLabel(item);
      if (!label) continue;
      const qty = Math.max(0, Number(item.qty ?? item.quantity ?? 0));
      if (qty <= 0) continue;
      const subtotal = itemLineSubtotal(item);
      const lineKey = `${want}\0${label}`;
      const prev = map.get(lineKey);
      if (prev) {
        prev.qty += qty;
        prev.subtotal += subtotal;
      } else {
        map.set(lineKey, { id: lineKey, label, qty, subtotal });
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "ja"),
  );
}

export function computeStoreTableRunningTotals(
  orders: StoreDisplayOrder[],
  state: StoreTableSettlementState,
): StoreTableRunningTotals {
  const out: StoreTableRunningTotals = {};
  for (let i = 1; i <= STORE_ORDER_TABLE_COUNT; i++) {
    out[String(i)] = { total: 0, orderCount: 0 };
  }

  for (const order of orders) {
    const tid = resolveStoreOrderTableId(order);
    if (!tid || !out[tid]) continue;
    if (!isStoreOrderInUnsettledTableTotal(order, tid, state)) continue;
    out[tid].total += Number(order.total) || 0;
    out[tid].orderCount += 1;
  }

  return out;
}

export function buildStoreTableSettlementStateFromFeed(
  data: {
    settlements?: unknown;
    settlementCleared?: unknown;
  },
  previous?: StoreTableSettlementState,
): StoreTableSettlementState {
  const settledAt = normalizeSettledAtMap(
    data.settlements as Record<string, unknown> | undefined,
  );
  const hasClearedPayload =
    data.settlementCleared !== undefined && data.settlementCleared !== null;
  const clearedReservationNos = hasClearedPayload
    ? normalizeClearedMap(
        data.settlementCleared as Record<string, unknown> | undefined,
      )
    : { ...(previous?.clearedReservationNos ?? {}) };

  const hasSettledPayload =
    data.settlements !== undefined && data.settlements !== null;
  const mergedSettled = hasSettledPayload
    ? settledAt
    : { ...(previous?.settledAt ?? {}), ...settledAt };

  return mergeSettlementStates({
    settledAt: mergedSettled,
    clearedReservationNos,
  });
}