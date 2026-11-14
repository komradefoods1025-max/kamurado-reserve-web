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
import StoreOrderLastOrderNote from "../StoreOrderLastOrderNote";
import StoreOrderTestBanner from "../StoreOrderTestBanner";
import styles from "../order.module.css";

type BillLine = {
  label: string;
  qty: number;
  subtotal: number;
};

type TableBillResponse = {
  ok?: boolean;
  configured?: boolean;
  seatLabel?: string;
  billLines?: BillLine[];
  billTotal?: number;
};

function formatYen(n: number): string {
  return `¥${Math.max(0, n).toLocaleString("ja-JP")}`;
}

function BillBody() {
  const searchParams = useSearchParams();
  const dineIn = isStoreOrderDineInClient();
  const [tableId, setTableId] = useState<string | null>(null);
  const [seatLabel, setSeatLabel] = useState("");
  const [lines, setLines] = useState<BillLine[]>([]);
  const [billTotal, setBillTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const fromUrl = normalizeStoreTableId(searchParams.get("table"));
    if (fromUrl) persistStoreOrderTableId(fromUrl);
    const id = fromUrl || readStoreOrderTableSession();
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
        setLines(Array.isArray(data.billLines) ? data.billLines : []);
        setBillTotal(Number(data.billTotal) || 0);
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

  if (!dineIn) {
    return (
      <p className={styles.stepNote}>
        会計確認は店内オーダー専用です。
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
      </p>
    );
  }

  return (
    <>
      <StoreOrderLastOrderNote />
      {seatLabel ? (
        <p className={styles.billSeatNote}>{seatLabel}</p>
      ) : null}
      {!configured ? (
        <p className={styles.categoryNote}>
          会計内容を表示できません（店舗側の設定をご確認ください）。
        </p>
      ) : null}
      <div className={styles.billHero}>
        <p className={styles.billHeroLabel}>ご請求額（税込）</p>
        <p className={styles.billHeroAmount}>
          {loading ? "—" : formatYen(billTotal)}
        </p>
      </div>
      <div className={styles.billSummaryBox}>
        <div className={styles.billSummaryRow}>
          <span>小計</span>
          <span>{loading ? "—" : formatYen(billTotal)}</span>
        </div>
        <div className={styles.billSummaryRow}>
          <span>合計</span>
          <strong>{loading ? "—" : formatYen(billTotal)}</strong>
        </div>
      </div>
      <div className={styles.billTableWrap}>
        <p className={styles.billTableCaption}>ご注文の内訳</p>
        <table className={styles.billTable}>
          <thead>
            <tr>
              <th>商品名</th>
              <th>数</th>
              <th>金額</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.label}>
                <td>{line.label}</td>
                <td className={styles.billTableNum}>{line.qty}</td>
                <td className={styles.billTableNum}>
                  {formatYen(line.subtotal)}
                </td>
              </tr>
            ))}
            {!loading && lines.length === 0 ? (
              <tr>
                <td colSpan={3} className={styles.billTableEmpty}>
                  未清算のご注文はありません。
                  <Link
                    href={storeOrderMenuHref(tableId)}
                    className={styles.textLink}
                  >
                    メニューへ
                  </Link>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className={styles.billPayNote}>
        お会計はレジにて承ります。画面上の金額は参考表示です。
      </p>
    </>
  );
}

export default function StoreOrderBillPage() {
  return (
    <main className={`${styles.page} ${styles.orderSubPage}`}>
      <StoreOrderTestBanner />
      <header className={styles.menuTopBar}>
        <h1 className={styles.menuTopTitle}>会計確認</h1>
      </header>
      <section className={styles.section}>
        <Suspense fallback={<p className={styles.stepNote}>読み込み中…</p>}>
          <BillBody />
        </Suspense>
      </section>
    </main>
  );
}