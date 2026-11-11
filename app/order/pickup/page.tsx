"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import { getTodayYmdJst } from "../../../lib/bookingDates";
import {
  formatStoreEarliestReadyWithSeconds,
  getStoreSlotsForPickupDate,
} from "../../../lib/storePickupSlots";
import {
  STORE_ORDER_READY_NOTE_DINE_IN,
  STORE_ORDER_READY_NOTE_PICKUP,
} from "../../../lib/storeOrderCopy";
import {
  STORE_ORDER_FUTURE_PICKUP_HOURS,
  STORE_ORDER_HOURS,
} from "../../../lib/storeOrderConfig";
import StoreOrderCartSummary from "../StoreOrderCartSummary";
import StoreOrderDisclaimer from "../StoreOrderDisclaimer";
import StoreOrderTestBanner from "../StoreOrderTestBanner";
import {
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
  type StoreCartLine,
} from "../../../lib/storeOrderDraft";
import styles from "../order.module.css";

type BookableDate = { ymd: string; label: string };

type ReadyResponse = {
  ok?: boolean;
  pickupDate?: string;
  pickupDateLabel?: string | null;
  bookingMode?: "today" | "advance";
  bookableDates?: BookableDate[];
  earliestReadyTime?: string | null;
  pickupTime?: string | null;
  slots?: string[];
  message?: string | null;
  closedToday?: boolean;
};

function pickValidTime(
  slots: string[],
  preferred: string,
  fallback: string,
): string {
  if (preferred && slots.includes(preferred)) return preferred;
  if (fallback && slots.includes(fallback)) return fallback;
  return slots[0] || "";
}

export default function StoreOrderConfirmReadyPage() {
  const router = useRouter();
  const dineIn = isStoreOrderDineInClient();
  const [loading, setLoading] = useState(true);
  const [pickupDate, setPickupDate] = useState("");
  const [earliestReadyTime, setEarliestReadyTime] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<StoreCartLine[]>([]);
  const [bookingMode, setBookingMode] = useState<"today" | "advance">("today");
  const [bookableDates, setBookableDates] = useState<BookableDate[]>([]);

  useEffect(() => {
    if (dineIn) {
      router.replace("/order/customer");
      return;
    }
    const draft = readStoreOrderDraft();
    if (storeCartQuantity(draft.items) <= 0) {
      router.replace("/order/menu");
      return;
    }
    setCartItems(draft.items);

    let active = true;

    const refresh = (dateQuery?: string) => {
      const qs = dateQuery ? `?date=${encodeURIComponent(dateQuery)}` : "";
      fetch(`/api/store-orders/pickup-slots${qs}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data: ReadyResponse) => {
          if (!active) return;
          const list = Array.isArray(data.slots)
            ? data.slots.map(String)
            : data.pickupTime
              ? [String(data.pickupTime)]
              : [];
          const dates = Array.isArray(data.bookableDates)
            ? data.bookableDates
            : [];
          const mode = data.bookingMode === "advance" ? "advance" : "today";
          const draftState = readStoreOrderDraft();
          let date = data.pickupDate || "";

          if (mode === "advance" && dates.length) {
            const draftDateValid = dates.some((d) => d.ymd === draftState.pickupDate);
            if (draftDateValid && draftState.pickupDate) {
              date = draftState.pickupDate;
            } else if (!dates.some((d) => d.ymd === date)) {
              date = dates[0]?.ymd || date;
            }
          }

          const defaultTime = data.pickupTime ? String(data.pickupTime) : "";
          const current =
            draftState.pickupDate === date && draftState.pickupTime
              ? draftState.pickupTime
              : pickupTime;
          const chosen = pickValidTime(list, current, defaultTime);

          setPickupDate(date);
          setPickupTime(chosen);
          setSlots(list);
          setBookingMode(mode);
          setBookableDates(dates);
          setClosed(Boolean(data.closedToday) || list.length === 0);
          setClosedMessage(data.message || null);

          if (chosen && date) {
            writeStoreOrderDraft({
              ...readStoreOrderDraft(),
              pickupDate: date,
              pickupTime: chosen,
            });
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    refresh(readStoreOrderDraft().pickupDate || undefined);
    const timer = window.setInterval(
      () => refresh(pickupDate || undefined),
      30_000,
    );

    return () => {
      active = false;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, dineIn]);

  useEffect(() => {
    if (closed || bookingMode !== "today") return;
    const tick = () =>
      setEarliestReadyTime(formatStoreEarliestReadyWithSeconds());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [closed, bookingMode]);

  const earliestReadyHm = earliestReadyTime.slice(0, 5);

  function selectTime(time: string) {
    setPickupTime(time);
    writeStoreOrderDraft({
      ...readStoreOrderDraft(),
      pickupDate,
      pickupTime: time,
    });
  }

  function selectPickupDate(ymd: string) {
    const todayYmd = getTodayYmdJst();
    const newSlots = getStoreSlotsForPickupDate(ymd, todayYmd);
    const draft = readStoreOrderDraft();
    const nextTime = pickValidTime(
      newSlots,
      draft.pickupDate === ymd ? draft.pickupTime || "" : "",
      newSlots[0] || "",
    );
    setPickupDate(ymd);
    setSlots(newSlots);
    setPickupTime(nextTime);
    writeStoreOrderDraft({
      ...draft,
      pickupDate: ymd,
      pickupTime: nextTime,
    });
  }

  function continueNext() {
    if (!pickupTime || !pickupDate) return;
    router.push("/order/customer");
  }

  return (
    <main className={styles.page}>
      <StoreOrderTestBanner />
      <header className={styles.header}>
        <h1 className={styles.title}>注文確認</h1>
        <p className={styles.sub}>
          {dineIn ? STORE_ORDER_READY_NOTE_DINE_IN : STORE_ORDER_READY_NOTE_PICKUP}
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.panel}>
          {loading ? (
            <p className={styles.stepNote}>読み込み中…</p>
          ) : closed ? (
            <p className={styles.stepNote}>
              {closedMessage ||
                "現在、ご注文をお受けできる時間帯がありません。"}
            </p>
          ) : (
            <>
              {closedMessage ? (
                <p className={styles.stepNote}>{closedMessage}</p>
              ) : null}

              {bookingMode === "advance" ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="store-pickup-date">
                    お受け取り日
                  </label>
                  <select
                    id="store-pickup-date"
                    className={styles.input}
                    value={pickupDate}
                    onChange={(e) => selectPickupDate(e.target.value)}
                  >
                    {bookableDates.map((d) => (
                      <option key={d.ymd} value={d.ymd}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <p className={styles.readyTimeLabel}>
                    ただいまの出来上がり予定時間
                  </p>
                  <p
                    className={`${styles.readyTimeValue} ${styles.readyTimeValueSeconds}`}
                  >
                    {earliestReadyTime}
                  </p>
                </>
              )}

              <p className={styles.label} style={{ marginTop: 20 }}>
                {bookingMode === "advance"
                  ? (() => {
                      const w =
                        pickupDate === getTodayYmdJst()
                          ? STORE_ORDER_HOURS[0]
                          : STORE_ORDER_FUTURE_PICKUP_HOURS[0];
                      return `お受け取り希望時間（${w?.start ?? "17:00"}〜${w?.end ?? "21:30"}・10分刻み）`;
                    })()
                  : `お受け取り希望時間（${earliestReadyHm || "—"} 以降・10分刻み）`}
              </p>
              <div
                className={styles.slotGrid}
                role="listbox"
                aria-label="お受け取り時間"
              >
                {slots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    role="option"
                    aria-selected={pickupTime === time}
                    className={
                      pickupTime === time
                        ? `${styles.slotBtn} ${styles.slotBtnActive}`
                        : styles.slotBtn
                    }
                    onClick={() => selectTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <StoreOrderDisclaimer />
              <StoreOrderCartSummary items={cartItems} />
            </>
          )}
        </div>
      </section>

      <div className={styles.footerBar}>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/order/menu"
            className={styles.primaryBtn}
            style={{
              flex: 1,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            戻る
          </Link>
          <button
            type="button"
            className={styles.primaryBtn}
            style={{ flex: 2 }}
            disabled={!pickupTime || closed}
            onClick={continueNext}
          >
            お客様情報へ
          </button>
        </div>
      </div>
    </main>
  );
}
