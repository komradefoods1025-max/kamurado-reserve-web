"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildMonthCalendarGrid,
  compareMonth,
  formatMonthTitle,
  getMonthFromYmd,
  getTodayYmdJst,
  getWeekdayLabels,
  shiftMonth,
} from "../lib/bookingDates";

type MonthDatePickerProps = {
  value: string;
  onChange: (ymd: string) => void;
  minYmd?: string;
  disabled?: boolean;
};

export default function MonthDatePicker({
  value,
  onChange,
  minYmd,
  disabled = false,
}: MonthDatePickerProps) {
  const effectiveMinYmd = minYmd || getTodayYmdJst();
  const minMonth = useMemo(
    () => getMonthFromYmd(effectiveMinYmd),
    [effectiveMinYmd],
  );

  const [viewYear, setViewYear] = useState(() =>
    value ? getMonthFromYmd(value).year : minMonth.year,
  );
  const [viewMonth, setViewMonth] = useState(() =>
    value ? getMonthFromYmd(value).month : minMonth.month,
  );

  useEffect(() => {
    if (!value) return;
    const next = getMonthFromYmd(value);
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [value]);

  const calendarCells = useMemo(
    () => buildMonthCalendarGrid(viewYear, viewMonth, effectiveMinYmd),
    [viewYear, viewMonth, effectiveMinYmd],
  );

  const currentView = { year: viewYear, month: viewMonth };
  const canGoPrev = compareMonth(currentView, minMonth) > 0;

  function goPrevMonth() {
    if (!canGoPrev || disabled) return;
    const next = shiftMonth(viewYear, viewMonth, -1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  function goNextMonth() {
    if (disabled) return;
    const next = shiftMonth(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrevMonth}
          disabled={!canGoPrev || disabled}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="前の月"
        >
          ◀
        </button>

        <div className="text-base font-semibold text-stone-800">
          {formatMonthTitle(viewYear, viewMonth)}
        </div>

        <button
          type="button"
          onClick={goNextMonth}
          disabled={disabled}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="次の月"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {getWeekdayLabels().map((label) => (
          <div
            key={label}
            className="py-1 text-center text-xs font-semibold text-stone-500"
          >
            {label}
          </div>
        ))}

        {calendarCells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="min-h-[52px]" />;
          }

          if (!cell.bookable) {
            return <div key={cell.ymd} className="min-h-[52px]" aria-hidden="true" />;
          }

          const active = value === cell.ymd;

          return (
            <button
              key={cell.ymd}
              type="button"
              onClick={() => !disabled && onChange(cell.ymd)}
              disabled={disabled}
              className={[
                "min-h-[52px] rounded-2xl border px-1 py-2 text-sm transition",
                active
                  ? "border-amber-800 bg-amber-900 text-white"
                  : "border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100",
              ].join(" ")}
            >
              <div className="font-medium">{cell.day}</div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-6 text-stone-500">
        表示されている日のみ予約できます。祝日・定休日（毎月9日・13日）は表示されません。
        {viewMonth === 10 ? " 10月は月曜・水曜のみ受付です。" : ""}
        {" "}受付曜日は月ごとに変更になる場合があります。
      </p>
    </div>
  );
}
