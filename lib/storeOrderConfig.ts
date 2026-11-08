/** 店内モバイルオーダー（/order）— 営業時間は後から調整可能 */
export const STORE_ORDER_MIN_LEAD_MINUTES = 30;
export const STORE_ORDER_SLOT_INTERVAL_MINUTES = 10;
/** end は最終の受け取り枠（21:30 まで選択可） */
export const STORE_ORDER_LAST_MINUTES_BEFORE_CLOSE = 0;

/** この時刻（JST）以降は当日枠を閉じ、翌日以降の予約枠へ */
export const STORE_ORDER_SWITCH_TO_NEXT_DAY_AFTER = "21:01";

/** 翌日以降の受け取り時間帯 */
export const STORE_ORDER_ADVANCE_BOOKING_MAX_DAYS = 30;

export type StoreHoursWindow = {
  start: string; // "HH:MM"
  end: string;
};

/** 当日の受け取り（注文から30分後以降） */
export const STORE_ORDER_HOURS: StoreHoursWindow[] = [
  { start: "17:30", end: "21:30" },
];

/** 翌日以降の予約受け取り */
export const STORE_ORDER_FUTURE_PICKUP_HOURS: StoreHoursWindow[] = [
  { start: "17:00", end: "21:30" },
];

/** 日付プルダウンに載せる日数（明日から） */
export const STORE_ORDER_ADVANCE_DATE_CHOICES = 14;
