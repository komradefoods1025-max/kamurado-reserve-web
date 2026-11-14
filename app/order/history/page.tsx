"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import {
  normalizeStoreTableId,
  storeTableLabel,
} from "../../../lib/storeOrderTables";
import {
  persistStoreOrderTableId,
  readStoreOrderTableSession,
} from "../../../lib/storeOrderTableSession";
import { storeOrderMenuHref } from "../../../lib/storeOrderMenuUrl";
import { appendStoreReorderToDraft } from "../../../lib/storeOrderReorder";
import StoreOrderLastOrderNote from "../StoreOrderLastOrderNote";
import StoreOrderTestBanner from "../StoreOrderTestBanner";
import styles from "../order.module.css";

type HistoryItem = {
  label: string;
  qty: number;
  subtotal: number;
  menuKey?: string;
  dressing?: string;
};

type HistoryOrder = {
  reservationNo: string;
  submittedAt: string;
  status: string;
  total: number;
  items: HistoryItem[];
};

type TableBillResponse = {
  ok?: boolean;
  configured?: boolean;
  seatLabel?: string;
  history?: HistoryOrder[];
  message?: string;
};

function formatOrderTime(iso: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "—";
  return new Date(at).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryBody() {
  const searchParams = useSearchParams();
  const dineIn = isStoreOrderDineInClient();
  const [tableId, setTableId] = useState<string | null>(null);
  const [seatLabel, setSeatLabel] = useState("");
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [reorderHint, setReorderHint] = useState("");

  useEffect(() => {
    const fromUrl = normalizeStoreTableId(searchParams.get("table"));
    const id = fromUrl || readStoreOrderTableSession();
    if (fromUrl) persistStoreOrderTableId(fromUrl);
    setTableId(id);
    setSeatLabel(id ? storeTableLabel(id) : "");
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!tableId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/store-orders/table-bill?table=${encodeURIComponent(tableId)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as TableBillResponse;
      if (data.ok) {
        setConfigured(data.configured !== false);
        setHistory(Array.isArray(data.history) ? data.history : []);
        if (data.seatLabel) setSeatLabel(data.seatLabel);
      }
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    setLoading(true);
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  function reorderItem(item: HistoryItem) {
    const key = String(item.menuKey || "").trim();
    if (!key) return;
    if (appendStoreReorderToDraft(key, item.dressing, 1)) {
      setReorderHint(`「${item.label}」をカートに追加しました`);
      window.setTimeout(() => setReorderHint(""), 2500);
    }
  }

  if (!dineIn) {
    return (
      <p className={styles.stepNote}>
        注文履歴は店内オーダー専用です。
        <Link href="/order" className={styles.textLink}>
          トップへ
        </Link>
      </p>
    );
  }

  if (!tableId) {
    return (
      <p className={styles.stepNote}>
        卓番が取得できません。QRから再度お入りください。
        <Link href="/order/seats" className={styles.textLink}>
          席を選ぶ
        </Link>
      </p>
    );
  }

  return (
    <>
      <StoreOrderLastOrderNote />
      {reorderHint ? (
        <p className={styles.reorderHint}>{reorderHint}</p>
      ) : null}
      {!configured ? (
        <p className={styles.categoryNote}>
          注文履歴を表示できません（店舗側の設定をご確認ください）。
        </p>
      ) : null}
      {loading && history.length === 0 ? (
        <p className={styles.stepNote}>読み込み中…</p>
      ) : null}
      {!loading && history.length === 0 ? (
        <p className={styles.stepNote}>
          まだご注文はありません。
          <Link href={storeOrderMenuHref(tableId)} className={styles.textLink}>
            メニューから注文
          </Link>
        </p>
      ) : null}
      <div className={styles.orderHistoryList}>
        {history.map((order) => (
          <section key={order.reservationNo} className={styles.orderHistoryBlock}>
            <header className={styles.orderHistoryHead}>
              <time className={styles.orderHistoryTime}>
                {formatOrderTime(order.submittedAt)}
              </time>
              {seatLabel ? (
                <span className={styles.orderHistorySeat}>{seatLabel}</span>
              ) : null}
            </header>
            <ul className={styles.orderHistoryItems}>
              {order.items.map((item) => (
                <li key={`${order.reservationNo}-${item.label}`}>
                  <div className={styles.orderHistoryItemMain}>
                    <span className={styles.orderHistoryItemName}>{item.label}</span>
                    <span className={styles.orderHistoryItemQty}>{item.qty}</span>
                  </div>
                  {item.menuKey ? (
                    <button
                      type="button"
                      className={styles.reorderBtn}
                      onClick={() => reorderItem(item)}
                    >
                      おかわり
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

export default function StoreOrderHistoryPage() {
  return (
    <main className={`${styles.page} ${styles.orderSubPage}`}>
      <StoreOrderTestBanner />
      <header className={styles.menuTopBar}>
        <h1 className={styles.menuTopTitle}>注文履歴</h1>
      </header>
      <section className={styles.section}>
        <Suspense fallback={<p className={styles.stepNote}>読み込み中…</p>}>
          <HistoryBody />
        </Suspense>
      </section>
    </main>
  );
}