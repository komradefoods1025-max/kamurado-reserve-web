import rules from "./bookingRules.config.json";

/**
 * 予約受付ルール（判明次第 lib/bookingRules.config.json を更新）
 *
 * GAS（gas/ProductionCode.full.gs）の定数も同内容に揃えてください。
 * 臨時休業はスプレッドシート closed_days シート（Web/LINE 共通・GAS getClosedDays）。
 */

export const REGULAR_CLOSED_WEEKDAYS: number[] = rules.REGULAR_CLOSED_WEEKDAYS;

export const REGULAR_CLOSED_MONTH_DAYS: number[] =
  rules.REGULAR_CLOSED_MONTH_DAYS;

export type MonthWeekdayRule = {
  month: number;
  year?: number;
  allowedWeekdays: number[];
};

export type MonthOpenDaysRule = {
  month: number;
  year?: number;
  days: number[];
};

export const MONTH_WEEKDAY_RULES: MonthWeekdayRule[] =
  rules.MONTH_WEEKDAY_RULES;

export const MONTH_OPEN_DAYS_RULES: MonthOpenDaysRule[] =
  (rules as { MONTH_OPEN_DAYS_RULES?: MonthOpenDaysRule[] })
    .MONTH_OPEN_DAYS_RULES ?? [];

/** 祝日でも予約可能にする月（例: 9 = 9月の祝日は受付可。10月以降の祝日は従来どおり不可） */
export const HOLIDAY_BOOKABLE_MONTHS: number[] =
  rules.HOLIDAY_BOOKABLE_MONTHS ?? [];

const closedHolidaysByYear = rules.CLOSED_HOLIDAYS_BY_YEAR as Record<
  string,
  string[]
>;

export const CLOSED_HOLIDAYS_BY_YEAR: Record<number, string[]> =
  Object.fromEntries(
    Object.entries(closedHolidaysByYear).map(([year, dates]) => [
      Number(year),
      dates,
    ]),
  );
