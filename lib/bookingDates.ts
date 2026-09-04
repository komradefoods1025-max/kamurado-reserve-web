export const REGULAR_CLOSED_WEEKDAYS: number[] = [];

/** 毎月の定休日（日付）。例: [9, 13] = 毎月9日・13日 */
export const REGULAR_CLOSED_MONTH_DAYS: number[] = [9, 13];

export function isClosedDate(ymd: string): boolean {
  const match = String(ymd || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const dayOfMonth = Number(match[3]);
  if (REGULAR_CLOSED_MONTH_DAYS.includes(dayOfMonth)) {
    return true;
  }

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00+09:00`);
  const weekday = date.getUTCDay();
  return REGULAR_CLOSED_WEEKDAYS.includes(weekday);
}

export function generateBookableDates(count: number, startOffset = 0): string[] {
  const dates: string[] = [];
  const today = new Date();
  let cursor = startOffset;

  while (dates.length < count && cursor < startOffset + count * 3) {
    const date = new Date(today);
    date.setDate(today.getDate() + cursor);
    cursor += 1;

    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!isClosedDate(ymd)) {
      dates.push(ymd);
    }
  }

  return dates;
}
