"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MENU_BOOK_PAGES,
  formatMenuPrice,
  getMenuBookPage,
  isOrderableMenuBookPage,
  type MenuBookPage,
} from "../../lib/menuBookPages";
import {
  addMenuBookItemToDraft,
  adjustMenuBookItemQuantity,
  getCartItemRiceSize,
  getCartSummary,
  isBentoCartItem,
  readDraft,
  RICE_SIZE_OPTIONS,
  type CartItem,
  type ReservationDraft,
  type RiceSize,
  updateCartItemRiceSize,
} from "../../lib/reservationDraft";
import styles from "./page.module.css";

const MOBILE_BREAKPOINT = 768;
const PHONE_NUMBER = "0484415517";
const PHONE_DISPLAY = "048-441-5517";
const PAGE_TRANSITION_MS = 420;
const SWIPE_THRESHOLD = 52;
const VELOCITY_THRESHOLD = 0.42;
const TAP_THRESHOLD = 12;

type Layout = {
  isMobile: boolean;
  pageWidth: number;
  spreadWidth: number;
};

type PageDirection = "next" | "prev";

const DEFAULT_LAYOUT: Layout = {
  isMobile: true,
  pageWidth: 320,
  spreadWidth: 320,
};

function CartIcon() {
  return (
    <svg className={styles.btnSvg} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 4v3M16 4v3M4 10h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="14.5" r="1" fill="currentColor" />
      <circle cx="15" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className={styles.btnSvg} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.6 4h2.8l1.4 4.6-1.9 1.1a11 11 0 0 0 5.5 5.5l1.1-1.9 4.6 1.4v2.8a2 2 0 0 1-2.1 2C10.1 20.4 3.6 13.9 4.1 6.7 4.2 5.3 5.2 4 6.6 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrandLogo() {
  return null;
}

function getMaxLeftPage(isMobile: boolean): number {
  if (isMobile) {
    return MENU_BOOK_PAGES.length - 1;
  }

  return MENU_BOOK_PAGES.length % 2 === 1
    ? MENU_BOOK_PAGES.length - 1
    : MENU_BOOK_PAGES.length - 2;
}

function getTargetPageIndex(
  current: number,
  direction: PageDirection,
  isMobile: boolean,
): number {
  const step = isMobile ? 1 : 2;
  const maxPage = getMaxLeftPage(isMobile);

  if (direction === "next") {
    return Math.min(maxPage, current + step);
  }

  return Math.max(0, current - step);
}

function resolveSwipeDirection(
  offsetX: number,
  velocity: number,
): PageDirection | null {
  if (offsetX <= -SWIPE_THRESHOLD || velocity <= -VELOCITY_THRESHOLD) {
    return "next";
  }

  if (offsetX >= SWIPE_THRESHOLD || velocity >= VELOCITY_THRESHOLD) {
    return "prev";
  }

  return null;
}

type MenuPageProps = {
  page: MenuBookPage;
  variant: "left" | "right" | "single";
  empty?: boolean;
};

function MenuPage({ page, variant, empty = false }: MenuPageProps) {
  const pageClassName = [
    styles.page,
    variant === "left" ? styles.pageLeft : "",
    variant === "right" ? styles.pageRight : "",
    variant === "single" ? styles.pageSingle : "",
    empty ? styles.pageEmpty : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (empty) {
    return <div className={pageClassName} aria-hidden />;
  }

  return (
    <div className={pageClassName}>
      <div className={styles.pageScene}>
        <span className={styles.pagePaperTexture} aria-hidden />
        <span className={styles.pageThickness} aria-hidden />
        <img
          src={page.src}
          alt={page.alt}
          className={styles.pageImage}
          draggable={false}
        />
        {typeof page.price === "number" ? (
          <span className={styles.pagePriceBadge} aria-hidden="true">
            {formatMenuPrice(page.price)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type MenuSpreadProps = {
  leftPageIndex: number;
  layout: Layout;
};

function MenuSpread({ leftPageIndex, layout }: MenuSpreadProps) {
  const leftPage = getMenuBookPage(leftPageIndex);
  const rightPage = layout.isMobile
    ? null
    : (MENU_BOOK_PAGES[leftPageIndex + 1] ?? null);

  return (
    <div className={styles.spread}>
      <MenuPage
        page={leftPage}
        variant={layout.isMobile ? "single" : "left"}
      />
      {!layout.isMobile ? (
        <MenuPage
          page={rightPage ?? leftPage}
          variant="right"
          empty={!rightPage}
        />
      ) : null}
    </div>
  );
}

type TransitionLayerProps = MenuSpreadProps & {
  role: "outgoing" | "incoming";
  direction: PageDirection;
};

function TransitionLayer({
  role,
  direction,
  leftPageIndex,
  layout,
}: TransitionLayerProps) {
  return (
    <div
      className={styles.spreadLayer}
      data-role={role}
      data-direction={direction}
    >
      <span className={styles.pageTransitionShadow} aria-hidden />
      <span className={styles.pageTransitionEdge} aria-hidden />
      <MenuSpread leftPageIndex={leftPageIndex} layout={layout} />
    </div>
  );
}

export default function MenuBook() {
  const bookViewRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const dragVelocityRef = useRef(0);
  const lastDragSampleRef = useRef({ x: 0, time: 0 });
  const transitionTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] =
    useState<PageDirection | null>(null);
  const [transitionTargetPage, setTransitionTargetPage] = useState<number | null>(
    null,
  );
  const [cartSummary, setCartSummary] = useState({ count: 0, amount: 0 });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === "undefined") {
        return;
      }

      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const footerHeight = isMobile ? 210 : 236;
      const metaHeight = 52;
      const verticalPadding = isMobile ? 16 : 24;
      const horizontalPadding = 28;
      const maxPageWidth = isMobile ? 380 : 360;

      const maxPageHeight = Math.max(
        180,
        viewportHeight - footerHeight - metaHeight - verticalPadding,
      );
      const contentWidth = window.innerWidth - horizontalPadding;
      const pageWidth = Math.floor(
        Math.min(
          isMobile ? contentWidth : contentWidth / 2,
          maxPageWidth,
          maxPageHeight,
        ),
      );
      const size = Math.max(200, pageWidth);

      setLayout({
        isMobile,
        pageWidth: size,
        spreadWidth: isMobile ? size : size * 2,
      });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
      visualViewport?.removeEventListener("resize", updateLayout);
    };
  }, []);

  const applyDraftUpdate = useCallback((draft: ReservationDraft) => {
    setCartSummary(getCartSummary(draft));
    setCartItems(
      draft.items.filter((item) => Number(item.quantity || 0) > 0),
    );
  }, []);

  useEffect(() => {
    applyDraftUpdate(readDraft());
  }, [applyDraftUpdate]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }

      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const maxLeftPage = getMaxLeftPage(layout.isMobile);
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= maxLeftPage;
  const canGoPrev = !isFirstPage;
  const canGoNext = !isLastPage;

  const resolveTappedPageIndex = useCallback(
    (clientX: number): number => {
      const element = bookViewRef.current;
      if (!element || layout.isMobile) {
        return currentPage;
      }

      const rect = element.getBoundingClientRect();
      const relativeX = clientX - rect.left;

      if (relativeX <= rect.width / 2) {
        return currentPage;
      }

      return currentPage + 1 < MENU_BOOK_PAGES.length
        ? currentPage + 1
        : currentPage;
    },
    [currentPage, layout.isMobile],
  );

  const showToastMessage = useCallback((message: string, duration = 1000) => {
    setToast(message);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, duration);
  }, []);

  const showAddedToast = useCallback(() => {
    showToastMessage("✓ カートへ追加しました");
  }, [showToastMessage]);

  const changePageQuantity = useCallback(
    (pageIndex: number, delta: number) => {
      const page = getMenuBookPage(pageIndex);
      if (!isOrderableMenuBookPage(page)) {
        return;
      }

      const updated =
        delta > 0
          ? addMenuBookItemToDraft(page)
          : adjustMenuBookItemQuantity(page, delta);

      if (updated) {
        applyDraftUpdate(updated);
        if (delta > 0) {
          showAddedToast();
        }
      }
    },
    [applyDraftUpdate, showAddedToast],
  );

  const addPageToCart = useCallback(
    (pageIndex: number) => {
      changePageQuantity(pageIndex, 1);
    },
    [changePageQuantity],
  );

  const changeCartItemQuantity = useCallback(
    (itemId: string, delta: number) => {
      const pageIndex = MENU_BOOK_PAGES.findIndex((page) => page.id === itemId);
      if (pageIndex < 0) {
        return;
      }

      changePageQuantity(pageIndex, delta);
    },
    [changePageQuantity],
  );

  const changeCartItemRiceSize = useCallback(
    (itemId: string, riceSize: RiceSize) => {
      const updated = updateCartItemRiceSize(itemId, riceSize);
      if (updated) {
        applyDraftUpdate(updated);
      }
    },
    [applyDraftUpdate],
  );

  const startTransition = useCallback(
    (direction: PageDirection) => {
      if (isTransitioning) {
        return;
      }

      if (direction === "next" && !canGoNext) {
        return;
      }

      if (direction === "prev" && !canGoPrev) {
        return;
      }

      const targetPage = getTargetPageIndex(
        currentPage,
        direction,
        layout.isMobile,
      );

      if (targetPage === currentPage) {
        return;
      }

      setTransitionDirection(direction);
      setTransitionTargetPage(targetPage);
      setIsTransitioning(true);

      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = window.setTimeout(() => {
        setCurrentPage(targetPage);
        setIsTransitioning(false);
        setTransitionDirection(null);
        setTransitionTargetPage(null);
        transitionTimerRef.current = null;
      }, PAGE_TRANSITION_MS);
    },
    [canGoNext, canGoPrev, currentPage, isTransitioning, layout.isMobile],
  );

  const finishPointer = useCallback(
    (offsetX: number, clientX: number) => {
      activePointerIdRef.current = null;

      const direction = resolveSwipeDirection(offsetX, dragVelocityRef.current);
      dragVelocityRef.current = 0;
      lastDragSampleRef.current = { x: 0, time: 0 };

      if (direction === "next" && canGoNext) {
        startTransition("next");
        return;
      }

      if (direction === "prev" && canGoPrev) {
        startTransition("prev");
        return;
      }

      if (Math.abs(offsetX) < TAP_THRESHOLD) {
        addPageToCart(resolveTappedPageIndex(clientX));
      }
    },
    [
      addPageToCart,
      canGoNext,
      canGoPrev,
      resolveTappedPageIndex,
      startTransition,
    ],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button > 0 || isTransitioning) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragVelocityRef.current = 0;
    lastDragSampleRef.current = {
      x: event.clientX,
      time: performance.now(),
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      activePointerIdRef.current !== event.pointerId ||
      isTransitioning
    ) {
      return;
    }

    const now = performance.now();
    const elapsed = now - lastDragSampleRef.current.time;

    if (elapsed > 0) {
      dragVelocityRef.current =
        (event.clientX - lastDragSampleRef.current.x) / elapsed;
    }

    lastDragSampleRef.current = {
      x: event.clientX,
      time: now,
    };
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishPointer(event.clientX - dragStartXRef.current, event.clientX);
  };

  const bookViewClassName = [
    styles.bookView,
    layout.isMobile ? styles.bookViewSingle : styles.bookViewSpread,
  ]
    .filter(Boolean)
    .join(" ");

  const reserveHref = "/reserve/cart";

  const handleReserveClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    if (cartSummary.count <= 0) {
      event.preventDefault();
      showToastMessage("カートに商品が入っていません");
    }
  };

  const spreadProps = {
    layout,
  };

  return (
    <main className={styles.wrap}>
      <BrandLogo />

      {toast ? (
        <div className={styles.cartToast} role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <div className={styles.stage}>
        <div className={styles.bookColumn}>
          <div className={styles.bookRow}>
            <button
              type="button"
              className={styles.pageNavBtn}
              aria-label="前のページ"
              disabled={!canGoPrev || isTransitioning}
              onClick={() => startTransition("prev")}
            >
              ‹
            </button>

            <div
              className={styles.bookShell}
              style={{ width: layout.spreadWidth + 56 }}
            >
              <span
                className={styles.metalCorner}
                data-corner="tl"
                aria-hidden
              />
              <span
                className={styles.metalCorner}
                data-corner="tr"
                aria-hidden
              />
              <span
                className={styles.metalCorner}
                data-corner="bl"
                aria-hidden
              />
              <span
                className={styles.metalCorner}
                data-corner="br"
                aria-hidden
              />
              <span className={styles.bookStitch} aria-hidden />
              <span className={styles.bookCoverEdge} aria-hidden />
              <div
                ref={bookViewRef}
                className={bookViewClassName}
                style={{ width: layout.spreadWidth }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
              >
                <div
                  className={styles.spreadStage}
                  data-transitioning={isTransitioning ? "true" : undefined}
                  style={{
                    aspectRatio: layout.isMobile ? "1 / 1" : "2 / 1",
                  }}
                >
                  {isTransitioning &&
                  transitionDirection &&
                  transitionTargetPage !== null ? (
                    <>
                      <TransitionLayer
                        role="outgoing"
                        direction={transitionDirection}
                        leftPageIndex={currentPage}
                        {...spreadProps}
                      />
                      <TransitionLayer
                        role="incoming"
                        direction={transitionDirection}
                        leftPageIndex={transitionTargetPage}
                        {...spreadProps}
                      />
                    </>
                  ) : (
                    <MenuSpread
                      leftPageIndex={currentPage}
                      {...spreadProps}
                    />
                  )}
                </div>
              </div>
              {!layout.isMobile ? (
                <span className={styles.bookSpineGlow} aria-hidden />
              ) : null}
              <span className={styles.bookFloorShadow} aria-hidden />
            </div>

            <button
              type="button"
              className={styles.pageNavBtn}
              aria-label="次のページ"
              disabled={!canGoNext || isTransitioning}
              onClick={() => startTransition("next")}
            >
              ›
            </button>
          </div>

          <div className={styles.pageMeta}>
            <div className={styles.counter}>
              {currentPage + 1} / {MENU_BOOK_PAGES.length}
            </div>
            <p className={styles.swipeHint}>スワイプでページをめくれます</p>
            <p className={styles.swipeHint}>商品を押すとカートに追加できます</p>
          </div>
        </div>
      </div>

      <div
        className={styles.footerDock}
        style={{ maxWidth: layout.spreadWidth + 56 }}
      >
        <div className={styles.footerCartPanel}>
          {cartItems.length === 0 ? (
            <p className={styles.footerCartEmpty}>
              カートに商品が入っていません
            </p>
          ) : (
            <>
              <ul className={styles.footerCartList}>
                {cartItems.map((item) => (
                  <li key={item.id} className={styles.footerCartItem}>
                    <div className={styles.footerCartRow}>
                      <span className={styles.footerCartName}>
                        {item.name} ×{Number(item.quantity || 0)}
                      </span>
                      <div className={styles.footerCartQty}>
                        <button
                          type="button"
                          className={styles.footerCartQtyBtn}
                          aria-label={`${item.name}の数量を減らす`}
                          onClick={() => changeCartItemQuantity(item.id, -1)}
                        >
                          −
                        </button>
                        <span className={styles.footerCartQtyValue}>
                          {Number(item.quantity || 0)}
                        </span>
                        <button
                          type="button"
                          className={styles.footerCartQtyBtn}
                          aria-label={`${item.name}の数量を増やす`}
                          onClick={() => changeCartItemQuantity(item.id, 1)}
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                    {isBentoCartItem(item) ? (
                      <div className={styles.footerCartRiceRow}>
                        <span className={styles.footerCartRiceLabel}>ご飯：</span>
                        {RICE_SIZE_OPTIONS.map((riceSize) => (
                          <button
                            key={riceSize}
                            type="button"
                            className={styles.footerCartRiceBtn}
                            data-selected={
                              getCartItemRiceSize(item) === riceSize
                                ? "true"
                                : undefined
                            }
                            aria-label={`${item.name}のご飯量を${riceSize}に変更`}
                            aria-pressed={getCartItemRiceSize(item) === riceSize}
                            onClick={() =>
                              changeCartItemRiceSize(item.id, riceSize)
                            }
                          >
                            {riceSize}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className={styles.footerCartTotal}>
                現在のカート：{cartSummary.count}点 / ¥
                {cartSummary.amount.toLocaleString("ja-JP")}
              </p>
            </>
          )}
        </div>
        <div className={styles.footerActions}>
          <a href={`tel:${PHONE_NUMBER}`} className={styles.footerBtn}>
            <PhoneIcon />
            <span>
              {layout.isMobile
                ? "電話する"
                : `電話する ${PHONE_DISPLAY}`}
            </span>
          </a>
          <Link
            href={reserveHref}
            className={styles.footerBtn}
            onClick={handleReserveClick}
          >
            <CartIcon />
            <span>ランチ予約へ</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
