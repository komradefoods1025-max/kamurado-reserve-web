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
import styles from "./monthDatePicker.module.css";

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
    <div className={styles.root}>
      <div className={styles.header}>
        <button
          type="button"
          onClick={goPrevMonth}
          disabled={!canGoPrev || disabled}
          className={styles.navBtn}
          aria-label="前の月"
        >
          ◀
        </button>

        <div className={styles.title}>
          {formatMonthTitle(viewYear, viewMonth)}
        </div>

        <button
          type="button"
          onClick={goNextMonth}
          disabled={disabled}
          className={styles.navBtn}
          aria-label="次の月"
        >
          ▶
        </button>
      </div>

      <div className={styles.grid}>
        {getWeekdayLabels().map((label) => (
          <div key={label} className={styles.weekday}>
            {label}
          </div>
        ))}

        {calendarCells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className={styles.cellEmpty} />;
          }

          if (!cell.bookable) {
            return (
              <div key={cell.ymd} className={styles.cellEmpty} aria-hidden="true" />
            );
          }

          const active = value === cell.ymd;

          return (
            <button
              key={cell.ymd}
              type="button"
              onClick={() => !disabled && onChange(cell.ymd)}
              disabled={disabled}
              className={`${styles.dayBtn} ${active ? styles.dayBtnActive : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <p className={styles.note}>
        表示されている日のみ予約できます。祝日・定休日（毎月9日・13日）は表示されません。
        {viewMonth === 10 ? " 10月は月曜・水曜のみ受付です。" : ""}
        {" "}受付曜日は月ごとに変更になる場合があります。
      </p>
    </div>
  );
}
