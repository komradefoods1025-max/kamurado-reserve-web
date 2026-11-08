/** 店内モバイルオーダー（/order）— 営業時間は後から調整可能 */
export const STORE_ORDER_MIN_LEAD_MINUTES = 30;
export const STORE_ORDER_SLOT_INTERVAL_MINUTES = 10;
/** end は最終の受け取り枠（21:30 まで選択可） */
export const STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE = 0;

export type StoreHoursWindow = {
  start: string; // "HH:MM"
  end: string;
};

export const STORE_ORDER_HOURS: StoreHoursWindow[] = [
  { start: "17:30", end: "21:30" },
];
