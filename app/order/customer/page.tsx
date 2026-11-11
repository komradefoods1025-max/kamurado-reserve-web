"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { formatStoreEarliestReadyWithSeconds } from "../../../lib/storePickupSlots";
import { STORE_ORDER_BUSY_DISCLAIMER } from "../../../lib/storeOrderCopy";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import {
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
} from "../../../lib/storeOrderDraft";
import styles from "../order.module.css";

type SlotsResponse = {
  ok?: boolean;
  pickupDate?: string;
  pickupTime?: string;
  slots?: string[];
  closedToday?: boolean;
  message?: string | null;
};

function pickTime(slots: string[], preferred: string, fallback: string) {
  if (preferred && slots.includes(preferred)) return preferred;
  if (fallback && slots.includes(fallback)) return fallback;
  return slots[0] || "";
}

export default function StoreOrderCustomerPage() {
  const router = useRouter();
  const dineIn = isStoreOrderDineInClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seatLabel, setSeatLabel] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [readyClock, setReadyClock] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  useEffect(() => {
    const draft = readStoreOrderDraft();
    if (storeCartQuantity(draft.items) <= 0) {
      router.replace("/order/menu");
      return;
    }
    setName(draft.customerName || "");
    setPhone(draft.phone || "");
    setSeatLabel(draft.seatLabel || "");
    setNote(draft.note || "");

    if (!dineIn && !draft.pickupTime) {
      router.replace("/order/pickup");
      return;
    }

    let active = true;
    fetch("/api/store-orders/pickup-slots", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SlotsResponse) => {
        if (!active) return;
        const slots = Array.isArray(data.slots) ? data.slots.map(String) : [];
        const date = data.pickupDate || "";
        const time = pickTime(
          slots,
          draft.pickupTime || "",
          data.pickupTime ? String(data.pickupTime) : "",
        );
        const isClosed = Boolean(data.closedToday) || !time;
        setClosed(isClosed);
        setClosedMessage(data.message || null);
        setPickupTime(time);
        if (time && date) {
          writeStoreOrderDraft({
            ...readStoreOrderDraft(),
            pickupDate: date,
            pickupTime: time,
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router, dineIn]);

  useEffect(() => {
    if (!dineIn || closed) return;
    const tick = () => setReadyClock(formatStoreEarliestReadyWithSeconds());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [dineIn, closed]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const digits = phone.replace(/[^\d]/g, "");
    if (!trimmedName || digits.length < 10) return;

    const draft = readStoreOrderDraft();
    if (!draft.pickupTime) return;

    writeStoreOrderDraft({
      ...draft,
      customerName: trimmedName,
      phone: digits,
      seatLabel: seatLabel.trim(),
      note: note.trim(),
    });
    router.push("/order/confirm");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>お客様情報</h1>
        <p className={styles.sub}>
          {dineIn
            ? "店内でお召し上がりのご注文です"
            : "お名前とお電話番号をご入力ください"}
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.panel}>
          {loading ? (
            <p className={styles.stepNote}>読み込み中…</p>
          ) : closed ? (
            <p className={styles.stepNote}>
              {closedMessage ||
                "現在、ご注文をお受けできない時間帯です。"}
            </p>
          ) : (
            <>
              {dineIn ? (
                <>
                  <p className={styles.readyTimeLabel}>お料理の目安</p>
                  <p
                    className={`${styles.readyTimeValue} ${styles.readyTimeValueSeconds}`}
                  >
                    {readyClock || pickupTime || "—"}
                  </p>
                  <p className={styles.stepNote} style={{ marginTop: 8 }}>
                    キッチンには {pickupTime || "—"} 頃までにお持ちします。
                  </p>
                </>
              ) : null}
              <p className={styles.stepNote}>{STORE_ORDER_BUSY_DISCLAIMER}</p>
            </>
          )}
        </div>

        {!closed && !loading ? (
          <form className={styles.panel} onSubmit={onSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="store-name">
                お名前
              </label>
              <input
                id="store-name"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="store-phone">
                電話番号
              </label>
              <input
                id="store-phone"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>
            {dineIn ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="store-seat">
                  席番号（任意）
                </label>
                <input
                  id="store-seat"
                  className={styles.input}
                  value={seatLabel}
                  onChange={(e) => setSeatLabel(e.target.value)}
                  inputMode="text"
                  placeholder="例: 12番"
                />
              </div>
            ) : null}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="store-note">
                ご要望（任意）
              </label>
              <input
                id="store-note"
                className={styles.input}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <p className={styles.stepNote}>
              {dineIn
                ? "お会計はレジにてお願いします。"
                : "お支払いは店頭受け取り時となります。"}
            </p>
            <button type="submit" className={styles.primaryBtn}>
              内容確認へ
            </button>
          </form>
        ) : null}
      </section>

      <button
        type="button"
        onClick={() => router.push("/order/menu")}
        className={styles.stepNote}
        style={{
          display: "block",
          margin: "0 auto",
          background: "none",
          border: "none",
          color: "#c4b8a8",
          textDecoration: "underline",
        }}
      >
        注文内容を変更
      </button>
    </main>
  );
}
