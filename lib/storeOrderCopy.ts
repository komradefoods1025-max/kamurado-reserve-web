/** 店内モバイルオーダー共通文言 */
export const STORE_ORDER_READY_MINUTES = 30;

export const STORE_ORDER_BUSY_DISCLAIMER =
  "※ご注文が混み合っている場合、お時間が前後する可能性もありますので予めご了承ください🙇‍♂️";

export const STORE_ORDER_READY_NOTE_DINE_IN = `お席でお召し上がりの注文です。出来上がりの目安は、ただいまの時刻から${STORE_ORDER_READY_MINUTES}分後です。`;

export const STORE_ORDER_READY_NOTE_PICKUP = `出来上がりの目安は、ただいまの時刻から${STORE_ORDER_READY_MINUTES}分後です。21:01以降はお受け取り日と時間をお選びください。`;

/** @deprecated use dine-in / pickup variants */
export const STORE_ORDER_READY_NOTE = STORE_ORDER_READY_NOTE_DINE_IN;
