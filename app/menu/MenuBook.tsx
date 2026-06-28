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
import styles from "./page.module.css";

const MENU_PAGES = Array.from({ length: 11 }, (_, index) => {
  const pageNumber = String(index + 1).padStart(2, "0");
  return {
    src: `/menu/${pageNumber}.jpg`,
    alt: `メニュー ${index + 1}ページ`,
  };
});

const MOBILE_BREAKPOINT = 768;
const PHONE_NUMBER = "0484415517";
const MAX_DRAG = 148;
const TURN_THRESHOLD = 0.35;
const VELOCITY_THRESHOLD = 0.42;
const SNAPBACK_MS = 380;
const COMPLETE_TURN_MS = 320;
const STRIP_COUNT = 10;

type Layout = {
  isMobile: boolean;
  pageWidth: number;
  spreadWidth: number;
};

type DragDirection = "next" | "prev" | null;

type PageTurnState = {
  progress: number;
  direction: DragDirection;
  dragging: boolean;
  settling: boolean;
  isTarget: boolean;
};

const DEFAULT_LAYOUT: Layout = {
  isMobile: true,
  pageWidth: 320,
  spreadWidth: 320,
};

function CalendarIcon() {
  return (
    <svg className={styles.btnSvg} viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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
  return (
    <div className={styles.logoArea}>
      <p className={styles.logoSub}>鉄板焼きダイニング</p>
      <div className={styles.logoMainRow}>
        <span className={styles.logoMain}>かむらど</span>
        <span className={styles.logoSeal} aria-hidden="true" />
      </div>
    </div>
  );
}

function getMaxLeftPage(isMobile: boolean): number {
  if (isMobile) {
    return MENU_PAGES.length - 1;
  }

  return MENU_PAGES.length % 2 === 1
    ? MENU_PAGES.length - 1
    : MENU_PAGES.length - 2;
}

function clampDragOffset(
  offset: number,
  canGoPrev: boolean,
  canGoNext: boolean,
): number {
  let clamped = offset;

  if (!canGoPrev && clamped > 0) {
    clamped *= 0.22;
  }

  if (!canGoNext && clamped < 0) {
    clamped *= 0.22;
  }

  return Math.max(-MAX_DRAG, Math.min(MAX_DRAG, clamped));
}

function getDragProgress(offset: number): number {
  return Math.min(1, Math.abs(offset) / MAX_DRAG);
}

function getDragDirection(offset: number): DragDirection {
  if (offset <= -8) {
    return "next";
  }

  if (offset >= 8) {
    return "prev";
  }

  return null;
}

function isPageTurnTarget(
  variant: "left" | "right" | "single",
  direction: DragDirection,
  isMobile: boolean,
  hasRightPage: boolean,
): boolean {
  if (!direction) {
    return false;
  }

  if (isMobile) {
    return true;
  }

  if (direction === "next") {
    return hasRightPage ? variant === "right" : variant === "left";
  }

  return variant === "left";
}

function getStripLocal(
  index: number,
  count: number,
  progress: number,
  direction: "next" | "prev",
): number {
  const t = (index + 0.5) / count;

  if (direction === "next") {
    const foldStart = 1 - progress;
    if (progress <= 0 || t < foldStart) {
      return 0;
    }
    return (t - foldStart) / Math.max(0.001, 1 - foldStart);
  }

  const foldEnd = progress;
  if (progress <= 0 || t > foldEnd) {
    return 0;
  }
  return (foldEnd - t) / Math.max(0.001, foldEnd);
}

type CurlStripsProps = {
  page: (typeof MENU_PAGES)[number];
  direction: "next" | "prev";
  progress: number;
};

function CurlStrips({ page, direction, progress }: CurlStripsProps) {
  return (
    <div className={styles.curlLayer} data-direction={direction} aria-hidden>
      <span className={styles.curlRootShadow} />
      <span className={styles.curlHighlight} />
      {Array.from({ length: STRIP_COUNT }, (_, index) => {
        const local = getStripLocal(index, STRIP_COUNT, progress, direction);
        const rotateY = direction === "next" ? -local * 88 : local * 88;
        const translateX = direction === "next" ? -local * 7 : local * 7;
        const scaleY = 1 + local * 0.04;
        const stripStyle: CSSProperties = {
          left: `${(index / STRIP_COUNT) * 100}%`,
          width: `${100 / STRIP_COUNT}%`,
          zIndex: index + 1,
          transform: `perspective(900px) rotateY(${rotateY}deg) translateX(${translateX}px) scaleY(${scaleY})`,
          transformOrigin:
            direction === "next" ? "left center" : "right center",
          opacity: local > 0 ? 1 : 0,
          pointerEvents: "none",
        };

        return (
          <div key={index} className={styles.curlStrip} style={stripStyle}>
            <div className={styles.curlStripFace}>
              <img
                src={page.src}
                alt=""
                className={styles.curlStripGhost}
                style={{
                  width: `${STRIP_COUNT * 100}%`,
                  left: `${-index * 100}%`,
                }}
                draggable={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type MenuPageProps = {
  page: (typeof MENU_PAGES)[number];
  variant: "left" | "right" | "single";
  empty?: boolean;
  turn: PageTurnState;
};

function MenuPage({ page, variant, empty = false, turn }: MenuPageProps) {
  const pageClassName = [
    styles.page,
    variant === "left" ? styles.pageLeft : "",
    variant === "right" ? styles.pageRight : "",
    variant === "single" ? styles.pageSingle : "",
    empty ? styles.pageEmpty : "",
  ]
    .filter(Boolean)
    .join(" ");

  const pageStyle: CSSProperties | undefined = turn.isTarget
    ? { ["--turn-progress" as string]: String(turn.progress) }
    : undefined;

  const showCurl =
    turn.isTarget &&
    (turn.progress > 0 || turn.settling) &&
    turn.direction;

  if (empty) {
    return <div className={pageClassName} aria-hidden />;
  }

  return (
    <div
      className={pageClassName}
      style={pageStyle}
      data-dragging={turn.dragging ? "true" : undefined}
      data-settling={turn.settling ? "true" : undefined}
      data-direction={turn.isTarget ? turn.direction ?? undefined : undefined}
      data-turning={showCurl ? "true" : undefined}
    >
      <span className={styles.pageCornerOrnament} data-corner="tl" aria-hidden />
      <span className={styles.pageCornerOrnament} data-corner="tr" aria-hidden />
      <span className={styles.pageCornerOrnament} data-corner="bl" aria-hidden />
      <span className={styles.pageCornerOrnament} data-corner="br" aria-hidden />
      <div className={styles.pageScene}>
        <span className={styles.pagePaperTexture} aria-hidden />
        <span className={styles.pageThickness} aria-hidden />
        <span className={styles.pageDropShadow} aria-hidden />
        <span className={styles.pageFallShadow} aria-hidden />
        <img
          src={page.src}
          alt={page.alt}
          className={styles.pageImage}
          draggable={false}
        />
        {showCurl && turn.direction ? (
          <CurlStrips
            page={page}
            direction={turn.direction}
            progress={turn.progress}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function MenuBook() {
  const dragStartXRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const pendingDragOffsetRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const snapBackTimerRef = useRef<number | null>(null);
  const completeTurnTimerRef = useRef<number | null>(null);
  const snapBackDirectionRef = useRef<DragDirection>(null);
  const completeTurnDirectionRef = useRef<DragDirection>(null);
  const dragVelocityRef = useRef(0);
  const lastDragSampleRef = useRef({ offset: 0, time: 0 });

  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSnapBack, setIsSnapBack] = useState(false);
  const [isCompletingTurn, setIsCompletingTurn] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === "undefined") {
        return;
      }

      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const footerHeight = 112;
      const logoHeight = 72;
      const dotsHeight = 44;
      const verticalPadding = 20;
      const navBtnWidth = isMobile ? 32 : 36;
      const navGap = isMobile ? 6 : 10;
      const bookShellExtra = 28;
      const bookAreaPadding = isMobile ? 16 : 0;
      const navSpace = isMobile
        ? navBtnWidth * 2 + navGap * 2 + bookShellExtra
        : 108;
      const horizontalPadding = 24 + bookAreaPadding;
      const maxPageWidth = isMobile ? 360 : 340;

      const maxPageHeight = Math.max(
        160,
        viewportHeight -
          footerHeight -
          logoHeight -
          dotsHeight -
          verticalPadding,
      );
      const contentWidth = window.innerWidth - horizontalPadding - navSpace;
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

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
      }

      if (snapBackTimerRef.current !== null) {
        window.clearTimeout(snapBackTimerRef.current);
      }

      if (completeTurnTimerRef.current !== null) {
        window.clearTimeout(completeTurnTimerRef.current);
      }
    };
  }, []);

  const flushDragOffset = useCallback(() => {
    dragRafRef.current = null;

    if (pendingDragOffsetRef.current !== null) {
      setDragOffset(pendingDragOffsetRef.current);
      pendingDragOffsetRef.current = null;
    }
  }, []);

  const scheduleDragOffset = useCallback(
    (offset: number) => {
      const now = performance.now();
      const last = lastDragSampleRef.current;
      const elapsed = now - last.time;

      if (elapsed > 0) {
        dragVelocityRef.current = (offset - last.offset) / elapsed;
      }

      lastDragSampleRef.current = { offset, time: now };
      pendingDragOffsetRef.current = offset;

      if (dragRafRef.current === null) {
        dragRafRef.current = requestAnimationFrame(flushDragOffset);
      }
    },
    [flushDragOffset],
  );

  const maxLeftPage = getMaxLeftPage(layout.isMobile);
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= maxLeftPage;
  const canGoPrev = !isFirstPage;
  const canGoNext = !isLastPage;

  const goPrev = useCallback(() => {
    setCurrentPage((page) => {
      const step = layout.isMobile ? 1 : 2;
      return Math.max(0, page - step);
    });
  }, [layout.isMobile]);

  const goNext = useCallback(() => {
    setCurrentPage((page) => {
      const step = layout.isMobile ? 1 : 2;
      const maxPage = getMaxLeftPage(layout.isMobile);
      return Math.min(maxPage, page + step);
    });
  }, [layout.isMobile]);

  const goToPage = useCallback(
    (index: number) => {
      if (isCompletingTurn) {
        return;
      }

      if (layout.isMobile) {
        setCurrentPage(Math.min(index, maxLeftPage));
        return;
      }

      const leftIndex = index % 2 === 0 ? index : Math.max(0, index - 1);
      setCurrentPage(Math.min(leftIndex, maxLeftPage));
    },
    [isCompletingTurn, layout.isMobile, maxLeftPage],
  );

  const beginSnapBack = useCallback((direction: DragDirection) => {
    if (!direction) {
      setDragOffset(0);
      return;
    }

    snapBackDirectionRef.current = direction;
    setIsSnapBack(true);

    if (snapBackTimerRef.current !== null) {
      window.clearTimeout(snapBackTimerRef.current);
    }

    snapBackTimerRef.current = window.setTimeout(() => {
      setIsSnapBack(false);
      snapBackDirectionRef.current = null;
      snapBackTimerRef.current = null;
    }, SNAPBACK_MS + 40);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDragOffset(0);
      });
    });
  }, []);

  const beginCompleteTurn = useCallback(
    (direction: DragDirection) => {
      if (!direction) {
        return;
      }

      completeTurnDirectionRef.current = direction;
      setIsCompletingTurn(true);
      setDragOffset(direction === "next" ? -MAX_DRAG : MAX_DRAG);

      if (completeTurnTimerRef.current !== null) {
        window.clearTimeout(completeTurnTimerRef.current);
      }

      completeTurnTimerRef.current = window.setTimeout(() => {
        completeTurnDirectionRef.current = null;
        setIsCompletingTurn(false);
        setDragOffset(0);

        if (direction === "next") {
          goNext();
        } else {
          goPrev();
        }

        completeTurnTimerRef.current = null;
      }, COMPLETE_TURN_MS);
    },
    [goNext, goPrev],
  );

  const finishDrag = useCallback(
    (offsetX: number) => {
      activePointerIdRef.current = null;

      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }

      if (pendingDragOffsetRef.current !== null) {
        setDragOffset(pendingDragOffsetRef.current);
        pendingDragOffsetRef.current = null;
      }

      setIsDragging(false);
      setIsSnapBack(false);

      const direction = getDragDirection(offsetX);
      const progress = getDragProgress(offsetX);
      const velocity = dragVelocityRef.current;
      const shouldTurn =
        direction === "next"
          ? canGoNext &&
            (progress >= TURN_THRESHOLD || velocity <= -VELOCITY_THRESHOLD)
          : direction === "prev"
            ? canGoPrev &&
              (progress >= TURN_THRESHOLD || velocity >= VELOCITY_THRESHOLD)
            : false;

      dragVelocityRef.current = 0;
      lastDragSampleRef.current = { offset: 0, time: 0 };

      if (shouldTurn && direction) {
        beginCompleteTurn(direction);
        return;
      }

      if (offsetX === 0) {
        setDragOffset(0);
        return;
      }

      beginSnapBack(direction);
    },
    [beginCompleteTurn, beginSnapBack, canGoNext, canGoPrev],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button > 0 || isCompletingTurn) {
      return;
    }

    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }

    pendingDragOffsetRef.current = null;
    setIsSnapBack(false);
    snapBackDirectionRef.current = null;
    dragVelocityRef.current = 0;
    lastDragSampleRef.current = { offset: 0, time: performance.now() };

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      activePointerIdRef.current !== event.pointerId ||
      isCompletingTurn
    ) {
      return;
    }

    const offset = clampDragOffset(
      event.clientX - dragStartXRef.current,
      canGoPrev,
      canGoNext,
    );
    scheduleDragOffset(offset);
  };

  const getReleaseOffset = (clientX: number) =>
    clampDragOffset(clientX - dragStartXRef.current, canGoPrev, canGoNext);

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag(getReleaseOffset(event.clientX));
  };

  const rightPage = layout.isMobile ? null : MENU_PAGES[currentPage + 1];
  const hasRightPage = Boolean(rightPage);
  const dragDirection = getDragDirection(dragOffset);
  const activeDirection = isCompletingTurn
    ? completeTurnDirectionRef.current
    : isSnapBack
      ? snapBackDirectionRef.current
      : dragDirection;
  const dragProgress = getDragProgress(dragOffset);

  const buildTurnState = (
    variant: "left" | "right" | "single",
  ): PageTurnState => {
    const isTarget = isPageTurnTarget(
      variant,
      activeDirection,
      layout.isMobile,
      hasRightPage,
    );

    return {
      progress: isTarget ? dragProgress : 0,
      direction: isTarget ? activeDirection : null,
      dragging: isDragging && isTarget,
      settling: (isSnapBack || isCompletingTurn) && isTarget,
      isTarget,
    };
  };

  const bookViewClassName = [
    styles.bookView,
    layout.isMobile ? styles.bookViewSingle : styles.bookViewSpread,
    isDragging ? styles.bookViewDragging : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={styles.wrap}>
      <BrandLogo />

      <div className={styles.stage}>
        <div className={styles.bookArea}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goPrev}
            disabled={isFirstPage || isCompletingTurn}
            aria-label="前のページ"
          >
            ‹
          </button>

          <div className={styles.bookColumn}>
            <div
              className={styles.bookShell}
              style={{ width: layout.spreadWidth + 28 }}
            >
              <span className={styles.bookCoverEdge} aria-hidden />
              <span className={styles.bookGoldFrame} aria-hidden />
              <div
                className={bookViewClassName}
                style={{ width: layout.spreadWidth }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
              >
                <div className={styles.spread}>
                  <MenuPage
                    page={MENU_PAGES[currentPage]}
                    variant={layout.isMobile ? "single" : "left"}
                    turn={buildTurnState(layout.isMobile ? "single" : "left")}
                  />

                  {!layout.isMobile && (
                    <MenuPage
                      page={rightPage ?? MENU_PAGES[currentPage]}
                      variant="right"
                      empty={!rightPage}
                      turn={buildTurnState("right")}
                    />
                  )}
                </div>
              </div>
              {!layout.isMobile ? (
                <span className={styles.bookSpineGlow} aria-hidden />
              ) : null}
              <span className={styles.bookFloorShadow} aria-hidden />
            </div>

            <div
              className={styles.dots}
              role="tablist"
              aria-label="ページインジケーター"
            >
              {MENU_PAGES.map((page, index) => (
                <button
                  key={page.src}
                  type="button"
                  role="tab"
                  className={
                    index === currentPage
                      ? `${styles.dot} ${styles.dotActive}`
                      : styles.dot
                  }
                  aria-label={`${index + 1}ページ目`}
                  aria-selected={index === currentPage}
                  disabled={isCompletingTurn}
                  onClick={() => goToPage(index)}
                />
              ))}
            </div>

            <div className={styles.pageMeta}>
              <div className={styles.counter}>
                {currentPage + 1} / {MENU_PAGES.length}
              </div>
              <p className={styles.swipeHint}>スワイプでページをめくれます</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={goNext}
            disabled={isLastPage || isCompletingTurn}
            aria-label="次のページ"
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/" className={styles.reserveBtn}>
          <CalendarIcon />
          <span>ランチ予約へ</span>
        </Link>
        <a href={`tel:${PHONE_NUMBER}`} className={styles.telBtn}>
          <PhoneIcon />
          <span className={styles.telTitle}>電話する</span>
          <span className={styles.telNumber}>048-441-5517</span>
        </a>
      </div>
    </main>
  );
}
