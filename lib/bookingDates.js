const rules = require("./bookingRules.config.json");

const REGULAR_CLOSED_WEEKDAYS = rules.REGULAR_CLOSED_WEEKDAYS || [];
const REGULAR_CLOSED_MONTH_DAYS = rules.REGULAR_CLOSED_MONTH_DAYS || [];
const MONTH_WEEKDAY_RULES = rules.MONTH_WEEKDAY_RULES || [];
const CLOSED_HOLIDAY_SET = new Set(
  Object.values(rules.CLOSED_HOLIDAYS_BY_YEAR || {}).flat(),
);

function getWeekdayJst(ymd) {
  return new Date(`${ymd}T12:00:00+09:00`).getUTCDay();
}

function isBlockedByMonthWeekdayRule(ymd) {
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
    return !(rule.allowedWeekdays || []).includes(weekday);
  }

  return false;
}

function isPublicHoliday(ymd) {
  return CLOSED_HOLIDAY_SET.has(String(ymd || "").trim());
}

function isClosedDate(ymd) {
  const match = String(ymd || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  if (isPublicHoliday(match[0])) return true;

  const dayOfMonth = Number(match[3]);
  if (REGULAR_CLOSED_MONTH_DAYS.includes(dayOfMonth)) return true;

  const weekday = getWeekdayJst(ymd);
  if (REGULAR_CLOSED_WEEKDAYS.includes(weekday)) return true;

  if (isBlockedByMonthWeekdayRule(ymd)) return true;

  return false;
}

function isBookableDate(ymd, minYmd) {
  if (!ymd) return false;
  if (minYmd && ymd < minYmd) return false;
  return !isClosedDate(ymd);
}

function filterBookableDates(dates, minYmd) {
  return (dates || []).filter((date) => isBookableDate(date, minYmd));
}

module.exports = {
  isClosedDate,
  isBookableDate,
  isPublicHoliday,
  filterBookableDates,
};
