"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
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
  getStoreOrderMenuPromoSections,
  hasVisibleStoreOrderMenuPromo,
} from "../../../lib/storeOrderMenuPromo";
import {
  clearStoreOrderDraft,
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
  type StoreCartLine,
} from "../../../lib/storeOrderDraft";
import StoreOrderMenuPromo from "../StoreOrderMenuPromo";
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

const CATEGORY_SHORT: Partial<Record<StoreMenuCategory, string>> = {
  otsumami: "おつまみ",
  salad: "サラダ",
  okonomiyaki: "お好み\n焼き",
  topping: "トッピ\nング",
  teppanyaki: "鉄板\n焼き",
  fried: "揚げ物",
  rice: "ご飯",
  noodle: "麺",
};

function isValidCategory(v: string | null): v is StoreMenuCategory {
  return CATEGORY_ORDER.includes(v as StoreMenuCategory);
}

export default function StoreOrderMenuPage() {
  return (
    <Suspense fallback={<main className={styles.page}>読み込み中…</main>}>
      <StoreOrderMenuPageInner />
    </Suspense>
  );
}

function StoreOrderMenuPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<StoreCartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState<StoreMenuCategory>(
    "otsumami",
  );

  const visibleCategories = useMemo(
    () =>
      CATEGORY_ORDER.filter((c) =>
        STORE_MENU_ITEMS.some((m) => m.category === c),
      ),
    [],
  );

  useEffect(() => {
    const draft = readStoreOrderDraft();
    const synced = syncStoreCartWithCatalog(
      draft.items.length ? draft.items : [],
    );
    setCart(synced);
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (isValidCategory(fromUrl) && visibleCategories.includes(fromUrl)) {
      setActiveCategory(fromUrl);
      return;
    }
    if (visibleCategories.length) {
      setActiveCategory(visibleCategories[0]);
    }
  }, [searchParams, visibleCategories]);

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

  const activeItems = useMemo(
    () => STORE_MENU_ITEMS.filter((m) => m.category === activeCategory),
    [activeCategory],
  );

  const promoSections = useMemo(
    () => getStoreOrderMenuPromoSections(activeCategory),
    [activeCategory],
  );

  const showPromo = hasVisibleStoreOrderMenuPromo(activeCategory);

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

  function emptyCart() {
    if (!window.confirm("カートの商品をすべて削除しますか？")) return;
    clearStoreOrderDraft();
    setCart([]);
  }

  function selectCategory(category: StoreMenuCategory) {
    setActiveCategory(category);
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category);
    router.replace(`/order/menu?${params.toString()}`, { scroll: false });
  }

  const isTopping = activeCategory === "topping";
  const imageItems = isTopping
    ? []
    : activeItems.filter((i) => i.image);
  const textOnlyItems = isTopping
    ? activeItems
    : activeItems.filter((i) => !i.image);
  const heroItem = imageItems[0];
  const gridImageItems = imageItems.slice(1);

  return (
    <main className={`${styles.page} ${styles.menuPage}`}>
      <header className={styles.menuTopBar}>
        <Link href="/order" className={styles.menuTopBack}>
          TOP
        </Link>
        <h1 className={styles.menuTopTitle}>メニュー</h1>
      </header>

      <div className={styles.menuSplit}>
        <nav className={styles.menuNav} aria-label="カテゴリー">
          {visibleCategories.map((category) => {
            const short =
              CATEGORY_SHORT[category] ||
              STORE_MENU_CATEGORY_LABEL[category].replace(/(.{4})/g, "$1\n");
            return (
              <button
                key={category}
                type="button"
                className={
                  activeCategory === category
                    ? `${styles.menuNavBtn} ${styles.menuNavBtnActive}`
                    : styles.menuNavBtn
                }
                onClick={() => selectCategory(category)}
              >
                {short.split("\n").map((line, i) => (
                  <span key={i} className={styles.menuNavLine}>
                    {line}
                  </span>
                ))}
              </button>
            );
          })}
        </nav>

        <div className={styles.menuMain}>
          <h2 className={styles.menuCategoryTitle}>
            {STORE_MENU_CATEGORY_LABEL[activeCategory]}
          </h2>
          {STORE_MENU_CATEGORY_NOTE[activeCategory] ? (
            <p className={styles.categoryNote}>{STORE_MENU_CATEGORY_NOTE[activeCategory]}</p>
          ) : null}

          {showPromo ? (
            <StoreOrderMenuPromo sections={promoSections} />
          ) : null}

          {heroItem ? (
            <article className={styles.menuHeroCard}>
              <MenuItemImage item={heroItem} hero />
              <div className={styles.cardBody}>
                <MenuItemBody
                  item={heroItem}
                  qty={qtyById.get(heroItem.id) ?? 0}
                  onChange={changeQty}
                />
              </div>
            </article>
          ) : null}

          {gridImageItems.length > 0 ? (
            <div className={styles.menuProductGrid}>
              {gridImageItems.map((item) => {
                const qty = qtyById.get(item.id) ?? 0;
                return (
                  <article key={item.id} className={styles.card}>
                    <MenuItemImage item={item} />
                    <div className={styles.cardBody}>
                      <MenuItemBody
                        item={item}
                        qty={qty}
                        onChange={changeQty}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {textOnlyItems.length > 0 ? (
            <div
              className={
                isTopping ? styles.toppingGrid : styles.menuProductGrid
              }
            >
              {textOnlyItems.map((item) => {
                const qty = qtyById.get(item.id) ?? 0;
                return (
                  <article key={item.id} className={styles.toppingCard}>
                    <div className={styles.cardBody}>
                      <MenuItemBody
                        item={item}
                        qty={qty}
                        onChange={changeQty}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

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
        {totalQty > 0 ? (
          <button
            type="button"
            className={styles.clearCartBtn}
            onClick={emptyCart}
          >
            カートを空にする
          </button>
        ) : null}
      </div>
    </main>
  );
}

function MenuItemImage({
  item,
  hero = false,
}: {
  item: (typeof STORE_MENU_ITEMS)[number];
  hero?: boolean;
}) {
  return (
    <div className={styles.cardMedia}>
      <Image
        src={item.image}
        alt={item.name}
        width={hero ? 800 : 400}
        height={hero ? 500 : 400}
        sizes={
          hero
            ? "(max-width: 520px) 70vw, 360px"
            : "(max-width: 520px) 40vw, 200px"
        }
        className={hero ? styles.menuHeroImage : styles.cardImage}
      />
      {item.badge ? (
        <span className={styles.menuItemBadge}>{item.badge}</span>
      ) : null}
    </div>
  );
}

function MenuItemBody({
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
