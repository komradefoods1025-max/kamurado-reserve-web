import { isBookableDate } from "./bookingDates";

export const ORDER_START_DATE = "2026-04-02";

export function normalizeReservationDateYmd(value: unknown): string {
  const str = String(value || "")
    .trim()
    .replace(/\//g, "-");
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return str;

  return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

export function formatReservationBookingError(
  raw: unknown,
  dateYmd?: string,
): string {
  const text = String(raw || "").replace(/^Error:\s*/i, "").trim();
  if (!text.includes("date is not available for booking")) {
    return text || "予約の保存に失敗しました。";
  }

  const normalized = dateYmd ? normalizeReservationDateYmd(dateYmd) : "";
  if (normalized && isBookableDate(normalized, ORDER_START_DATE)) {
    return (
      "選択した受取日は、予約保存システムの設定により受付できませんでした。\n" +
      "お手数ですが TEL 048-441-5517 までお電話ください。"
    );
  }

  return (
    "選択した受取日は現在お受けできません。別の日時をお選びください。\n" +
    "（臨時休業の日は選択できません）"
  );
}
