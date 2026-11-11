"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StoreOrderCartSummary from "../StoreOrderCartSummary";
import StoreOrderDisclaimer from "../StoreOrderDisclaimer";
import StoreOrderLastOrderNote from "../StoreOrderLastOrderNote";
import StoreOrderTestBanner from "../StoreOrderTestBanner";
import { formatDateLabel } from "../../../lib/bookingDates";
import {
  clearStoreOrderDraft,
  readStoreOrderDraft,
  storeCartQuantity,
} from "../../../lib/storeOrderDraft";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import styles from "../order.module.css";

type SubmitResponse = {
  ok?: boolean;
  reservationNo?: string;
  message?: string;
};

export default function StoreOrderConfirmPage() {
  const router = useRouter();
  const dineIn = isStoreOrderDineInClient();
  const [draft, setDraft] = useState(readStoreOrderDraft());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = async () => {
      const current = readStoreOrderDraft();
      if (storeCartQuantity(current.items) <= 0) {
        router.replace("/order/menu");
        return;
      }

      if (dineIn) {
        try {
          const res = await fetch("/api/store-orders/pickup-slots", {
            cache: "no-store",
          });
          const data = await res.json();
          if (data.dineIn) {
            const isClosed =
              Boolean(data.closedToday) || data.orderingOpen === false;
            setClosed(isClosed);
            setClosedMessage(data.message || null);
          }
        } catch {
          /* 送信時に再チェック */
        }
        setDraft(current);
        return;
      }

      if (!current.customerName || !current.phone) {
        router.replace("/order/customer");
        return;
      }

      try {
        const dateQs = current.pickupDate
          ? `?date=${encodeURIComponent(current.pickupDate)}`
          : "";
        const res = await fetch(`/api/store-orders/pickup-slots${dateQs}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const slots: string[] = Array.isArray(data.slots)
          ? data.slots.map(String)
          : [];
        const bookable: string[] = Array.isArray(data.bookableDates)
          ? data.bookableDates.map((d: { ymd: string }) => d.ymd)
          : [];
        const keepDate =
          current.pickupDate &&
          (bookable.includes(current.pickupDate) ||
            data.bookingMode !== "advance")
            ? current.pickupDate
            : data.pickupDate
              ? String(data.pickupDate)
              : current.pickupDate;
        if (keepDate && (slots.length || data.pickupTime)) {
          const preferred = current.pickupTime || "";
          const fallback = data.pickupTime ? String(data.pickupTime) : "";
          const pickupTime =
            preferred && slots.includes(preferred)
              ? preferred
              : fallback && slots.includes(fallback)
                ? fallback
                : slots[0] || fallback;
          const next = {
            ...current,
            pickupDate: keepDate,
            pickupTime,
          };
          setDraft(next);
          return;
        }
      } catch {
        /* draft の時刻をそのまま使う */
      }
      setDraft(current);
    };
    void sync();
  }, [router, dineIn]);

  async function submitOrder() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/store-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draft.items.map((item) => ({
            id: item.id,
            menuKey: item.id,
            name: item.name,
            menuName: item.name,
            price: item.price ?? 0,
            quantity: item.quantity,
            dressing: item.dressing || "",
          })),
          pickupDate: draft.pickupDate,
          pickupTime: draft.pickupTime,
          ...(dineIn
            ? {}
            : {
                seatLabel: draft.seatLabel,
                name: draft.customerName,
                phone: draft.phone,
                note: draft.note,
              }),
        }),
      });

      const data = (await res.json()) as SubmitResponse;
      if (!res.ok || !data.ok) {
        setError(data.message || "送信に失敗しました");
        return;
      }

      const no = data.reservationNo || "";
      clearStoreOrderDraft();
      const completeQs = dineIn
        ? `?no=${encodeURIComponent(no)}`
        : `?no=${encodeURIComponent(no)}&time=${encodeURIComponent(draft.pickupTime || "")}`;
      router.replace(`/order/complete${completeQs}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const pickupDateLabel = draft.pickupDate
    ? formatDateLabel(draft.pickupDate)
    : null;

  return (
    <main className={styles.page}>
      <StoreOrderTestBanner />
      <header className={styles.header}>
        <h1 className={styles.title}>ご注文内容の確認</h1>
      </header>

      <section className={styles.section}>
        {dineIn ? <StoreOrderLastOrderNote /> : null}
        <div className={styles.panel}>
          {!dineIn ? (
            <>
              <p className={styles.readyTimeLabel} style={{ marginTop: 4 }}>
                お受け取り日時
              </p>
              {pickupDateLabel ? (
                <p
                  className={styles.readyTimeValue}
                  style={{ fontSize: 26, marginTop: 4 }}
                >
                  {pickupDateLabel}
                </p>
              ) : null}
              <p
                className={styles.readyTimeValue}
                style={
                  pickupDateLabel ? { fontSize: 34, marginTop: 6 } : undefined
                }
              >
                {draft.pickupTime || "—"}
              </p>
            </>
          ) : (
            <p className={styles.stepNote} style={{ marginTop: 4 }}>
              ご注文後、お席へお持ちします。
            </p>
          )}
          <StoreOrderDisclaimer />
          {!dineIn ? (
            <p className={styles.label} style={{ marginTop: 8 }}>
              {draft.customerName} 様 / {draft.phone}
              {draft.seatLabel ? ` / 席:${draft.seatLabel}` : ""}
            </p>
          ) : null}
          {dineIn && closed ? (
            <p className={styles.stepNote} style={{ color: "#f5a5a5" }}>
              {closedMessage ||
                "現在、ご注文をお受けできない時間帯です。"}
            </p>
          ) : null}

          <StoreOrderCartSummary items={draft.items} />

          {error ? (
            <p className={styles.stepNote} style={{ color: "#f5a5a5" }}>
              {error}
            </p>
          ) : null}

          <button
            type="button"
            className={styles.primaryBtn}
            style={{ marginTop: 16 }}
            disabled={submitting || (dineIn && closed)}
            onClick={submitOrder}
          >
            {submitting ? "送信中…" : "注文を確定する"}
          </button>

          <Link
            href="/order/menu"
            className={styles.primaryBtn}
            style={{
              marginTop: 12,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              textDecoration: "none",
            }}
          >
            カートへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
