import {
  STORE_ORDER_DINE_IN_DRINK_LAST_ORDER,
  STORE_ORDER_DINE_IN_FOOD_LAST_ORDER,
  STORE_ORDER_HOURS,
} from "./storeOrderConfig";
import { isStoreMenuItemDrink, storeMenuCategoryForItemId } from "./storeMenuCatalog";
import {
  isStoreOrderBypassLastOrder,
  isStoreOrderTestMode,
} from "./storeOrderTestMode";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function getJstTotalMinutesFromDate(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export type StoreDineInAccessResult =
  | { ok: true }
  | { ok: false; message: string };

export function isStoreMenuLineDrink(menuKey: string): boolean {
  const category = storeMenuCategoryForItemId(menuKey);
  if (!category) return false;
  return isStoreMenuItemDrink(category);
}

export function getStoreDineInServiceStatus(
  now = new Date(),
  closedToday = false,
): StoreDineInAccessResult {
  if (closedToday && !isStoreOrderTestMode()) {
    return { ok: false, message: "本日はお休みのため、ご注文いただけません。" };
  }

  const minutes = getJstTotalMinutesFromDate(now);
  const open = parseHm(STORE_ORDER_HOURS[0]?.start ?? "17:00");
  const drinkEnd = parseHm(STORE_ORDER_DINE_IN_DRINK_LAST_ORDER);

  if (minutes < open && !isStoreOrderTestMode()) {
    const hm = STORE_ORDER_HOURS[0]?.start ?? "17:00";
    return {
      ok: false,
      message: `オーダー受付は ${hm} からです。`,
    };
  }

  if (minutes >= drinkEnd && !isStoreOrderBypassLastOrder()) {
    return {
      ok: false,
      message: `ドリンクラストオーダー（${STORE_ORDER_DINE_IN_DRINK_LAST_ORDER}）を過ぎたため、ご注文をお受けできません。`,
    };
  }

  return { ok: true };
}

export function validateStoreDineInCart(
  menuKeys: string[],
  now = new Date(),
  closedToday = false,
): StoreDineInAccessResult {
  const base = getStoreDineInServiceStatus(now, closedToday);
  if (!base.ok) return base;

  const minutes = getJstTotalMinutesFromDate(now);
  const foodEnd = parseHm(STORE_ORDER_DINE_IN_FOOD_LAST_ORDER);

  if (minutes >= foodEnd && !isStoreOrderBypassLastOrder()) {
    const hasNonDrink = menuKeys.some((key) => !isStoreMenuLineDrink(key));
    if (hasNonDrink) {
      return {
        ok: false,
        message: `フードのラストオーダー（${STORE_ORDER_DINE_IN_FOOD_LAST_ORDER}）を過ぎています。ドリンクのみご注文いただけます。`,
      };
    }
  }

  return { ok: true };
}

/** キッチン・台帳用の時刻ラベル（スロット選択なし） */
export function formatStoreDineInOrderTimeLabel(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = pad2(Number(parts.find((p) => p.type === "hour")?.value ?? 0));
  const minute = pad2(
    Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  );
  return `${hour}:${minute}`;
}
