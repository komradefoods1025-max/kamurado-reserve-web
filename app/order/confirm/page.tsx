"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StoreOrderCartSummary from "../StoreOrderCartSummary";
import StoreOrderDisclaimer from "../StoreOrderDisclaimer";
import {
  clearStoreOrderDraft,
  readStoreOrderDraft,
  storeCartQuantity,
} from "../../../lib/storeOrderDraft";
import styles from "../order.module.css";

type SubmitResponse = {
  ok?: boolean;
  reservationNo?: string;
  message?: string;
};

export default function StoreOrderConfirmPage() {
  const router = useRouter();
  const [draft, setDraft] = useState(readStoreOrderDraft());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = async () => {
      const current = readStoreOrderDraft();
      if (
        storeCartQuantity(current.items) <= 0 ||
        !current.customerName ||
        !current.phone
      ) {
        router.replace("/order/menu");
        return;
      }

      try {
        const res = await fetch("/api/store-orders/pickup-slots", {
          cache: "no-store",
        });
        const data = await res.json();
        const slots: string[] = Array.isArray(data.slots)
          ? data.slots.map(String)
          : [];
        if (data.pickupDate && (slots.length || data.pickupTime)) {
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
            pickupDate: String(data.pickupDate),
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
  }, [router]);

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
          })),
          pickupDate: draft.pickupDate,
          pickupTime: draft.pickupTime,
          name: draft.customerName,
          phone: draft.phone,
          note: draft.note,
        }),
      });

      const data = (await res.json()) as SubmitResponse;
      if (!res.ok || !data.ok) {
        setError(data.message || "送信に失敗しました");
        return;
      }

      const no = data.reservationNo || "";
      clearStoreOrderDraft();
      router.replace(
        `/order/complete?no=${encodeURIComponent(no)}&time=${encodeURIComponent(draft.pickupTime || "")}`,
      );
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ご注文内容の確認</h1>
      </header>

      <section className={styles.section}>
        <div className={styles.panel}>
          <p className={styles.readyTimeLabel} style={{ marginTop: 4 }}>
            お受け取り時間
          </p>
          <p className={styles.readyTimeValue}>{draft.pickupTime || "—"}</p>
          <StoreOrderDisclaimer />
          <p className={styles.label} style={{ marginTop: 8 }}>
            {draft.customerName} 様 / {draft.phone}
          </p>

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
            disabled={submitting}
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
