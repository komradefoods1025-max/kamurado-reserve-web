import Image from "next/image";
import {
  STORE_MENU_ITEMS,
  formatStoreOrderCartTotal,
  formatStoreOrderLineTotal,
  formatStoreOrderUnitPrice,
} from "../../lib/storeMenuCatalog";
import type { StoreCartLine } from "../../lib/storeOrderDraft";
import styles from "./order.module.css";

function enrichCartLines(items: StoreCartLine[]): StoreCartLine[] {
  return items.map((line) => {
    const catalog = STORE_MENU_ITEMS.find((m) => m.id === line.id);
    return {
      ...line,
      image: line.image || catalog?.image,
      name: line.name || catalog?.name || line.id,
      price: line.price !== undefined ? line.price : (catalog?.price ?? null),
    };
  });
}

export default function StoreOrderCartSummary({
  items,
}: {
  items: StoreCartLine[];
}) {
  const lines = enrichCartLines(items);
  if (!lines.length) return null;

  const totalLabel = formatStoreOrderCartTotal(lines);

  return (
    <div className={styles.cartSummary}>
      <h2 className={styles.cartSummaryTitle}>ご注文内容</h2>
      <ul className={styles.cartSummaryList}>
        {lines.map((item) => (
          <li key={item.id} className={styles.cartSummaryRow}>
            <div className={styles.cartSummaryThumb}>
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  width={64}
                  height={64}
                  className={styles.cartSummaryImage}
                  sizes="64px"
                />
              ) : null}
            </div>
            <div className={styles.cartSummaryBody}>
              <p className={styles.cartSummaryName}>{item.name}</p>
              <p className={styles.cartSummaryMeta}>
                単価 {formatStoreOrderUnitPrice(item.price)} × {item.quantity}
              </p>
            </div>
            <p className={styles.cartSummaryLineTotal}>
              {formatStoreOrderLineTotal(item.price, item.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <div className={styles.cartSummaryTotalRow}>
        <span>合計金額（税込）</span>
        <span className={styles.cartSummaryTotalValue}>{totalLabel}</span>
      </div>
    </div>
  );
}
