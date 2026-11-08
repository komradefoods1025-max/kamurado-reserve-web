import { getTodayYmdJst } from "./bookingDates";
import {
  STORE_ORDER_HOURS,
  STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE,
  STORE_ORDER_MIN_LEAD_MINUTES,
  STORE_ORDER_SLOT_INTERVAL_MINUTES,
} from "./storeOrderConfig";
import { isStoreOrderTestMode } from "./storeOrderTestMode";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function formatHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function roundUpToInterval(totalMinutes: number, interval: number): number {
  return Math.ceil(totalMinutes / interval) * interval;
}

function getJstHmFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = pad2(Number(parts.find((p) => p.type === "hour")?.value ?? 0));
  const minute = pad2(
    Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  );
  return `${hour}:${minute}`;
}

function getJstTotalMinutesFromDate(date: Date): number {
  const hm = getJstHmFromDate(date);
  return parseHm(hm);
}

export type StorePickupSlotResult = {
  pickupDate: string;
  pickupTime: string | null;
  slots: string[];
  closedToday: boolean;
  message: string | null;
};

export type StoreReadyEstimate = Pick<
  StorePickupSlotResult,
  "pickupDate" | "pickupTime" | "closedToday" | "message"
>;

function buildSlotsForDay(
  earliestMinutes: number,
  interval: number,
): string[] {
  const slots: string[] = [];
  const seen = new Set<string>();

  for (const window of STORE_ORDER_HOURS) {
    const winStart = parseHm(window.start);
    const winEnd = parseHm(window.end) - STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE;
    if (winEnd < winStart) continue;

    let t = roundUpToInterval(Math.max(earliestMinutes, winStart), interval);
    for (; t <= winEnd; t += interval) {
      const hm = formatHm(t);
      if (!seen.has(hm)) {
        seen.add(hm);
        slots.push(hm);
      }
    }
  }

  slots.sort((a, b) => parseHm(a) - parseHm(b));
  return slots;
}

/** 本日の受け取り可能スロット（最短 = いまから30分後・5分刻み） */
export function listStorePickupSlots(
  now = new Date(),
  todayYmd = getTodayYmdJst(now),
): StorePickupSlotResult {
  const readyAt = new Date(
    now.getTime() + STORE_ORDER_MIN_LEAD_MINUTES * 60 * 1000,
  );
  const readyYmd = getTodayYmdJst(readyAt);
  const earliestMinutes = getJstTotalMinutesFromDate(readyAt);
  const interval = STORE_ORDER_SLOT_INTERVAL_MINUTES;
  const slots =
    readyYmd === todayYmd
      ? buildSlotsForDay(earliestMinutes, interval)
      : [];

  const pickupTime = slots[0] ?? null;
  const pickupDate = readyYmd === todayYmd ? todayYmd : todayYmd;

  if (isStoreOrderTestMode()) {
    const testSlots =
      readyYmd === todayYmd
        ? buildSlotsForDay(earliestMinutes, interval)
        : buildSlotsForDay(parseHm("11:00"), interval);
    return {
      pickupDate: readyYmd,
      pickupTime: testSlots[0] ?? getJstHmFromDate(readyAt),
      slots: testSlots.length
        ? testSlots
        : [getJstHmFromDate(readyAt)],
      closedToday: false,
      message: null,
    };
  }

  if (readyYmd !== todayYmd) {
    return {
      pickupDate: todayYmd,
      pickupTime: null,
      slots: [],
      closedToday: true,
      message:
        "本日の受け取り可能な時間を過ぎました。営業時間内でもう一度お試しください。",
    };
  }

  if (!slots.length) {
    return {
      pickupDate: todayYmd,
      pickupTime: null,
      slots: [],
      closedToday: true,
      message:
        "本日の受け取り可能な時間帯がありません。営業時間内でもう一度お試しください。",
    };
  }

  return {
    pickupDate: todayYmd,
    pickupTime,
    slots,
    closedToday: false,
    message: null,
  };
}

/** いまのリアルタイム（JST）からちょうど30分後の時刻（最短スロット） */
export function computeStoreReadyEstimate(
  now = new Date(),
  todayYmd = getTodayYmdJst(now),
): StoreReadyEstimate {
  const result = listStorePickupSlots(now, todayYmd);
  return {
    pickupDate: result.pickupDate,
    pickupTime: result.pickupTime,
    closedToday: result.closedToday,
    message: result.message,
  };
}

export function isAllowedStorePickupSlot(
  pickupDate: string,
  pickupTime: string,
  todayYmd = getTodayYmdJst(),
  now = new Date(),
): boolean {
  const result = listStorePickupSlots(now, todayYmd);
  if (result.closedToday) return false;
  return (
    pickupDate === result.pickupDate &&
    result.slots.includes(pickupTime)
  );
}
