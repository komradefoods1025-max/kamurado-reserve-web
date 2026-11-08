/** 店内モバイルオーダー（/order）— 営業時間は後から調整可能 */
export const STORE_ORDER_MIN_LEAD_MINUTES = 30;
export const STORE_ORDER_SLOT_INTERVAL_MINUTES = 5;
export const STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE = 20;

export type StoreHoursWindow = {
  start: string; // "HH:MM"
  end: string;
};

export const STORE_ORDER_HOURS: StoreHoursWindow[] = [
  { start: "11:00", end: "14:00" },
  { start: "17:00", end: "20:00" },
];
