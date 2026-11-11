"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  normalizeStoreTableId,
  storeTableLabel,
} from "../../../../lib/storeOrderTables";
import {
  readStoreOrderDraft,
  writeStoreOrderDraft,
} from "../../../../lib/storeOrderDraft";
import { persistStoreOrderTableId } from "../../../../lib/storeOrderTableSession";
import styles from "../../order.module.css";

export default function StoreOrderTableEntryPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const tableId = normalizeStoreTableId(params.table);
    if (!tableId) {
      router.replace("/order");
      return;
    }
    persistStoreOrderTableId(tableId);
    writeStoreOrderDraft({
      ...readStoreOrderDraft(),
      tableId,
      seatLabel: storeTableLabel(tableId),
    });
    router.replace("/order/menu");
  }, [params.table, router]);

  return (
    <main className={styles.page}>
      <p className={styles.stepNote}>席情報を読み込み中…</p>
    </main>
  );
}
