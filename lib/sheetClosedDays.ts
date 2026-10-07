import { getReservationSaveUrl } from "./reservationEndpoint";

export type SheetClosedDates = ReadonlySet<string>;

const CACHE_TTL_MS = 60_000;

let memoryCache: { fetchedAt: number; closedDays: Set<string> } | null = null;

export function normalizeClosedDayYmd(value: unknown): string {
  const str = String(value || "")
    .trim()
    .replace(/\//g, "-");
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return str;

  return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

export function toSheetClosedDates(dates: unknown): SheetClosedDates {
  if (!Array.isArray(dates)) return new Set();

  const set = new Set<string>();
  for (const raw of dates) {
    const ymd = normalizeClosedDayYmd(raw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      set.add(ymd);
    }
  }
  return set;
}

export async function fetchSheetClosedDaysSet(options?: {
  bypassCache?: boolean;
}): Promise<Set<string>> {
  if (
    !options?.bypassCache &&
    memoryCache &&
    Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS
  ) {
    return new Set(memoryCache.closedDays);
  }

  const baseUrl = getReservationSaveUrl();
  if (!baseUrl) {
    return new Set();
  }

  const url = new URL(baseUrl);
  url.searchParams.set("action", "getClosedDays");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const text = await response.text();

    let json: { ok?: boolean; closedDays?: unknown };
    try {
      json = JSON.parse(text) as { ok?: boolean; closedDays?: unknown };
    } catch {
      return memoryCache ? new Set(memoryCache.closedDays) : new Set();
    }

    if (!json.ok) {
      return memoryCache ? new Set(memoryCache.closedDays) : new Set();
    }

    const closedDays = toSheetClosedDates(json.closedDays);
    const asSet = new Set(closedDays);
    memoryCache = { fetchedAt: Date.now(), closedDays: asSet };
    return new Set(asSet);
  } catch {
    return memoryCache ? new Set(memoryCache.closedDays) : new Set();
  }
}
