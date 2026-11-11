"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StoreOrderDisclaimer from "../StoreOrderDisclaimer";
import StoreOrderLastOrderNote from "../StoreOrderLastOrderNote";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import { storeOrderMenuHref } from "../../../lib/storeOrderMenuUrl";
import { normalizeStoreTableId } from "../../../lib/storeOrderTables";
import { persistStoreOrderTableId } from "../../../lib/storeOrderTableSession";
import styles from "../order.module.css";

function CompleteBody() {
  const params = useSearchParams();
  const dineIn = isStoreOrderDineInClient();
  const no = params.get("no") || "";
  const time = params.get("time") || "";
  const tableFromUrl = normalizeStoreTableId(params.get("table"));
  const [menuHref, setMenuHref] = useState("/order/menu");

  useEffect(() => {
    if (tableFromUrl) persistStoreOrderTableId(tableFromUrl);
    setMenuHref(storeOrderMenuHref(tableFromUrl));
  }, [tableFromUrl]);

  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>ご注文を受け付けました</h1>
      {no ? (
        <p className={styles.stepNote} style={{ marginTop: 12 }}>
          受付番号: <strong>{no}</strong>
        </p>
      ) : null}
      {!dineIn && time ? (
        <>
          <p className={styles.readyTimeLabel} style={{ marginTop: 16 }}>
            出来上がり予定時間
          </p>
          <p className={styles.readyTimeValue}>{time}</p>
        </>
      ) : null}
      {dineIn ? <StoreOrderLastOrderNote /> : null}
      <StoreOrderDisclaimer />
      <p className={styles.stepNote}>
        {dineIn
          ? "お席までお持ちします。お会計はレジにてお願いします。"
          : "店頭でお名前をお伝えいただき、お支払いのうえお受け取りください。"}
      </p>
      <Link
        href={menuHref}
        className={styles.primaryBtn}
        style={{ marginTop: 20 }}
      >
        トップに戻る
      </Link>
    </div>
  );
}

export default function StoreOrderCompletePage() {
  return (
    <main className={styles.page}>
      <section className={styles.section}>
        <Suspense fallback={<p className={styles.stepNote}>読み込み中…</p>}>
          <CompleteBody />
        </Suspense>
      </section>
    </main>
  );
}
