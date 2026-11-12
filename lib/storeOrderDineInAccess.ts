import { isStoreMenuItemDrink, storeMenuCategoryForItemId } from "./storeMenuCatalog";
import { isStoreOrderTestMode } from "./storeOrderTestMode";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export type StoreDineInAccessResult =
  | { ok: true }
  | { ok: false; message: string };

export function isStoreMenuLineDrink(menuKey: string): boolean {
  const category = storeMenuCategoryForItemId(menuKey);
  if (!category) return false;
  return isStoreMenuItemDrink(category);
}

/** 店内オーダー受付（時刻・LO による拒否は行わず、休業日のみ制限） */
export function getStoreDineInServiceStatus(
  _now = new Date(),
  closedToday = false,
): StoreDineInAccessResult {
  if (closedToday && !isStoreOrderTestMode()) {
    return { ok: false, message: "本日はお休みのため、ご注文いただけません。" };
  }
  return { ok: true };
}

export function validateStoreDineInCart(
  _menuKeys: string[],
  now = new Date(),
  closedToday = false,
): StoreDineInAccessResult {
  return getStoreDineInServiceStatus(now, closedToday);
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
