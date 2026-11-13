"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  STORE_MENU_CATEGORY_LABEL,
  STORE_MENU_CATEGORY_NOTE,
  STORE_MENU_ITEMS,
  formatStoreItemPrice,
  storeMenuItemUnitPrice,
  storeMenuParseSecondaryStepperValue,
  storeMenuSecondaryStepperLabel,
  formatStoreOrderCartTotal,
  formatStoreOrderLineTotal,
  syncStoreCartWithCatalog,
  computeStoreCartMoney,
  GREEN_SALAD_DRESSINGS,
  storeMenuShouldHideCardName,
  type StoreMenuCategory,
} from "../../../lib/storeMenuCatalog";
import {
  getStoreOrderMenuPromoSections,
  hasVisibleStoreOrderMenuPromo,
} from "../../../lib/storeOrderMenuPromo";
import { SAKE_MENU_REGIONS } from "../../../lib/storeDrinkDessertMenu";
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
import StoreMenuItemName from "../StoreMenuItemName";
import styles from "../order.module.css";

const CATEGORY_ORDER: StoreMenuCategory[] = [
  "otsumami",
  "salad",
  "okonomiyaki",
  "monjayaki",
  "topping",
  "teppanyaki",
  "fried",
  "rice",
  "noodle",
  "dessert",
  "drink_beer",
  "drink_hoppy",
  "drink_highball",
  "drink_sake",
  "drink_wine",
  "drink_cocktail",
  "drink_sour",
  "drink_shochu_mugi",
  "drink_shochu_imo",
  "drink_mixer",
  "drink_fruit",
];

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
  const [secondaryDressingPick, setSecondaryDressingPick] = useState<
    Record<string, string>
  >({});
  const [seatBanner, setSeatBanner] = useState("");
  const menuMainRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    menuMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeCategory]);

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

  function selectedSecondaryDressing(item: (typeof STORE_MENU_ITEMS)[number]) {
    if (item.secondaryOptionStepper) {
      const stepper = item.secondaryOptionStepper;
      const fallback =
        stepper.default ??
        Math.max(stepper.min, Math.min(stepper.max, stepper.min));
      const picked = secondaryDressingPick[item.id];
      const n =
        storeMenuParseSecondaryStepperValue(picked) ??
        fallback;
      const clamped = Math.max(stepper.min, Math.min(stepper.max, n));
      return storeMenuSecondaryStepperLabel(stepper, clamped);
    }
    if (!item.secondaryDressingOptions?.length) return undefined;
    return secondaryDressingPick[item.id] ?? item.secondaryDressingOptions[0];
  }

  function cartLineOptionsMatch(
    c: StoreCartLine,
    id: string,
    dressing?: string,
    secondaryDressing?: string,
  ) {
    if (c.id !== id) return false;
    return (
      (c.dressing ?? "") === (dressing ?? "") &&
      (c.secondaryDressing ?? "") === (secondaryDressing ?? "")
    );
  }

  function cartQty(
    id: string,
    dressing?: string,
    secondaryDressing?: string,
  ): number {
    const line = cart.find((c) =>
      cartLineOptionsMatch(c, id, dressing, secondaryDressing),
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
    const secondaryDressing = selectedSecondaryDressing(item);
    const matchesLine = (c: StoreCartLine) =>
      cartLineOptionsMatch(c, id, dressing, secondaryDressing);

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
      ...(secondaryDressing || item.secondaryOptionStepper
        ? { secondaryDressing }
        : {}),
    };

    const others = cart.filter((c) => !matchesLine(c));
    persist([...others, line]);
  }

  function setDressingForItem(itemId: string, dressing: string) {
    setDressingPick((prev) => ({ ...prev, [itemId]: dressing }));
  }

  function setSecondaryDressingForItem(itemId: string, dressing: string) {
    setSecondaryDressingPick((prev) => ({ ...prev, [itemId]: dressing }));
  }

  function changeSecondaryQty(itemId: string, delta: number) {
    const item = STORE_MENU_ITEMS.find((m) => m.id === itemId);
    const stepper = item?.secondaryOptionStepper;
    if (!stepper) return;
    const current =
      storeMenuParseSecondaryStepperValue(selectedSecondaryDressing(item!)) ??
      stepper.default ??
      stepper.min;
    const next = Math.max(
      stepper.min,
      Math.min(stepper.max, current + delta),
    );
    setSecondaryDressingForItem(
      itemId,
      storeMenuSecondaryStepperLabel(stepper, next),
    );
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
    : activeItems.filter(
        (i) => i.image && !i.menuListFullWidth && !i.menuCatalogInline,
      );
  const textOnlyItems = isTopping
    ? activeItems
    : activeItems.filter(
        (i) => !i.image || i.menuListFullWidth || i.menuCatalogInline,
      );
  /** 画像付き商品を1行ずつ全幅表示（ビール系・揚げ物・ご飯・サラダ・お好み焼き・もんじゃ・麺） */
  const fullWidthImageMenu =
    activeCategory === "drink_beer" ||
    activeCategory === "drink_highball" ||
    activeCategory === "drink_sake" ||
    activeCategory === "drink_wine" ||
    activeCategory === "drink_shochu_mugi" ||
    activeCategory === "drink_shochu_imo" ||
    activeCategory === "drink_mixer" ||
    activeCategory === "drink_fruit" ||
    activeCategory === "fried" ||
    activeCategory === "rice" ||
    activeCategory === "salad" ||
    activeCategory === "okonomiyaki" ||
    activeCategory === "monjayaki" ||
    activeCategory === "noodle";
  /** ホッピー白・黒: 2列横並び */
  const hoppyPairLayout = activeCategory === "drink_hoppy";
  /** カクテル等: 画像付きを2列グリッド */
  const twoColumnImageMenu = activeCategory === "drink_cocktail";

  let heroItems = imageItems;
  let hoppyRowItems: typeof imageItems = [];
  let gridImageItems: typeof imageItems = [];

  if (fullWidthImageMenu) {
    /* heroItems = imageItems */
  } else if (hoppyPairLayout) {
    heroItems = [];
    hoppyRowItems = imageItems;
  } else if (twoColumnImageMenu) {
    heroItems = [];
    gridImageItems = imageItems;
  } else {
    const first = imageItems[0];
    heroItems = first ? [first] : [];
    gridImageItems = imageItems.slice(1);
  }

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
          {visibleCategories.map((category) => (
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
                <span className={styles.menuNavLine}>
                  {STORE_MENU_CATEGORY_LABEL[category]}
                </span>
              </button>
            ))}
        </nav>

        <div ref={menuMainRef} className={styles.menuMain}>
          <h2 className={styles.menuCategoryTitle}>
            {STORE_MENU_CATEGORY_LABEL[activeCategory]}
          </h2>
          {STORE_MENU_CATEGORY_NOTE[activeCategory] ? (
            <p className={styles.categoryNote}>{STORE_MENU_CATEGORY_NOTE[activeCategory]}</p>
          ) : null}

          {showPromo ? (
            <StoreOrderMenuPromo sections={promoSections} />
          ) : null}

          {activeCategory === "drink_sake"
            ? SAKE_MENU_REGIONS.map((region) => {
                const regionItems = heroItems.filter(
                  (i) => i.menuRegion === region,
                );
                if (!regionItems.length) return null;
                return (
                  <section
                    key={region}
                    className={styles.menuRegionSection}
                    aria-label={region}
                  >
                    <h3 className={styles.menuRegionTitle}>{region}</h3>
                    {regionItems.map((item) => {
                      const dressing = selectedDressing(item);
                      const secondaryDressing =
                        selectedSecondaryDressing(item);
                      return (
                        <article key={item.id} className={styles.menuHeroCard}>
                          <MenuItemImage item={item} hero />
                          <div className={styles.cardBody}>
                            <MenuItemBody
                              item={item}
                              qty={cartQty(
                                item.id,
                                dressing,
                                secondaryDressing,
                              )}
                              dressing={dressing}
                              secondaryDressing={secondaryDressing}
                              onDressingChange={setDressingForItem}
                              onSecondaryDressingChange={
                                setSecondaryDressingForItem
                              }
                              onSecondaryStepperChange={changeSecondaryQty}
                              onChange={changeQty}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </section>
                );
              })
            : heroItems.map((item) => {
                const dressing = selectedDressing(item);
                const secondaryDressing = selectedSecondaryDressing(item);
                return (
                  <article key={item.id} className={styles.menuHeroCard}>
                    <MenuItemImage item={item} hero />
                    <div className={styles.cardBody}>
                      <MenuItemBody
                        item={item}
                        qty={cartQty(item.id, dressing, secondaryDressing)}
                        dressing={dressing}
                        secondaryDressing={secondaryDressing}
                        onDressingChange={setDressingForItem}
                        onSecondaryDressingChange={setSecondaryDressingForItem}
                        onSecondaryStepperChange={changeSecondaryQty}
                        onChange={changeQty}
                      />
                    </div>
                  </article>
                );
              })}

          {hoppyRowItems.length > 0 ? (
            <div className={styles.menuHoppyRow}>
              {hoppyRowItems.map((item) => {
                const dressing = selectedDressing(item);
                const secondaryDressing = selectedSecondaryDressing(item);
                return (
                  <article key={item.id} className={styles.menuHoppyCard}>
                    <MenuItemImage item={item} />
                    <div className={styles.cardBody}>
                      <MenuItemBody
                        item={item}
                        qty={cartQty(item.id, dressing, secondaryDressing)}
                        dressing={dressing}
                        secondaryDressing={secondaryDressing}
                        onDressingChange={setDressingForItem}
                        onSecondaryDressingChange={setSecondaryDressingForItem}
                        onSecondaryStepperChange={changeSecondaryQty}
                        onChange={changeQty}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {gridImageItems.length > 0 ? (
            <div className={styles.menuProductGrid}>
              {gridImageItems.map((item) => {
                const dressing = selectedDressing(item);
                const secondaryDressing = selectedSecondaryDressing(item);
                const qty = cartQty(item.id, dressing, secondaryDressing);
                return (
                  <article key={item.id} className={styles.card}>
                    <MenuItemImage item={item} />
                    <div className={styles.cardBody}>
                      <MenuItemBody
                        item={item}
                        qty={qty}
                        dressing={dressing}
                        secondaryDressing={secondaryDressing}
                        onDressingChange={setDressingForItem}
                        onSecondaryDressingChange={setSecondaryDressingForItem}
                        onSecondaryStepperChange={changeSecondaryQty}
                        onChange={changeQty}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          <TextOnlyMenuSections
            items={textOnlyItems}
            isTopping={isTopping}
            selectedDressing={selectedDressing}
            selectedSecondaryDressing={selectedSecondaryDressing}
            cartQty={cartQty}
            onDressingChange={setDressingForItem}
            onSecondaryDressingChange={setSecondaryDressingForItem}
            onSecondaryStepperChange={changeSecondaryQty}
            onChange={changeQty}
          />
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

function TextOnlyMenuSections({
  items,
  isTopping,
  selectedDressing,
  selectedSecondaryDressing,
  cartQty,
  onDressingChange,
  onSecondaryDressingChange,
  onSecondaryStepperChange,
  onChange,
}: {
  items: (typeof STORE_MENU_ITEMS)[number][];
  isTopping: boolean;
  selectedDressing: (item: (typeof STORE_MENU_ITEMS)[number]) => string | undefined;
  selectedSecondaryDressing: (item: (typeof STORE_MENU_ITEMS)[number]) => string | undefined;
  cartQty: (
    id: string,
    dressing?: string,
    secondaryDressing?: string,
  ) => number;
  onDressingChange: (itemId: string, dressing: string) => void;
  onSecondaryDressingChange: (itemId: string, dressing: string) => void;
  onSecondaryStepperChange: (itemId: string, delta: number) => void;
  onChange: (id: string, delta: number) => void;
}) {
  const nodes: ReactNode[] = [];
  let gridRun: (typeof STORE_MENU_ITEMS)[number][] = [];

  const bodyProps = (item: (typeof STORE_MENU_ITEMS)[number]) => {
    const dressing = selectedDressing(item);
    const secondaryDressing = selectedSecondaryDressing(item);
    return {
      item,
      qty: cartQty(item.id, dressing, secondaryDressing),
      dressing,
      secondaryDressing,
      onDressingChange,
      onSecondaryDressingChange,
      onSecondaryStepperChange,
      onChange,
    };
  };

  const flushGrid = () => {
    if (!gridRun.length) return;
    const gridKey = gridRun.map((i) => i.id).join(",");
    nodes.push(
      <div
        key={`text-grid-${gridKey}`}
        className={isTopping ? styles.toppingGrid : styles.menuProductGrid}
      >
        {gridRun.map((item) => (
          <article
            key={item.id}
            className={item.image ? styles.card : styles.toppingCard}
          >
            {item.image ? <MenuItemImage item={item} /> : null}
            <div className={styles.cardBody}>
              <MenuItemBody {...bodyProps(item)} />
            </div>
          </article>
        ))}
      </div>,
    );
    gridRun = [];
  };

  for (const item of items) {
    if (item.menuListFullWidth) {
      flushGrid();
      nodes.push(
        <article
          key={item.id}
          className={`${styles.menuHeroCard} ${styles.menuTextOnlyFull}`}
        >
          {item.image ? <MenuItemImage item={item} hero /> : null}
          <div className={styles.cardBody}>
            <MenuItemBody {...bodyProps(item)} />
          </div>
        </article>,
      );
    } else {
      gridRun.push(item);
    }
  }
  flushGrid();

  return <>{nodes}</>;
}

function MenuItemImage({
  item,
  hero = false,
}: {
  item: (typeof STORE_MENU_ITEMS)[number];
  hero?: boolean;
}) {
  const contain = item.imageFit === "contain";
  const banner = Boolean(item.imageBanner);
  const imgW = item.imageWidth ?? (hero ? 800 : 400);
  const imgH = item.imageHeight ?? (hero ? 500 : 400);
  const imageClass = hero
    ? banner
      ? `${styles.menuHeroImage} ${styles.menuHeroImageBanner}`
      : contain
        ? `${styles.menuHeroImage} ${styles.menuHeroImageContain}`
        : styles.menuHeroImage
    : contain
      ? `${styles.cardImage} ${styles.cardImageContain}`
      : styles.cardImage;

  const cropCaption = Boolean(item.imageCropBottomCaption);
  const mediaClass = [
    styles.cardMedia,
    banner && styles.cardMediaBanner,
    contain && styles.cardMediaProduct,
    cropCaption && styles.cardMediaCropCaption,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={mediaClass}>
      <Image
        src={item.image}
        alt={item.name}
        width={imgW}
        height={imgH}
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

function OptionPickGroup({
  label,
  options,
  value,
  optionPrices,
  ariaLabel,
  column,
  onPick,
}: {
  label: string;
  options: readonly string[];
  value?: string;
  optionPrices?: Partial<Record<string, number>>;
  ariaLabel: string;
  column?: boolean;
  onPick: (opt: string) => void;
}) {
  const optionsClass = column
    ? `${styles.dressingOptions} ${styles.dressingOptionsOneCol}`
    : options.length === 2
      ? `${styles.dressingOptions} ${styles.dressingOptionsTwoCol}`
      : styles.dressingOptions;

  return (
    <div className={styles.dressingPick}>
      <span className={styles.dressingLabel}>{label}</span>
      <div className={optionsClass} role="group" aria-label={ariaLabel}>
        {options.map((opt) => {
          const optPrice = optionPrices?.[opt];
          const text =
            optPrice != null
              ? `${opt} ¥${optPrice.toLocaleString("ja-JP")}`
              : opt;
          return (
            <button
              key={opt}
              type="button"
              className={
                value === opt
                  ? `${styles.dressingBtn} ${styles.dressingBtnActive}`
                  : styles.dressingBtn
              }
              onClick={() => onPick(opt)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MenuItemBody({
  item,
  qty,
  dressing,
  secondaryDressing,
  onDressingChange,
  onSecondaryDressingChange,
  onSecondaryStepperChange,
  onChange,
}: {
  item: (typeof STORE_MENU_ITEMS)[number];
  qty: number;
  dressing?: string;
  secondaryDressing?: string;
  onDressingChange: (itemId: string, dressing: string) => void;
  onSecondaryDressingChange: (itemId: string, dressing: string) => void;
  onSecondaryStepperChange: (itemId: string, delta: number) => void;
  onChange: (id: string, delta: number) => void;
}) {
  const unitPrice = storeMenuItemUnitPrice(item, dressing);
  const priceLabel = formatStoreItemPrice(unitPrice);
  const dressings = item.dressingOptions;
  const pickLabel = item.optionLabel ?? "ドレッシング";
  const secondaryOptions = item.secondaryDressingOptions;
  const secondaryStepper = item.secondaryOptionStepper;
  const secondaryLabel = item.secondaryOptionLabel ?? "オプション";
  const glassCount =
    secondaryStepper && secondaryDressing
      ? (storeMenuParseSecondaryStepperValue(secondaryDressing) ?? 0)
      : 0;

  return (
    <>
      {storeMenuShouldHideCardName(item) ? null : (
        <div className={styles.cardName}>
          <StoreMenuItemName name={item.name} />
        </div>
      )}
      {dressings?.length ? (
        <OptionPickGroup
          label={pickLabel}
          options={dressings}
          value={dressing}
          optionPrices={item.optionPrices}
          ariaLabel={pickLabel}
          column={item.dressingOptionsColumn}
          onPick={(opt) => onDressingChange(item.id, opt)}
        />
      ) : null}
      {secondaryStepper ? (
        <div className={styles.dressingPick}>
          <span className={styles.dressingLabel}>{secondaryLabel}</span>
          <div className={styles.qtyControl}>
            <button
              type="button"
              className={styles.qtyBtn}
              disabled={glassCount <= secondaryStepper.min}
              onClick={() => onSecondaryStepperChange(item.id, -1)}
              aria-label={`${secondaryLabel}を減らす`}
            >
              −
            </button>
            <span>{glassCount}</span>
            <button
              type="button"
              className={styles.qtyBtn}
              disabled={glassCount >= secondaryStepper.max}
              onClick={() => onSecondaryStepperChange(item.id, 1)}
              aria-label={`${secondaryLabel}を増やす`}
            >
              ＋
            </button>
          </div>
        </div>
      ) : null}
      {secondaryOptions?.length ? (
        <OptionPickGroup
          label={secondaryLabel}
          options={secondaryOptions}
          value={secondaryDressing}
          ariaLabel={secondaryLabel}
          onPick={(opt) => onSecondaryDressingChange(item.id, opt)}
        />
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
