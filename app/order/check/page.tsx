"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatDateLabel, getTodayYmdJst } from "../../../lib/bookingDates";
import { getStoreSlotsForPickupDate } from "../../../lib/storePickupSlots";
import StoreOrderDisclaimer from "../StoreOrderDisclaimer";
import styles from "../order.module.css";

type BookableDate = { ymd: string; label: string };

type StoreReservation = {
  reservationNo?: string;
  name?: string;
  phone?: string;
  date?: string;
  pickupDate?: string;
  time?: string;
  pickupTime?: string;
  status?: string;
  items?: unknown;
  itemsJson?: string;
};

type LineItem = {
  name: string;
  qty: number;
};

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseItems(reservation: StoreReservation): LineItem[] {
  let raw = reservation.items;
  if (!raw && reservation.itemsJson) {
    try {
      raw = JSON.parse(reservation.itemsJson);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const name = String(row.menuName || row.name || "").trim();
      const qty = Math.max(0, Number(row.qty ?? row.quantity ?? 0));
      if (!name || qty <= 0) return null;
      return { name, qty };
    })
    .filter(Boolean) as LineItem[];
}

function reservationDate(reservation: StoreReservation) {
  return String(reservation.pickupDate || reservation.date || "").trim();
}

function reservationTime(reservation: StoreReservation) {
  return String(reservation.pickupTime || reservation.time || "").trim();
}

export default function StoreOrderCheckPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reservation, setReservation] = useState<StoreReservation | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [bookableDates, setBookableDates] = useState<BookableDate[]>([]);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const items = useMemo(
    () => (reservation ? parseItems(reservation) : []),
    [reservation],
  );

  const reservationNo = reservation?.reservationNo || "";
  const isCanceled =
    String(reservation?.status || "").includes("キャンセル") ||
    String(reservation?.status || "").toLowerCase() === "cancelled";

  useEffect(() => {
    if (!editMode) return;
    fetch("/api/store-orders/pickup-slots", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const dates: BookableDate[] = Array.isArray(data.manageBookableDates)
          ? data.manageBookableDates
          : Array.isArray(data.bookableDates)
            ? data.bookableDates
            : [];
        setBookableDates(dates);
        const current = reservation ? reservationDate(reservation) : "";
        const date =
          dates.find((d) => d.ymd === current)?.ymd ||
          dates.find((d) => d.ymd === editDate)?.ymd ||
          data.pickupDate ||
          dates[0]?.ymd ||
          "";
        const todayYmd = getTodayYmdJst();
        const slots = date ? getStoreSlotsForPickupDate(date, todayYmd) : [];
        setEditDate(date);
        setEditSlots(slots);
        const time = reservation ? reservationTime(reservation) : "";
        setEditTime(
          time && slots.includes(time) ? time : slots[0] || time || "",
        );
      })
      .catch(() => setMessage("日時の候補を取得できませんでした。"));
  }, [editMode, reservation]);

  function selectEditDate(ymd: string) {
    const todayYmd = getTodayYmdJst();
    const slots = getStoreSlotsForPickupDate(ymd, todayYmd);
    setEditDate(ymd);
    setEditSlots(slots);
    setEditTime(slots[0] || "");
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setReservation(null);
    setEditMode(false);

    const normalized = normalizePhone(phone);
    if (normalized.length < 10) {
      setMessage("電話番号を入力してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/store-orders/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", phone: normalized }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "予約確認に失敗しました。");
      }
      if (!data.found) {
        setMessage(data.message || "ご予約が見つかりませんでした。");
        return;
      }
      setReservation(data.reservation as StoreReservation);
      setPhone(normalized);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!reservation || !editDate || !editTime) return;
    if (!window.confirm("お受け取り日時を変更しますか？")) return;

    setUpdating(true);
    setMessage("");
    try {
      const res = await fetch("/api/store-orders/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          phone: normalizePhone(phone),
          reservationNo,
          pickupDate: editDate,
          pickupTime: editTime,
          date: editDate,
          time: editTime,
          name: reservation.name || "",
          items: reservation.items,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "変更に失敗しました。");
      }
      setReservation({
        ...reservation,
        pickupDate: editDate,
        date: editDate,
        pickupTime: editTime,
        time: editTime,
        status: "変更済み",
      });
      setEditMode(false);
      setMessage("お受け取り日時を変更しました。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "変更に失敗しました。");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancel() {
    if (!reservation) return;
    if (!window.confirm("このご予約をキャンセルしますか？")) return;

    setCanceling(true);
    setMessage("");
    try {
      const res = await fetch("/api/store-orders/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          phone: normalizePhone(phone),
          reservationNo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "キャンセルに失敗しました。");
      }
      setReservation({ ...reservation, status: "キャンセル" });
      setEditMode(false);
      setMessage("ご予約をキャンセルしました。");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "キャンセルに失敗しました。",
      );
    } finally {
      setCanceling(false);
    }
  }

  const showDate = reservation ? reservationDate(reservation) : "";
  const showTime = reservation ? reservationTime(reservation) : "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>予約確認</h1>
        <p className={styles.sub}>電話番号で店内オーダーのご予約を確認できます</p>
      </header>

      <section className={styles.section}>
        <div className={styles.panel}>
          <form onSubmit={handleSearch}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="check-phone">
                電話番号
              </label>
              <input
                id="check-phone"
                className={styles.input}
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09012345678"
              />
            </div>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={loading}
            >
              {loading ? "検索中…" : "予約を検索"}
            </button>
          </form>

          {message ? (
            <p className={styles.stepNote} style={{ marginTop: 14 }}>
              {message}
            </p>
          ) : null}

          {reservation ? (
            <div style={{ marginTop: 20 }}>
              <p className={styles.label}>受付番号</p>
              <p className={styles.readyTimeValue} style={{ fontSize: 28 }}>
                {reservationNo}
              </p>
              <p className={styles.label} style={{ marginTop: 12 }}>
                {reservation.name} 様
              </p>
              {!editMode ? (
                <>
                  <p className={styles.readyTimeLabel} style={{ marginTop: 16 }}>
                    お受け取り日時
                  </p>
                  {showDate ? (
                    <p className={styles.readyTimeValue} style={{ fontSize: 24 }}>
                      {formatDateLabel(showDate)}
                    </p>
                  ) : null}
                  <p
                    className={styles.readyTimeValue}
                    style={{ fontSize: 32, marginTop: 6 }}
                  >
                    {showTime || "—"}
                  </p>
                  <StoreOrderDisclaimer />
                  <p className={styles.label} style={{ marginTop: 12 }}>
                    ご注文内容
                  </p>
                  {items.map((line) => (
                    <p key={line.name} className={styles.lineItem}>
                      {line.name} × {line.qty}
                    </p>
                  ))}
                  {!isCanceled ? (
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        style={{ flex: 1 }}
                        onClick={() => setEditMode(true)}
                      >
                        変更
                      </button>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.25)",
                        }}
                        disabled={canceling}
                        onClick={handleCancel}
                      >
                        {canceling ? "処理中…" : "キャンセル"}
                      </button>
                    </div>
                  ) : (
                    <p className={styles.stepNote} style={{ marginTop: 12 }}>
                      このご予約はキャンセル済みです。
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className={styles.field} style={{ marginTop: 12 }}>
                    <label className={styles.label} htmlFor="edit-date">
                      お受け取り日
                    </label>
                    <select
                      id="edit-date"
                      className={styles.input}
                      value={editDate}
                      onChange={(e) => selectEditDate(e.target.value)}
                    >
                      {bookableDates.map((d) => (
                        <option key={d.ymd} value={d.ymd}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className={styles.label} style={{ marginTop: 8 }}>
                    お受け取り時間
                  </p>
                  <div className={styles.slotGrid}>
                    {editSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={
                          editTime === time
                            ? `${styles.slotBtn} ${styles.slotBtnActive}`
                            : styles.slotBtn
                        }
                        onClick={() => setEditTime(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.25)",
                      }}
                      onClick={() => setEditMode(false)}
                    >
                      戻る
                    </button>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      style={{ flex: 2 }}
                      disabled={updating || !editDate || !editTime}
                      onClick={handleUpdate}
                    >
                      {updating ? "保存中…" : "変更を保存"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <Link
            href="/order"
            className={styles.primaryBtn}
            style={{
              display: "flex",
              marginTop: 20,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              textDecoration: "none",
            }}
          >
            トップへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
