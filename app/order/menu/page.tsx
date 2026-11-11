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
  storeMenuItemUnitPrice,
  formatStoreOrderCartTotal,
  formatStoreOrderLineTotal,
  syncStoreCartWithCatalog,
  computeStoreCartMoney,
  GREEN_SALAD_DRESSINGS,
  type StoreMenuCategory,
} from "../../../lib/storeMenuCatalog";
import {
  getStoreOrderMenuPromoSections,
  hasVisibleStoreOrderMenuPromo,
} from "../../../lib/storeOrderMenuPromo";
import {
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
  type StoreCartLine,
} from "../../../lib/storeOrderDraft";
import StoreOrderMenuPromo from "../StoreOrderMenuPromo";
import StoreOrderLastOrderNote from "../StoreOrderLastOrderNote";
import StoreOrderTestBanner from "../StoreOrderTestBanner";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import {
  normalizeStoreTableId,
  storeTableLabel,
} from "../../../lib/storeOrderTables";
import {
  persistStoreOrderTableId,
  readStoreOrderTableSession,
} from "../../../lib/storeOrderTableSession";
import {
  resolveActiveStoreTableId,
  storeOrderMenuHref,
  storeOrderTableEntryHref,
} from "../../../lib/storeOrderMenuUrl";
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
  "dessert",
  "drink_beer",
  "drink_hoppy",
  "drink_cocktail",
  "drink_sour",
  "drink_shochu_mugi",
  "drink_shochu_imo",
  "drink_mixer",
  "drink_fruit",
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
  dessert: "デザ\nート",
  drink_beer: "ビール",
  drink_hoppy: "ホッピー",
  drink_cocktail: "カク\nテル",
  drink_sour: "サワー",
  drink_shochu_mugi: "麦\n焼酎",
  drink_shochu_imo: "芋\n焼酎",
  drink_mixer: "割り\nもの",
  drink_fruit: "果実\n酒",
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
  const dineIn = isStoreOrderDineInClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<StoreCartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState<StoreMenuCategory>(
    "otsumami",
  );
  const [dressingPick, setDressingPick] = useState<Record<string, string>>({});
  const [seatBanner, setSeatBanner] = useState("");

  const visibleCategories = useMemo(
    () =>
      CATEGORY_ORDER.filter((c) =>
        STORE_MENU_ITEMS.some((m) => m.category === c),
      ),
    [],
  );

  useEffect(() => {
    const tableRaw =
      searchParams.get("table") ??
      searchParams.get("tableId") ??
      searchParams.get("seat");
    const fromUrl = normalizeStoreTableId(tableRaw);
    const draft = readStoreOrderDraft();
    const fromDraft = normalizeStoreTableId(draft.tableId || draft.seatLabel);
    const fromSession = readStoreOrderTableSession();
    const tableId = fromUrl || fromDraft || fromSession;

    let next = draft;
    if (tableId) {
      if (fromUrl) persistStoreOrderTableId(fromUrl);
      next = {
        ...draft,
        tableId,
        seatLabel: storeTableLabel(tableId),
      };
      writeStoreOrderDraft(next);
      setSeatBanner(storeTableLabel(tableId));
    }

    const synced = syncStoreCartWithCatalog(
      next.items.length ? next.items : [],
    );
    setCart(synced);
  }, [searchParams]);

  useEffect(() => {
    const fromUrl = normalizeStoreTableId(searchParams.get("table"));
    const tableId = resolveActiveStoreTableId();
    if (!tableId || fromUrl) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("table", tableId);
    params.set("seat", storeTableLabel(tableId));
    router.replace(`/order/menu?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

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

  function selectedDressing(item: (typeof STORE_MENU_ITEMS)[number]) {
    if (!item.dressingOptions?.length) return undefined;
    const fallback =
      item.dressingOptions[0] ?? GREEN_SALAD_DRESSINGS[0];
    return dressingPick[item.id] ?? fallback;
  }

  function cartQty(
    id: string,
    dressing?: string,
  ): number {
    const line = cart.find(
      (c) =>
        c.id === id &&
        (dressing ? c.dressing === dressing : !c.dressing),
    );
    return line?.quantity ?? 0;
  }

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
    const tableId = normalizeStoreTableId(draft.tableId || draft.seatLabel);
    writeStoreOrderDraft({
      ...draft,
      ...(tableId ? { tableId, seatLabel: storeTableLabel(tableId) } : {}),
      items: synced,
      totalQuantity: storeCartQuantity(synced),
      totalAmount: amount,
    });
    setCart(synced);
  }

  function changeQty(id: string, delta: number) {
    const item = STORE_MENU_ITEMS.find((m) => m.id === id);
    if (!item) return;

    const dressing = selectedDressing(item);
    const matchesLine = (c: StoreCartLine) =>
      c.id === id &&
      (dressing ? c.dressing === dressing : !c.dressing);

    const current = cart.find(matchesLine);
    const nextQty = (current?.quantity ?? 0) + delta;
    if (nextQty <= 0) {
      persist(cart.filter((c) => !matchesLine(c)));
      return;
    }

    const line: StoreCartLine = {
      id: item.id,
      name: item.name,
      price: storeMenuItemUnitPrice(item, dressing),
      quantity: nextQty,
      image: item.image,
      ...(dressing ? { dressing } : {}),
    };

    const others = cart.filter((c) => !matchesLine(c));
    persist([...others, line]);
  }

  function setDressingForItem(itemId: string, dressing: string) {
    setDressingPick((prev) => ({ ...prev, [itemId]: dressing }));
  }

  function emptyCart() {
    if (!window.confirm("カートの商品をすべて削除しますか？")) return;
    const draft = readStoreOrderDraft();
    const tableId = resolveActiveStoreTableId();
    writeStoreOrderDraft({
      ...draft,
      items: [],
      totalQuantity: 0,
      totalAmount: 0,
      ...(tableId
        ? { tableId, seatLabel: storeTableLabel(tableId) }
        : {}),
    });
    setCart([]);
  }

  function selectCategory(category: StoreMenuCategory) {
    setActiveCategory(category);
    const tableId = resolveActiveStoreTableId();
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category);
    if (tableId) {
      params.set("table", tableId);
      params.set("seat", storeTableLabel(tableId));
    }
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
      <StoreOrderTestBanner />
      <header className={styles.menuTopBar}>
        <Link
          href={
            dineIn ? storeOrderTableEntryHref() : "/order"
          }
          className={styles.menuTopBack}
        >
          TOP
        </Link>
        <h1 className={styles.menuTopTitle}>
          メニュー{seatBanner ? `（${seatBanner}）` : ""}
        </h1>
      </header>

      {dineIn ? (
        <div style={{ padding: "0 12px 8px" }}>
          <StoreOrderLastOrderNote />
        </div>
      ) : null}

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
                  qty={cartQty(heroItem.id, selectedDressing(heroItem))}
                  dressing={selectedDressing(heroItem)}
                  onDressingChange={setDressingForItem}
                  onChange={changeQty}
                />
              </div>
            </article>
          ) : null}

          {gridImageItems.length > 0 ? (
            <div className={styles.menuProductGrid}>
              {gridImageItems.map((item) => {
                const dressing = selectedDressing(item);
                const qty = cartQty(item.id, dressing);
                return (
                  <article key={item.id} className={styles.card}>
                    <MenuItemImage item={item} />
                    <div className={styles.cardBody}>
                      <MenuItemBody
                        item={item}
                        qty={qty}
                        dressing={dressing}
                        onDressingChange={setDressingForItem}
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
                const dressing = selectedDressing(item);
                const qty = cartQty(item.id, dressing);
                return (
                  <article key={item.id} className={styles.toppingCard}>
                    <div className={styles.cardBody}>
                      <MenuItemBody
                        item={item}
                        qty={qty}
                        dressing={dressing}
                        onDressingChange={setDressingForItem}
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
          href={
            totalQty > 0
              ? dineIn
                ? "/order/confirm"
                : "/order/customer"
              : "#"
          }
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
  const contain = item.imageFit === "contain";
  const imageClass = hero
    ? contain
      ? `${styles.menuHeroImage} ${styles.menuHeroImageContain}`
      : styles.menuHeroImage
    : contain
      ? `${styles.cardImage} ${styles.cardImageContain}`
      : styles.cardImage;

  return (
    <div
      className={
        contain ? `${styles.cardMedia} ${styles.cardMediaProduct}` : styles.cardMedia
      }
    >
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
        className={imageClass}
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
  dressing,
  onDressingChange,
  onChange,
}: {
  item: (typeof STORE_MENU_ITEMS)[number];
  qty: number;
  dressing?: string;
  onDressingChange: (itemId: string, dressing: string) => void;
  onChange: (id: string, delta: number) => void;
}) {
  const unitPrice = storeMenuItemUnitPrice(item, dressing);
  const priceLabel = formatStoreItemPrice(unitPrice);
  const dressings = item.dressingOptions;
  const pickLabel = item.optionLabel ?? "ドレッシング";

  return (
    <>
      <div className={styles.cardName}>{item.name}</div>
      {dressings?.length ? (
        <div className={styles.dressingPick}>
          <span className={styles.dressingLabel}>{pickLabel}</span>
          <div className={styles.dressingOptions} role="group" aria-label="ドレッシング">
            {dressings.map((opt) => (
              <button
                key={opt}
                type="button"
                className={
                  dressing === opt
                    ? `${styles.dressingBtn} ${styles.dressingBtnActive}`
                    : styles.dressingBtn
                }
                onClick={() => onDressingChange(item.id, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {priceLabel ? (
        <div className={styles.cardPrice}>{priceLabel}</div>
      ) : null}
      {qty > 0 ? (
        <div className={styles.cardSubtotal}>
          小計 {formatStoreOrderLineTotal(unitPrice, qty)}
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
