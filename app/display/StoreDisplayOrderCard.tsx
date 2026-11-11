"use client";

import type { StoreDisplayOrder } from "../../lib/storeDisplayQueue";
import {
  resolveStoreOrderTableId,
  storeTableLabel,
} from "../../lib/storeOrderTables";
import styles from "./display.module.css";

const KITCHEN_FLOW: StoreDisplayOrder["status"][] = [
  "受付済み",
  "調理中",
  "完成",
];

function itemLabel(item: StoreDisplayOrder["items"][number]) {
  const name = String(item.menuName || item.name || "").trim();
  const dressing = item.dressing ? `（${item.dressing}）` : "";
  return `${name}${dressing}`;
}

function itemQty(item: StoreDisplayOrder["items"][number]) {
  return Math.max(0, Number(item.qty ?? item.quantity ?? 0));
}

export default function StoreDisplayOrderCard({
  order,
  mode,
  onSetStatus,
}: {
  order: StoreDisplayOrder;
  mode: "kitchen" | "counter";
  onSetStatus: (
    reservationNo: string,
    status: StoreDisplayOrder["status"],
  ) => void;
}) {
  const isNew = order.status === "受付済み";
  const resolvedTableId = resolveStoreOrderTableId(order);
  const seatText =
    order.seatLabel ||
    (resolvedTableId ? storeTableLabel(resolvedTableId) : "");

  return (
    <article
      className={isNew ? `${styles.card} ${styles.cardNew}` : styles.card}
    >
      {seatText ? (
        <p className={styles.cardTableBadge}>{seatText}</p>
      ) : null}
      <div className={styles.cardHead}>
        <span className={styles.cardNo}>{order.reservationNo}</span>
        <span className={styles.statusTag}>{order.status}</span>
        <span className={styles.cardTime}>
          {order.pickupTime ? `受付 ${order.pickupTime}` : "店内"}
        </span>
      </div>
      <h2 className={styles.cardName}>{order.name} 様</h2>
      <div className={styles.itemList}>
        {order.items.map((item, idx) => (
          <div
            key={`${order.reservationNo}-${idx}`}
            className={
              mode === "kitchen"
                ? `${styles.itemRow} ${styles.itemRowKitchen}`
                : styles.itemRow
            }
          >
            <span>{itemLabel(item)}</span>
            <span className={styles.itemQty}>×{itemQty(item)}</span>
          </div>
        ))}
      </div>
      {mode === "counter" ? (
        <p className={styles.headerMeta} style={{ marginTop: 8 }}>
          合計 ¥{order.total.toLocaleString("ja-JP")}（{order.totalQty}
          点）・レジ精算
        </p>
      ) : null}
      <div className={styles.actions}>
        {mode === "kitchen"
          ? KITCHEN_FLOW.map((st) => (
              <button
                key={st}
                type="button"
                className={
                  order.status === st
                    ? `${styles.actBtn} ${styles.actBtnActive}`
                    : styles.actBtn
                }
                onClick={() => onSetStatus(order.reservationNo, st)}
              >
                {st}
              </button>
            ))
          : (
            <>
              <button
                type="button"
                className={
                  order.status === "提供済み"
                    ? `${styles.actBtn} ${styles.actBtnActive}`
                    : styles.actBtn
                }
                onClick={() => onSetStatus(order.reservationNo, "提供済み")}
              >
                提供済み
              </button>
              {order.status !== "完成" ? (
                <button
                  type="button"
                  className={styles.actBtn}
                  onClick={() => onSetStatus(order.reservationNo, "完成")}
                >
                  完成に戻す
                </button>
              ) : null}
            </>
          )}
      </div>
    </article>
  );
}
