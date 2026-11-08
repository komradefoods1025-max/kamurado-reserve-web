"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { STORE_ORDER_READY_NOTE } from "../../../lib/storeOrderCopy";
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

type ReadyResponse = {
  ok?: boolean;
  pickupDate?: string;
  pickupTime?: string | null;
  message?: string | null;
  closedToday?: boolean;
};

export default function StoreOrderConfirmReadyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [closed, setClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<StoreCartLine[]>([]);

  useEffect(() => {
    const draft = readStoreOrderDraft();
    if (storeCartQuantity(draft.items) <= 0) {
      router.replace("/order/menu");
      return;
    }
    setCartItems(draft.items);

    let active = true;

    const refresh = () => {
      fetch("/api/store-orders/pickup-slots", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: ReadyResponse) => {
          if (!active) return;
          const time = data.pickupTime ? String(data.pickupTime) : "";
          const date = data.pickupDate || "";
          setPickupDate(date);
          setPickupTime(time);
          setClosed(Boolean(data.closedToday) || !time);
          setClosedMessage(data.message || null);

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
    };

    refresh();
    const timer = window.setInterval(refresh, 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [router]);

  function continueNext() {
    if (!pickupTime || !pickupDate) return;
    router.push("/order/customer");
  }

  return (
    <main className={styles.page}>
      <StoreOrderTestBanner />
      <header className={styles.header}>
        <h1 className={styles.title}>注文確認</h1>
        <p className={styles.sub}>{STORE_ORDER_READY_NOTE}</p>
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
              <p className={styles.readyTimeLabel}>
                ただいまの出来上がり予定時間
              </p>
              <p className={styles.readyTimeValue}>{pickupTime}</p>
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
