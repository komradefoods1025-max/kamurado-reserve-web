import { getTodayYmdJst } from "./bookingDates";
import {
  STORE_ORDER_HOURS,
  STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE,
  STORE_ORDER_MIN_LEAD_MINUTES,
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

function isWithinStoreHours(totalMinutes: number): boolean {
  const lastBuffer = STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE;
  for (const window of STORE_ORDER_HOURS) {
    const winStart = parseHm(window.start);
    const winEnd = parseHm(window.end) - lastBuffer;
    if (totalMinutes >= winStart && totalMinutes <= winEnd) return true;
  }
  return false;
}

export type StoreReadyEstimate = {
  pickupDate: string;
  pickupTime: string | null;
  closedToday: boolean;
  message: string | null;
};

/** いまのリアルタイム（JST）からちょうど30分後の時刻 */
export function computeStoreReadyEstimate(
  now = new Date(),
  todayYmd = getTodayYmdJst(now),
): StoreReadyEstimate {
  const readyAt = new Date(
    now.getTime() + STORE_ORDER_MIN_LEAD_MINUTES * 60 * 1000,
  );
  const readyYmd = getTodayYmdJst(readyAt);
  const pickupTime = getJstHmFromDate(readyAt);
  const readyMinutes = getJstTotalMinutesFromDate(readyAt);

  if (isStoreOrderTestMode()) {
    return {
      pickupDate: readyYmd,
      pickupTime,
      closedToday: false,
      message: null,
    };
  }

  if (readyYmd !== todayYmd) {
    return {
      pickupDate: todayYmd,
      pickupTime: null,
      closedToday: true,
      message:
        "本日の受け取り可能な時間を過ぎました。営業時間内でもう一度お試しください。",
    };
  }

  if (!isWithinStoreHours(readyMinutes)) {
    return {
      pickupDate: todayYmd,
      pickupTime: null,
      closedToday: true,
      message:
        "本日の受け取り可能な時間帯がありません。営業時間内でもう一度お試しください。",
    };
  }

  return {
    pickupDate: todayYmd,
    pickupTime,
    closedToday: false,
    message: null,
  };
}

export function isAllowedStorePickupSlot(
  pickupDate: string,
  pickupTime: string,
  todayYmd = getTodayYmdJst(),
  now = new Date(),
): boolean {
  const estimate = computeStoreReadyEstimate(now, todayYmd);
  if (estimate.closedToday || !estimate.pickupTime) return false;
  return (
    pickupDate === estimate.pickupDate && pickupTime === estimate.pickupTime
  );
}
