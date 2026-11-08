import { addDaysYmd, getTodayYmdJst } from "./bookingDates";
import {
  STORE_ORDER_ADVANCE_BOOKING_MAX_DAYS,
  STORE_ORDER_FUTURE_PICKUP_HOURS,
  STORE_ORDER_HOURS,
  STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE,
  STORE_ORDER_MIN_LEAD_MINUTES,
  STORE_ORDER_SLOT_INTERVAL_MINUTES,
  STORE_ORDER_SWITCH_TO_NEXT_DAY_AFTER,
  type StoreHoursWindow,
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

function jstTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return {
    hour: pad2(Number(parts.find((p) => p.type === "hour")?.value ?? 0)),
    minute: pad2(Number(parts.find((p) => p.type === "minute")?.value ?? 0)),
    second: pad2(Number(parts.find((p) => p.type === "second")?.value ?? 0)),
  };
}

function getJstHmFromDate(date: Date): string {
  const { hour, minute } = jstTimeParts(date);
  return `${hour}:${minute}`;
}

function getJstTotalMinutesFromDate(date: Date): number {
  return parseHm(getJstHmFromDate(date));
}

export function isAfterStoreOrderNextDayCutoff(now = new Date()): boolean {
  return (
    getJstTotalMinutesFromDate(now) >=
    parseHm(STORE_ORDER_SWITCH_TO_NEXT_DAY_AFTER)
  );
}

/** いま+30分を JST で HH:MM:SS 表示（画面のリアルタイム目安用） */
export function formatStoreEarliestReadyWithSeconds(now = new Date()): string {
  const readyAt = new Date(
    now.getTime() + STORE_ORDER_MIN_LEAD_MINUTES * 60 * 1000,
  );
  const { hour, minute, second } = jstTimeParts(readyAt);
  return `${hour}:${minute}:${second}`;
}

export type StorePickupBookingMode = "today" | "advance";

export type StorePickupSlotResult = {
  pickupDate: string;
  bookingMode: StorePickupBookingMode;
  /** いまからちょうど30分後（当日モードのみ・秒付き表示用） */
  earliestReadyTime: string | null;
  /** デフォルト選択 = 選択可能枠の先頭 */
  pickupTime: string | null;
  slots: string[];
  closedToday: boolean;
  message: string | null;
};

export type StoreReadyEstimate = Pick<
  StorePickupSlotResult,
  "pickupDate" | "pickupTime" | "closedToday" | "message"
>;

function buildSlotsForWindows(
  windows: StoreHoursWindow[],
  earliestMinutes: number,
  interval: number,
): string[] {
  const slots: string[] = [];
  const seen = new Set<string>();

  for (const window of windows) {
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

function findAdvancePickupDate(
  fromYmd: string,
  closedDates?: Set<string>,
): string | null {
  let cursor = fromYmd;
  for (let i = 0; i < STORE_ORDER_ADVANCE_BOOKING_MAX_DAYS; i++) {
    if (!closedDates || !closedDates.has(cursor)) return cursor;
    cursor = addDaysYmd(cursor, 1);
  }
  return null;
}

function buildAdvanceSlots(interval: number): string[] {
  return buildSlotsForWindows(
    STORE_ORDER_FUTURE_PICKUP_HOURS,
    parseHm(STORE_ORDER_FUTURE_PICKUP_HOURS[0]?.start ?? "17:00"),
    interval,
  );
}

/** 本日または翌日以降の受け取り可能スロット */
export function listStorePickupSlots(
  now = new Date(),
  todayYmd = getTodayYmdJst(now),
  closedDates?: Set<string>,
): StorePickupSlotResult {
  const readyAt = new Date(
    now.getTime() + STORE_ORDER_MIN_LEAD_MINUTES * 60 * 1000,
  );
  const readyYmd = getTodayYmdJst(readyAt);
  const earliestMinutes = getJstTotalMinutesFromDate(readyAt);
  const interval = STORE_ORDER_SLOT_INTERVAL_MINUTES;
  const afterCutoff = isAfterStoreOrderNextDayCutoff(now);

  const tryToday =
    !afterCutoff &&
    readyYmd === todayYmd &&
    (!closedDates || !closedDates.has(todayYmd));
  const todaySlots = tryToday
    ? buildSlotsForWindows(STORE_ORDER_HOURS, earliestMinutes, interval)
    : [];

  if (isStoreOrderTestMode()) {
    if (todaySlots.length) {
      const testEarliest = getJstHmFromDate(readyAt);
      return {
        pickupDate: todayYmd,
        bookingMode: "today",
        earliestReadyTime: testEarliest,
        pickupTime: todaySlots[0],
        slots: todaySlots,
        closedToday: false,
        message: null,
      };
    }
    const advanceDate =
      findAdvancePickupDate(addDaysYmd(todayYmd, 1), closedDates) ??
      addDaysYmd(todayYmd, 1);
    const advanceSlots = buildAdvanceSlots(interval);
    return {
      pickupDate: advanceDate,
      bookingMode: "advance",
      earliestReadyTime: advanceSlots[0] ?? "17:00",
      pickupTime: advanceSlots[0] ?? null,
      slots: advanceSlots,
      closedToday: false,
      message: null,
    };
  }

  if (todaySlots.length) {
    return {
      pickupDate: todayYmd,
      bookingMode: "today",
      earliestReadyTime: getJstHmFromDate(readyAt),
      pickupTime: todaySlots[0],
      slots: todaySlots,
      closedToday: false,
      message: null,
    };
  }

  const advanceFrom = addDaysYmd(todayYmd, 1);
  const advanceDate = findAdvancePickupDate(advanceFrom, closedDates);
  const advanceSlots = buildAdvanceSlots(interval);

  if (!advanceDate || !advanceSlots.length) {
    return {
      pickupDate: todayYmd,
      bookingMode: "advance",
      earliestReadyTime: null,
      pickupTime: null,
      slots: [],
      closedToday: true,
      message:
        "現在、ご予約できるお受け取り日がありません。営業時間内でもう一度お試しください。",
    };
  }

  return {
    pickupDate: advanceDate,
    bookingMode: "advance",
    earliestReadyTime: advanceSlots[0],
    pickupTime: advanceSlots[0],
    slots: advanceSlots,
    closedToday: false,
    message: afterCutoff
      ? "21:01以降のご注文は、翌日以降のお受け取り時間（17:00〜）をお選びください。"
      : "本日の受け取り枠は終了しました。翌日以降のお受け取り時間をお選びください。",
  };
}

/** いまのリアルタイム（JST）からちょうど30分後の時刻（最短スロット） */
export function computeStoreReadyEstimate(
  now = new Date(),
  todayYmd = getTodayYmdJst(now),
  closedDates?: Set<string>,
): StoreReadyEstimate {
  const result = listStorePickupSlots(now, todayYmd, closedDates);
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
  closedDates?: Set<string>,
): boolean {
  const result = listStorePickupSlots(now, todayYmd, closedDates);
  if (result.closedToday) return false;
  return (
    pickupDate === result.pickupDate &&
    result.slots.includes(pickupTime)
  );
}
