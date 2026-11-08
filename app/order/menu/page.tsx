"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  STORE_MENU_CATEGORY_LABEL,
  STORE_MENU_CATEGORY_NOTE,
  STORE_MENU_ITEMS,
  formatStoreItemPrice,
  formatStoreOrderCartTotal,
  formatStoreOrderLineTotal,
  syncStoreCartWithCatalog,
  computeStoreCartMoney,
  type StoreMenuCategory,
} from "../../../lib/storeMenuCatalog";
import {
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
  type StoreCartLine,
} from "../../../lib/storeOrderDraft";
import CategoryBrushLine from "../CategoryBrushLine";
import styles from "../order.module.css";

const CATEGORY_ORDER: StoreMenuCategory[] = [
  "otsumami",
  "salad",
  "okonomiyaki",
  "topping",
  "teppanyaki",
  "fried",
  "rice",
  "noodle",
];

export default function StoreOrderMenuPage() {
  const [cart, setCart] = useState<StoreCartLine[]>([]);

  useEffect(() => {
    const draft = readStoreOrderDraft();
    const synced = syncStoreCartWithCatalog(
      draft.items.length ? draft.items : [],
    );
    setCart(synced);
  }, []);

  const cartTotalLabel = useMemo(
    () => formatStoreOrderCartTotal(cart),
    [cart],
  );

  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((line) => map.set(line.id, line.quantity));
    return map;
  }, [cart]);

  const totalQty = storeCartQuantity(cart);

  function persist(next: StoreCartLine[]) {
    const synced = syncStoreCartWithCatalog(next);
    const { amount } = computeStoreCartMoney(synced);
    const draft = readStoreOrderDraft();
    writeStoreOrderDraft({
      ...draft,
      items: synced,
      totalQuantity: storeCartQuantity(synced),
      totalAmount: amount,
    });
    setCart(synced);
  }

  function changeQty(id: string, delta: number) {
    const item = STORE_MENU_ITEMS.find((m) => m.id === id);
    if (!item) return;

    const current = cart.find((c) => c.id === id);
    const nextQty = (current?.quantity ?? 0) + delta;
    if (nextQty <= 0) {
      persist(cart.filter((c) => c.id !== id));
      return;
    }

    const line: StoreCartLine = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: nextQty,
      image: item.image,
    };

    const others = cart.filter((c) => c.id !== id);
    persist([...others, line]);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>店内メニュー</h1>
        <p className={styles.sub}>
          選ぶ → 注文確認 → お名前・電話 → 店頭でお支払い
        </p>
      </header>

      {CATEGORY_ORDER.map((category) => {
        const items = STORE_MENU_ITEMS.filter((m) => m.category === category);
        if (!items.length) return null;

        return (
          <section key={category} className={styles.categorySection}>
            <h2 className={styles.categoryHeading}>
              <span className={styles.categoryHeadingInner}>
                <CategoryBrushLine idSuffix={category} />
                <span className={styles.categoryHeadingText}>
                  {STORE_MENU_CATEGORY_LABEL[category]}
                </span>
              </span>
            </h2>
            {STORE_MENU_CATEGORY_NOTE[category] ? (
              <p className={styles.categoryNote}>
                {STORE_MENU_CATEGORY_NOTE[category]}
              </p>
            ) : null}
            <div
              className={
                category === "topping" ? styles.toppingGrid : styles.grid
              }
            >
              {items.map((item) => {
                const qty = qtyById.get(item.id) ?? 0;
                const textOnly = category === "topping" || !item.image;
                return (
                  <article
                    key={item.id}
                    className={
                      textOnly ? styles.toppingCard : styles.card
                    }
                  >
                    {!textOnly ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={400}
                        height={400}
                        sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 220px"
                        className={styles.cardImage}
                      />
                    ) : null}
                    <div className={styles.cardBody}>
                      <Tools item={item} qty={qty} onChange={changeQty} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className={styles.footerBar}>
        {totalQty > 0 ? (
          <div className={styles.footerCartTotals}>
            <span>{totalQty}点</span>
            <span className={styles.footerCartAmount}>
              合計 {cartTotalLabel}
            </span>
          </div>
        ) : null}
        <Link
          href={totalQty > 0 ? "/order/pickup" : "#"}
          className={styles.primaryBtn}
          aria-disabled={totalQty <= 0}
          onClick={(e) => {
            if (totalQty <= 0) e.preventDefault();
          }}
          style={totalQty <= 0 ? { pointerEvents: "none", opacity: 0.45 } : {}}
        >
          {totalQty > 0
            ? `注文確認（${totalQty}点）`
            : "商品を選んでください"}
        </Link>
      </div>
    </main>
  );
}

function Tools({
  item,
  qty,
  onChange,
}: {
  item: (typeof STORE_MENU_ITEMS)[number];
  qty: number;
  onChange: (id: string, delta: number) => void;
}) {
  const priceLabel = formatStoreItemPrice(item.price);

  return (
    <>
      <div className={styles.cardName}>{item.name}</div>
      {priceLabel ? (
        <div className={styles.cardPrice}>{priceLabel}</div>
      ) : null}
      {qty > 0 ? (
        <div className={styles.cardSubtotal}>
          小計 {formatStoreOrderLineTotal(item.price, qty)}
        </div>
      ) : null}
      <div className={styles.qtyControl}>
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => onChange(item.id, -1)}
          aria-label={`${item.name}を減らす`}
        >
          −
        </button>
        <span>{qty}</span>
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => onChange(item.id, 1)}
          aria-label={`${item.name}を増やす`}
        >
          ＋
        </button>
      </div>
    </>
  );
}
