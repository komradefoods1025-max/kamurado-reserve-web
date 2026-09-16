import rules from "./bookingRules.config.json";

/**
 * 予約受付ルール（判明次第 lib/bookingRules.config.json を更新）
 *
 * GAS（gas/ProductionCode.full.gs）の定数も同内容に揃えてください。
 */

export const REGULAR_CLOSED_WEEKDAYS: number[] = rules.REGULAR_CLOSED_WEEKDAYS;

export const REGULAR_CLOSED_MONTH_DAYS: number[] =
  rules.REGULAR_CLOSED_MONTH_DAYS;

export type MonthWeekdayRule = {
  month: number;
  year?: number;
  allowedWeekdays: number[];
};

export const MONTH_WEEKDAY_RULES: MonthWeekdayRule[] =
  rules.MONTH_WEEKDAY_RULES;

export const CLOSED_HOLIDAYS_BY_YEAR: Record<number, string[]> =
  Object.fromEntries(
    Object.entries(rules.CLOSED_HOLIDAYS_BY_YEAR).map(([year, dates]) => [
      Number(year),
      dates,
    ]),
  );
