import {
  CLOSED_HOLIDAYS_BY_YEAR,
  HOLIDAY_BOOKABLE_MONTHS,
  MONTH_OPEN_DAYS_RULES,
  MONTH_WEEKDAY_RULES,
  REGULAR_CLOSED_MONTH_DAYS,
  REGULAR_CLOSED_WEEKDAYS,
  type MonthOpenDaysRule,
  type MonthWeekdayRule,
} from "./bookingRules.config";
import type { SheetClosedDates } from "./sheetClosedDays";

export {
  CLOSED_HOLIDAYS_BY_YEAR,
  HOLIDAY_BOOKABLE_MONTHS,
  MONTH_OPEN_DAYS_RULES,
  MONTH_WEEKDAY_RULES,
  REGULAR_CLOSED_MONTH_DAYS,
  REGULAR_CLOSED_WEEKDAYS,
  type MonthOpenDaysRule,
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

const HOLIDAY_BOOKABLE_MONTH_SET = new Set(HOLIDAY_BOOKABLE_MONTHS);

export function isPublicHoliday(ymd: string): boolean {
  return CLOSED_HOLIDAY_SET.has(String(ymd || "").trim());
}

function isHolidayClosedForBooking(ymd: string): boolean {
  if (!isPublicHoliday(ymd)) return false;
  const match = String(ymd || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return true;
  const month = Number(match[2]);
  if (HOLIDAY_BOOKABLE_MONTH_SET.has(month)) return false;
  return true;
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

function findMonthOpenDaysRule(
  year: number,
  month: number,
): MonthOpenDaysRule | null {
  for (const rule of MONTH_OPEN_DAYS_RULES) {
    if (rule.month !== month) continue;
    if (rule.year !== undefined && rule.year !== year) continue;
    return rule;
  }
  return null;
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

export function isClosedDate(
  ymd: string,
  sheetClosedDates?: SheetClosedDates,
): boolean {
  const match = String(ymd || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  if (sheetClosedDates?.has(match[0])) {
    return true;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayOfMonth = Number(match[3]);
  const openDaysRule = findMonthOpenDaysRule(year, month);
  if (openDaysRule) {
    return !openDaysRule.days.includes(dayOfMonth);
  }

  if (isHolidayClosedForBooking(match[0])) {
    return true;
  }

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

export function isBookableDate(
  ymd: string,
  minYmd?: string,
  sheetClosedDates?: SheetClosedDates,
): boolean {
  if (!ymd) return false;
  if (minYmd && ymd < minYmd) return false;
  return !isClosedDate(ymd, sheetClosedDates);
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
  sheetClosedDates?: SheetClosedDates,
): string[] {
  const dates: string[] = [];
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();

  for (let day = 1; day <= lastDay; day += 1) {
    const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isBookableDate(ymd, minYmd, sheetClosedDates)) {
      dates.push(ymd);
    }
  }

  return dates;
}

export function buildMonthCalendarGrid(
  year: number,
  month: number,
  minYmd?: string,
  sheetClosedDates?: SheetClosedDates,
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
      bookable: isBookableDate(ymd, minYmd, sheetClosedDates),
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
  sheetClosedDates?: SheetClosedDates,
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

    if (isBookableDate(ymd, minDate, sheetClosedDates)) {
      dates.push(ymd);
    }
  }

  return dates;
}
