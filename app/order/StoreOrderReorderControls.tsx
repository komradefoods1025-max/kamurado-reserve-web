"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STORE_MENU_ITEMS,
  formatStoreItemPrice,
  storeMenuItemUnitPrice,
} from "../../lib/storeMenuCatalog";
import {
  changeStoreReorderQty,
  dressingSummaryFromReorderLine,
  storeReorderCartQty,
  type StoreReorderLine,
} from "../../lib/storeOrderReorder";
import StoreMenuItemName from "./StoreMenuItemName";
import styles from "./order.module.css";

export function StoreOrderReorderControls({
  menuKey,
  dressingSummary,
  lastQty,
  onCartChange,
}: {
  menuKey: string;
  dressingSummary?: string;
  lastQty?: number;
  onCartChange?: () => void;
}) {
  const [qty, setQty] = useState(0);

  const syncQty = useCallback(() => {
    setQty(storeReorderCartQty(menuKey, dressingSummary));
  }, [menuKey, dressingSummary]);

  useEffect(() => {
    syncQty();
  }, [syncQty]);

  const catalog = STORE_MENU_ITEMS.find((m) => m.id === menuKey);
  if (!catalog) return null;

  const parsedDressing = dressingSummary?.split(" / ")[0];
  const unit = storeMenuItemUnitPrice(catalog, parsedDressing);
  const priceLabel = formatStoreItemPrice(unit);

  function change(delta: number) {
    if (changeStoreReorderQty(menuKey, dressingSummary, delta)) {
      syncQty();
      onCartChange?.();
    }
  }

  return (
    <div className={styles.reorderRow}>
      <div className={styles.reorderRowBody}>
        <p className={styles.reorderRowName}>
          <StoreMenuItemName name={catalog.name} />
        </p>
        {dressingSummary ? (
          <p className={styles.reorderRowMeta}>{dressingSummary}</p>
        ) : null}
        {lastQty != null && lastQty > 0 ? (
          <p className={styles.reorderRowMeta}>前回 {lastQty}点</p>
        ) : null}
        {priceLabel ? (
          <p className={styles.reorderRowPrice}>{priceLabel}</p>
        ) : null}
      </div>
      <div className={styles.qtyStepper}>
        <button
          type="button"
          className={styles.qtyBtn}
          aria-label="減らす"
          onClick={() => change(-1)}
          disabled={qty <= 0}
        >
          −
        </button>
        <span className={styles.qtyValue}>{qty}</span>
        <button
          type="button"
          className={styles.qtyBtn}
          aria-label="増やす"
          onClick={() => change(1)}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

export function StoreOrderOkawariList({
  lines,
  onCartChange,
}: {
  lines: StoreReorderLine[];
  onCartChange?: () => void;
}) {
  if (!lines.length) {
    return (
      <p className={styles.stepNote}>
        まだご注文がありません。他のカテゴリーからお選びください。
      </p>
    );
  }

  return (
    <div className={styles.reorderList}>
      {lines.map((line) => (
        <StoreOrderReorderControls
          key={`${line.menuKey}-${dressingSummaryFromReorderLine(line)}`}
          menuKey={line.menuKey}
          dressingSummary={dressingSummaryFromReorderLine(line)}
          lastQty={line.lastQty}
          onCartChange={onCartChange}
        />
      ))}
    </div>
  );
}