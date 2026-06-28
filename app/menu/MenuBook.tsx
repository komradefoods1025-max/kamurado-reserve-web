"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
const TAP_HINT_STORAGE_KEY = "kamurado-menu-tap-hint-seen";
const SOUND_ENABLED_STORAGE_KEY = "kamurado-menu-sound-enabled";
const PAGE_FLIP_SOUND_SRC = "/sounds/page-flip.mp3";
const PAGE_FLIP_VOLUME = 0.08;
const CART_FLY_MS = 500;
const PAGE_PULSE_MS = 150;

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

function SoundToggleIcon({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <svg className={styles.soundToggleSvg} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 9v6h4l5 4V5L9 9H5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M16 9a4 4 0 0 1 0 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M18.5 6.5a7.5 7.5 0 0 1 0 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg className={styles.soundToggleSvg} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 9v6h4l5 4V5L9 9H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M18 9l-6 6M12 9l6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
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
  pageIndex: number;
  variant: "left" | "right" | "single";
  empty?: boolean;
  showTapHint?: boolean;
  tapHintFading?: boolean;
};

function MenuPage({
  page,
  pageIndex,
  variant,
  empty = false,
  showTapHint = false,
  tapHintFading = false,
}: MenuPageProps) {
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
          <span
            className={styles.pagePriceBadge}
            data-price-badge={page.id}
            aria-hidden="true"
          >
            {formatMenuPrice(page.price)}
          </span>
        ) : null}
        {showTapHint && isOrderableMenuBookPage(page) ? (
          <div
            className={styles.tapHintBubble}
            data-fading={tapHintFading ? "true" : undefined}
            data-page-index={pageIndex}
          >
            🛒 タップで追加
          </div>
        ) : null}
      </div>
    </div>
  );
}

type MenuSpreadProps = {
  leftPageIndex: number;
  layout: Layout;
  showTapHint?: boolean;
  tapHintFading?: boolean;
};

function MenuSpread({
  leftPageIndex,
  layout,
  showTapHint = false,
  tapHintFading = false,
}: MenuSpreadProps) {
  const leftPage = getMenuBookPage(leftPageIndex);
  const rightPage = layout.isMobile
    ? null
    : (MENU_BOOK_PAGES[leftPageIndex + 1] ?? null);

  const leftTapHint = showTapHint;

  return (
    <div className={styles.spread}>
      <MenuPage
        page={leftPage}
        pageIndex={leftPageIndex}
        variant={layout.isMobile ? "single" : "left"}
        showTapHint={leftTapHint}
        tapHintFading={tapHintFading}
      />
      {!layout.isMobile ? (
        <MenuPage
          page={rightPage ?? leftPage}
          pageIndex={leftPageIndex + 1}
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
  showTapHint,
  tapHintFading,
}: TransitionLayerProps) {
  return (
    <div
      className={styles.spreadLayer}
      data-role={role}
      data-direction={direction}
    >
      <span className={styles.pageTransitionShadow} aria-hidden />
      <span className={styles.pageTransitionEdge} aria-hidden />
      <MenuSpread
        leftPageIndex={leftPageIndex}
        layout={layout}
        showTapHint={showTapHint}
        tapHintFading={tapHintFading}
      />
    </div>
  );
}

type CartFlyParticle = {
  id: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
};

export default function MenuBook() {
  const bookViewRef = useRef<HTMLDivElement>(null);
  const footerCartPanelRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const dragVelocityRef = useRef(0);
  const lastDragSampleRef = useRef({ x: 0, time: 0 });
  const transitionTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const tapHintTimerRef = useRef<number | null>(null);
  const flyIdRef = useRef(0);
  const skipPagePulseRef = useRef(true);
  const pageFlipAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

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
  const [showTapHint, setShowTapHint] = useState(false);
  const [tapHintFading, setTapHintFading] = useState(false);
  const [pagePulse, setPagePulse] = useState(false);
  const [cartSummaryPulse, setCartSummaryPulse] = useState(false);
  const [footerBounce, setFooterBounce] = useState(false);
  const [flyItems, setFlyItems] = useState<CartFlyParticle[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === "undefined") {
        return;
      }

      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const footerHeight = isMobile ? 210 : 236;
      const metaHeight = 88;
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
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
    if (stored === "0") {
      setSoundEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.localStorage.getItem(TAP_HINT_STORAGE_KEY)) {
      return;
    }

    setShowTapHint(true);

    tapHintTimerRef.current = window.setTimeout(() => {
      setTapHintFading(true);
    }, 2500);

    const hideTimer = window.setTimeout(() => {
      setShowTapHint(false);
      window.localStorage.setItem(TAP_HINT_STORAGE_KEY, "1");
    }, 3000);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (isTransitioning) {
      return;
    }

    if (skipPagePulseRef.current) {
      skipPagePulseRef.current = false;
      return;
    }

    setPagePulse(true);
    const timer = window.setTimeout(() => {
      setPagePulse(false);
    }, PAGE_PULSE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentPage, isTransitioning]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }

      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }

      if (tapHintTimerRef.current !== null) {
        window.clearTimeout(tapHintTimerRef.current);
      }
    };
  }, []);

  const maxLeftPage = getMaxLeftPage(layout.isMobile);
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= maxLeftPage;
  const canGoPrev = !isFirstPage;
  const canGoNext = !isLastPage;

  const resolveTappedPage = useCallback(
    (clientX: number): MenuBookPage => {
      if (layout.isMobile) {
        return getMenuBookPage(currentPage);
      }

      const element = bookViewRef.current;
      if (!element) {
        return getMenuBookPage(currentPage);
      }

      const rect = element.getBoundingClientRect();
      const relativeX = clientX - rect.left;

      if (relativeX <= rect.width / 2) {
        return getMenuBookPage(currentPage);
      }

      return currentPage + 1 < MENU_BOOK_PAGES.length
        ? getMenuBookPage(currentPage + 1)
        : getMenuBookPage(currentPage);
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

  const ensurePageFlipAudio = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!pageFlipAudioRef.current) {
      const audio = new Audio(PAGE_FLIP_SOUND_SRC);
      audio.preload = "none";
      audio.volume = PAGE_FLIP_VOLUME;
      pageFlipAudioRef.current = audio;
    }

    return pageFlipAudioRef.current;
  }, []);

  const unlockPageFlipAudio = useCallback(() => {
    if (audioUnlockedRef.current) {
      return;
    }

    const audio = ensurePageFlipAudio();
    if (!audio) {
      return;
    }

    audioUnlockedRef.current = true;

    try {
      audio.load();
    } catch {
      // Ignore environments that cannot load audio.
    }
  }, [ensurePageFlipAudio]);

  const playPageFlipSound = useCallback(() => {
    if (!soundEnabled || !audioUnlockedRef.current) {
      return;
    }

    const audio = pageFlipAudioRef.current;
    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {
      // Ignore environments that cannot play audio.
    }
  }, [soundEnabled]);

  const toggleSoundEnabled = useCallback(() => {
    setSoundEnabled((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          SOUND_ENABLED_STORAGE_KEY,
          next ? "1" : "0",
        );
      }
      return next;
    });
  }, []);

  const triggerCartSummaryPulse = useCallback(() => {
    setCartSummaryPulse(true);
    window.setTimeout(() => {
      setCartSummaryPulse(false);
    }, 420);
  }, []);

  const launchCartFly = useCallback(
    (page: MenuBookPage) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const bookView = bookViewRef.current;
          const footerPanel = footerCartPanelRef.current;
          if (!bookView || !footerPanel) {
            triggerCartSummaryPulse();
            return;
          }

          const badge = bookView.querySelector(
            `[data-price-badge="${page.id}"]`,
          ) as HTMLElement | null;
          const bookRect = bookView.getBoundingClientRect();
          const badgeRect = badge?.getBoundingClientRect();
          const startX = badgeRect
            ? badgeRect.left + badgeRect.width / 2
            : bookRect.right - bookRect.width * 0.12;
          const startY = badgeRect
            ? badgeRect.top + badgeRect.height / 2
            : bookRect.top + bookRect.height * 0.12;
          const footerRect = footerPanel.getBoundingClientRect();
          const endX = footerRect.left + footerRect.width / 2;
          const endY = footerRect.top + Math.min(28, footerRect.height * 0.35);

          const id = ++flyIdRef.current;
          setFlyItems((current) => [
            ...current,
            {
              id,
              startX,
              startY,
              deltaX: endX - startX,
              deltaY: endY - startY,
            },
          ]);

          window.setTimeout(() => {
            setFlyItems((current) => current.filter((item) => item.id !== id));
            triggerCartSummaryPulse();
            setFooterBounce(true);
            window.setTimeout(() => {
              setFooterBounce(false);
            }, 360);
          }, CART_FLY_MS);
        });
      });
    },
    [triggerCartSummaryPulse],
  );

  const changePageQuantity = useCallback(
    (page: MenuBookPage, delta: number) => {
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
          launchCartFly(page);
          showAddedToast();
        }
      }
    },
    [applyDraftUpdate, launchCartFly, showAddedToast],
  );

  const addPageToCart = useCallback(
    (page: MenuBookPage) => {
      changePageQuantity(page, 1);
    },
    [changePageQuantity],
  );

  const changeCartItemQuantity = useCallback(
    (itemId: string, delta: number) => {
      const page = MENU_BOOK_PAGES.find((entry) => entry.id === itemId);
      if (!page) {
        return;
      }

      changePageQuantity(page, delta);
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
      playPageFlipSound();

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
    [canGoNext, canGoPrev, currentPage, isTransitioning, layout.isMobile, playPageFlipSound],
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
        addPageToCart(resolveTappedPage(clientX));
      }
    },
    [
      addPageToCart,
      canGoNext,
      canGoPrev,
      resolveTappedPage,
      startTransition,
    ],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button > 0 || isTransitioning) {
      return;
    }

    unlockPageFlipAudio();
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

  const handlePageNavClick = (direction: PageDirection) => {
    unlockPageFlipAudio();
    startTransition(direction);
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
    showTapHint,
    tapHintFading,
  };

  return (
    <main className={styles.wrap}>
      <BrandLogo />

      {flyItems.map((item) => (
        <span
          key={item.id}
          className={styles.cartFlyParticle}
          aria-hidden="true"
          style={
            {
              "--fly-start-x": `${item.startX}px`,
              "--fly-start-y": `${item.startY}px`,
              "--fly-dx": `${item.deltaX}px`,
              "--fly-dy": `${item.deltaY}px`,
            } as CSSProperties
          }
        >
          🛒
        </span>
      ))}

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
              onClick={() => handlePageNavClick("prev")}
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
                  data-pulse={pagePulse ? "true" : undefined}
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
              onClick={() => handlePageNavClick("next")}
            >
              ›
            </button>
          </div>

          <div className={styles.pageMeta}>
            <div className={styles.pageMetaTop}>
              <div className={styles.counter}>
                {currentPage + 1} / {MENU_BOOK_PAGES.length}
              </div>
              <button
                type="button"
                className={styles.soundToggleBtn}
                aria-label={
                  soundEnabled
                    ? "ページめくり音をオフにする"
                    : "ページめくり音をオンにする"
                }
                aria-pressed={soundEnabled}
                onClick={() => {
                  unlockPageFlipAudio();
                  toggleSoundEnabled();
                }}
              >
                <SoundToggleIcon enabled={soundEnabled} />
              </button>
            </div>
            <div className={styles.guideRow}>
              <div className={styles.swipeHintAnim} aria-hidden="true">
                <span className={styles.swipeTrack} />
                <span className={styles.swipeFinger}>👆</span>
              </div>
              <div className={styles.guideText}>
                <p className={styles.guideLine}>スワイプでページをめくれます</p>
                <p className={styles.guideLine}>
                  🛒 商品をタップするとカートへ追加されます
                </p>
              </div>
              <div
                className={`${styles.swipeHintAnim} ${styles.swipeHintAnimMirror}`}
                aria-hidden="true"
              >
                <span className={styles.swipeTrack} />
                <span className={styles.swipeFinger}>👆</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={styles.footerDock}
        style={{ maxWidth: layout.spreadWidth + 56 }}
      >
        <div
          ref={footerCartPanelRef}
          className={styles.footerCartPanel}
          data-bounce={footerBounce ? "true" : undefined}
        >
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
              <p
                className={styles.footerCartTotal}
                data-pulse={cartSummaryPulse ? "true" : undefined}
              >
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
