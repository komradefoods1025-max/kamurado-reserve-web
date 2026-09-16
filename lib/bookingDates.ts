import {
  CLOSED_HOLIDAYS_BY_YEAR,
  MONTH_WEEKDAY_RULES,
  REGULAR_CLOSED_MONTH_DAYS,
  REGULAR_CLOSED_WEEKDAYS,
  type MonthWeekdayRule,
} from "./bookingRules.config";

export {
  CLOSED_HOLIDAYS_BY_YEAR,
  MONTH_WEEKDAY_RULES,
  REGULAR_CLOSED_MONTH_DAYS,
  REGULAR_CLOSED_WEEKDAYS,
  type MonthWeekdayRule,
} from "./bookingRules.config";

export type MonthCalendarDay = {
  ymd: string;
  day: number;
  bookable: boolean;
  isPast: boolean;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const CLOSED_HOLIDAY_SET = new Set(
  Object.values(CLOSED_HOLIDAYS_BY_YEAR).flat(),
);

export function isPublicHoliday(ymd: string): boolean {
  return CLOSED_HOLIDAY_SET.has(String(ymd || "").trim());
}

export function getTodayYmdJst(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function getWeekdayJst(ymd: string): number {
  const date = new Date(`${ymd}T12:00:00+09:00`);
  return date.getUTCDay();
}

function isBlockedByMonthWeekdayRule(ymd: string): boolean {
  const match = String(ymd || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const weekday = getWeekdayJst(ymd);

  for (const rule of MONTH_WEEKDAY_RULES) {
    if (rule.month !== month) continue;
    if (rule.year !== undefined && rule.year !== year) continue;
    return !rule.allowedWeekdays.includes(weekday);
  }

  return false;
}

export function isClosedDate(ymd: string): boolean {
  const match = String(ymd || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  if (isPublicHoliday(match[0])) {
    return true;
  }

  const dayOfMonth = Number(match[3]);
  if (REGULAR_CLOSED_MONTH_DAYS.includes(dayOfMonth)) {
    return true;
  }

  const weekday = getWeekdayJst(ymd);
  if (REGULAR_CLOSED_WEEKDAYS.includes(weekday)) {
    return true;
  }

  if (isBlockedByMonthWeekdayRule(ymd)) {
    return true;
  }

  return false;
}

export function isBookableDate(ymd: string, minYmd?: string): boolean {
  if (!ymd) return false;
  if (minYmd && ymd < minYmd) return false;
  return !isClosedDate(ymd);
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`;
}

export function formatDateLabel(ymd: string): string {
  const date = new Date(`${ymd}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function getMonthFromYmd(ymd: string): { year: number; month: number } {
  const match = String(ymd || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!match) {
    const today = getTodayYmdJst();
    return {
      year: Number(today.slice(0, 4)),
      month: Number(today.slice(5, 7)),
    };
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

export function compareMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function getBookableDatesInMonth(
  year: number,
  month: number,
  minYmd?: string,
): string[] {
  const dates: string[] = [];
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();

  for (let day = 1; day <= lastDay; day += 1) {
    const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isBookableDate(ymd, minYmd)) {
      dates.push(ymd);
    }
  }

  return dates;
}

export function buildMonthCalendarGrid(
  year: number,
  month: number,
  minYmd?: string,
): Array<MonthCalendarDay | null> {
  const firstWeekday = getWeekdayJst(
    `${year}-${String(month).padStart(2, "0")}-01`,
  );
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
  const cells: Array<MonthCalendarDay | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isPast = Boolean(minYmd && ymd < minYmd);
    cells.push({
      ymd,
      day,
      bookable: isBookableDate(ymd, minYmd),
      isPast,
    });
  }

  return cells;
}

export function getWeekdayLabels(): string[] {
  return [...WEEKDAY_LABELS];
}

export function generateBookableDates(
  count: number,
  startOffset = 0,
  minYmd?: string,
): string[] {
  const dates: string[] = [];
  const today = getTodayYmdJst();
  const minDate = minYmd || today;
  let cursor = startOffset;

  while (dates.length < count && cursor < startOffset + count * 4) {
    const base = new Date(`${minDate}T12:00:00+09:00`);
    base.setUTCDate(base.getUTCDate() + cursor);
    cursor += 1;

    const ymd = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(base);

    if (isBookableDate(ymd, minDate)) {
      dates.push(ymd);
    }
  }

  return dates;
}
