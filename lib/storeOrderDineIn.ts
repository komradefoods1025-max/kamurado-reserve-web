/** 店内飲食（持ち帰り予約なし）。未設定時は true（店内前提）。 */
function isTruthy(value: string | undefined) {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isStoreOrderDineInServer(): boolean {
  if (isTruthy(process.env.STORE_ORDER_DINE_IN)) return true;
  if (process.env.STORE_ORDER_DINE_IN === "false") return false;
  if (isTruthy(process.env.STORE_ORDER_PICKUP)) return false;
  return true;
}

export function isStoreOrderDineInClient(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_STORE_ORDER_DINE_IN) {
    return isTruthy(process.env.NEXT_PUBLIC_STORE_ORDER_DINE_IN);
  }
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_STORE_ORDER_PICKUP === "true"
  ) {
    return false;
  }
  return true;
}

/** 店内でお客様入力を出さないときの台帳・キッチン表示用 */
export const STORE_ORDER_DINE_IN_GUEST_NAME = "店内";
export const STORE_ORDER_DINE_IN_GUEST_PHONE = "09000000000";
