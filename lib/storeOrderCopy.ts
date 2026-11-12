import {
  STORE_ORDER_DINE_IN_DRINK_LAST_ORDER,
  STORE_ORDER_DINE_IN_FOOD_LAST_ORDER,
} from "./storeOrderConfig";

/** 店内モバイルオーダー共通文言 */
export const STORE_ORDER_READY_MINUTES = 30;

export const STORE_ORDER_BUSY_DISCLAIMER =
  "※ご注文が混み合っている場合、お時間が前後する可能性もありますので予めご了承ください🙇‍♂️";

export const STORE_ORDER_LAST_ORDER_LINES = [
  `フード　ラストオーダー ${STORE_ORDER_DINE_IN_FOOD_LAST_ORDER}`,
  `ドリンク　ラストオーダー ${STORE_ORDER_DINE_IN_DRINK_LAST_ORDER}`,
] as const;

/** 店内テロップ — 宴会プロモ（右から左へ流す） */
export const STORE_ORDER_BANQUET_TELOP =
  "宴会予約受付中‼️ 今なら無料飲み放題も付いております😆✨詳しくは『かむらど　戸田』で検索🔍かお近くのスタッフまで‼️この機会にお得に飲んじゃおー🍻✨";

/** テロップ本体（宴会案内のみ） */
export const STORE_ORDER_DINE_IN_TELOP = STORE_ORDER_BANQUET_TELOP;

/** テロップ下に固定表示するラストオーダー（1行） */
export const STORE_ORDER_LAST_ORDER_ONE_LINE =
  STORE_ORDER_LAST_ORDER_LINES.join("　　");

export const STORE_ORDER_READY_NOTE_DINE_IN =
  "お席でお召し上がりのご注文です。お料理は出来次第、お席へお持ちします。";

export const STORE_ORDER_READY_NOTE_PICKUP = `出来上がりの目安は、ただいまの時刻から${STORE_ORDER_READY_MINUTES}分後です。21:01以降はお受け取り日と時間をお選びください。`;

/** @deprecated use dine-in / pickup variants */
export const STORE_ORDER_READY_NOTE = STORE_ORDER_READY_NOTE_DINE_IN;
