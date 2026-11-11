import { addDaysYmd, formatDateLabel, getTodayYmdJst } from "./bookingDates";
import {
  STORE_ORDER_ADVANCE_BOOKING_MAX_DAYS,
  STORE_ORDER_ADVANCE_DATE_CHOICES,
  STORE_ORDER_FUTURE_PICKUP_HOURS,
  STORE_ORDER_HOURS,
  STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE,
  STORE_ORDER_MIN_LEAD_MINUTES,
  STORE_ORDER_SLOT_INTERVAL_MINUTES,
  STORE_ORDER_SWITCH_TO_NEXT_DAY_AFTER,
  type StoreHoursWindow,
} from "./storeOrderConfig";
import { isStoreOrderDineInServer } from "./storeOrderDineIn";
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

/** 当日の「いま+30分」で選ぶ時間帯（17:30〜21:01未満） */
export function isStoreOrderSameDayLiveWindow(now = new Date()): boolean {
  const m = getJstTotalMinutesFromDate(now);
  const open = parseHm(STORE_ORDER_HOURS[0]?.start ?? "17:30");
  const cutoff = parseHm(STORE_ORDER_SWITCH_TO_NEXT_DAY_AFTER);
  return m >= open && m < cutoff;
}

export function advanceBookingStartYmd(todayYmd: string, now: Date): string {
  return isAfterStoreOrderNextDayCutoff(now)
    ? addDaysYmd(todayYmd, 1)
    : todayYmd;
}

/** 予約モードで選んだ日の時間枠（当日=17:30〜、翌日以降=17:00〜） */
export function getStoreSlotsForPickupDate(
  pickupYmd: string,
  todayYmd = getTodayYmdJst(),
): string[] {
  const interval = STORE_ORDER_SLOT_INTERVAL_MINUTES;
  if (pickupYmd === todayYmd) {
    return buildSlotsForWindows(
      STORE_ORDER_HOURS,
      parseHm(STORE_ORDER_HOURS[0]?.start ?? "17:30"),
      interval,
    );
  }
  return buildAdvanceSlots(interval);
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

export type StoreBookableDate = {
  ymd: string;
  label: string;
};

export type StorePickupSlotResult = {
  pickupDate: string;
  bookingMode: StorePickupBookingMode;
  bookableDates: StoreBookableDate[];
  /** いまからちょうど30分後（当日モードのみ・秒付き表示用） */
  earliestReadyTime: string | null;
  /** デフォルト選択 = 選択可能枠の先頭 */
  pickupTime: string | null;
  slots: string[];
  closedToday: boolean;
  message: string | null;
};

export function listStoreAdvanceBookableDates(
  startYmd: string,
  closedDates?: Set<string>,
): StoreBookableDate[] {
  const out: StoreBookableDate[] = [];
  let cursor = startYmd;
  for (let i = 0; i < STORE_ORDER_ADVANCE_BOOKING_MAX_DAYS; i++) {
    if (!closedDates || !closedDates.has(cursor)) {
      out.push({ ymd: cursor, label: formatDateLabel(cursor) });
      if (out.length >= STORE_ORDER_ADVANCE_DATE_CHOICES) break;
    }
    cursor = addDaysYmd(cursor, 1);
  }
  return out;
}

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
  const effectiveClosed = isStoreOrderTestMode() ? undefined : closedDates;
  const todayOpen = !effectiveClosed?.has(todayYmd);

  const useSameDayLive =
    isStoreOrderSameDayLiveWindow(now) &&
    todayOpen &&
    readyYmd === todayYmd;

  const todaySlots = useSameDayLive
    ? buildSlotsForWindows(STORE_ORDER_HOURS, earliestMinutes, interval)
    : [];

  if (todaySlots.length) {
    return {
      pickupDate: todayYmd,
      bookingMode: "today",
      bookableDates: [],
      earliestReadyTime: getJstHmFromDate(readyAt),
      pickupTime: todaySlots[0],
      slots: todaySlots,
      closedToday: false,
      message: null,
    };
  }

  if (isStoreOrderDineInServer()) {
    return {
      pickupDate: todayYmd,
      bookingMode: "today",
      bookableDates: [],
      earliestReadyTime: null,
      pickupTime: null,
      slots: [],
      closedToday: true,
      message:
        "店内オーダーは営業時間内にご注文ください（フードLO 22:00／ドリンクLO 22:30）。",
    };
  }

  const startYmd = advanceBookingStartYmd(todayYmd, now);
  const bookableDates = listStoreAdvanceBookableDates(startYmd, effectiveClosed);
  const pickupDate = bookableDates[0]?.ymd ?? null;
  const slots = pickupDate
    ? getStoreSlotsForPickupDate(pickupDate, todayYmd)
    : [];

  if (!pickupDate || !slots.length || !bookableDates.length) {
    return {
      pickupDate: todayYmd,
      bookingMode: "advance",
      bookableDates: [],
      earliestReadyTime: null,
      pickupTime: null,
      slots: [],
      closedToday: true,
      message:
        "現在、ご予約できるお受け取り日がありません。営業時間内でもう一度お試しください。",
    };
  }

  return {
    pickupDate,
    bookingMode: "advance",
    bookableDates,
    earliestReadyTime: null,
    pickupTime: slots[0],
    slots,
    closedToday: false,
    message: afterCutoff
      ? "21:01以降のご注文は、日付とお受け取り時間をお選びください。"
      : "営業時間前のご注文は、お受け取り日と時間をお選びください。",
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

  if (result.bookingMode === "today") {
    return (
      pickupDate === result.pickupDate && result.slots.includes(pickupTime)
    );
  }

  const dateOk = result.bookableDates.some((d) => d.ymd === pickupDate);
  if (!dateOk) return false;
  return getStoreSlotsForPickupDate(pickupDate, todayYmd).includes(pickupTime);
}
