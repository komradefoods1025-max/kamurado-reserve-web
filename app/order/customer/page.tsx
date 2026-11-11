"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { STORE_ORDER_BUSY_DISCLAIMER } from "../../../lib/storeOrderCopy";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import {
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
} from "../../../lib/storeOrderDraft";
import StoreOrderLastOrderNote from "../StoreOrderLastOrderNote";
import styles from "../order.module.css";

type StatusResponse = {
  ok?: boolean;
  dineIn?: boolean;
  orderingOpen?: boolean;
  closedToday?: boolean;
  message?: string | null;
};

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
      .then((data: StatusResponse) => {
        if (!active) return;
        if (data.dineIn) {
          const isClosed = Boolean(data.closedToday) || data.orderingOpen === false;
          setClosed(isClosed);
          setClosedMessage(data.message || null);
          if (!isClosed) {
            writeStoreOrderDraft({
              ...readStoreOrderDraft(),
              pickupDate: "",
              pickupTime: "",
            });
          }
          return;
        }
        setClosed(Boolean(data.closedToday));
        setClosedMessage(data.message || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router, dineIn]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const digits = phone.replace(/[^\d]/g, "");
    if (!trimmedName || digits.length < 10) return;

    const draft = readStoreOrderDraft();
    writeStoreOrderDraft({
      ...draft,
      customerName: trimmedName,
      phone: digits,
      seatLabel: seatLabel.trim(),
      note: note.trim(),
      pickupDate: dineIn ? "" : draft.pickupDate,
      pickupTime: dineIn ? "" : draft.pickupTime,
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
        {dineIn ? <StoreOrderLastOrderNote /> : null}

        <div className={styles.panel}>
          {loading ? (
            <p className={styles.stepNote}>読み込み中…</p>
          ) : closed ? (
            <p className={styles.stepNote}>
              {closedMessage ||
                "現在、ご注文をお受けできない時間帯です。"}
            </p>
          ) : dineIn ? (
            <p className={styles.stepNote}>
              ご注文はキッチンへそのまま届きます。お会計はレジにてお願いします。
            </p>
          ) : null}
          {!closed && !loading ? (
            <p className={styles.stepNote}>{STORE_ORDER_BUSY_DISCLAIMER}</p>
          ) : null}
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
