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
const DRAG_THRESHOLD = 72;
const MAX_DRAG = 148;
const PHONE_NUMBER = "0484415517";

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

const SNAPBACK_MS = 380;

function getViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getMaxLeftPage(isMobile: boolean): number {
  if (isMobile) {
    return MENU_PAGES.length - 1;
  }

  return MENU_PAGES.length % 2 === 1
    ? MENU_PAGES.length - 1
    : MENU_PAGES.length - 2;
}

function getLayout(): Layout {
  if (typeof window === "undefined") {
    return { isMobile: true, pageWidth: 320, spreadWidth: 320 };
  }

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const viewportHeight = getViewportHeight();
  const footerHeight = 96;
  const counterHeight = 32;
  const verticalPadding = 24;
  const navSpace = isMobile ? 84 : 100;
  const horizontalPadding = 24;
  const maxPageWidth = isMobile ? 360 : 340;

  const maxPageHeight = Math.max(
    160,
    viewportHeight - footerHeight - counterHeight - verticalPadding,
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

  return {
    isMobile,
    pageWidth: size,
    spreadWidth: isMobile ? size : size * 2,
  };
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
  if (offset <= -6) {
    return "next";
  }

  if (offset >= 6) {
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

  const showTurningPage =
    turn.isTarget && (turn.progress > 0 || turn.settling) && turn.direction;

  return (
    <div
      className={pageClassName}
      style={pageStyle}
      data-dragging={turn.dragging ? "true" : undefined}
      data-settling={turn.settling ? "true" : undefined}
      data-direction={turn.isTarget ? turn.direction ?? undefined : undefined}
      data-turning={showTurningPage ? "true" : undefined}
    >
      {!empty ? (
        <div className={styles.pageScene}>
          <span className={styles.pageDropShadow} aria-hidden />
          <span className={styles.pageFallShadow} aria-hidden />
          <img
            src={page.src}
            alt={page.alt}
            className={styles.pageImage}
            draggable={false}
          />
          {showTurningPage ? (
            <div
              className={styles.turningPage}
              data-direction={turn.direction ?? undefined}
              aria-hidden
            >
              <div className={styles.turningPageInner}>
                <img
                  src={page.src}
                  alt=""
                  className={styles.turningGhost}
                  draggable={false}
                />
              </div>
            </div>
          ) : null}
          <span className={styles.pageCurl} aria-hidden />
        </div>
      ) : null}
    </div>
  );
}

export default function MenuBook() {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const pendingDragOffsetRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const snapBackTimerRef = useRef<number | null>(null);
  const snapBackDirectionRef = useRef<DragDirection>(null);
  const [layout, setLayout] = useState<Layout>({
    isMobile: true,
    pageWidth: 320,
    spreadWidth: 320,
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [animDirection, setAnimDirection] = useState<DragDirection>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSnapBack, setIsSnapBack] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      requestAnimationFrame(() => {
        setLayout(getLayout());
      });
    };

    updateLayout();

    const stage = stageRef.current;
    const resizeObserver =
      stage && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateLayout)
        : null;

    if (stage) {
      resizeObserver?.observe(stage);
    }

    window.addEventListener("resize", updateLayout);
    window.visualViewport?.addEventListener("resize", updateLayout);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLayout);
      window.visualViewport?.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    if (!animDirection) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAnimDirection(null);
    }, 680);

    return () => {
      window.clearTimeout(timer);
    };
  }, [animDirection, currentPage]);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
      }

      if (snapBackTimerRef.current !== null) {
        window.clearTimeout(snapBackTimerRef.current);
      }
    };
  }, []);

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

  const flushDragOffset = useCallback(() => {
    dragRafRef.current = null;

    if (pendingDragOffsetRef.current !== null) {
      setDragOffset(pendingDragOffsetRef.current);
      pendingDragOffsetRef.current = null;
    }
  }, []);

  const scheduleDragOffset = useCallback(
    (offset: number) => {
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
    const nextPage = layout.isMobile
      ? Math.max(0, currentPage - 1)
      : Math.max(0, currentPage - 2);

    if (nextPage === currentPage) {
      return;
    }

    setAnimDirection("prev");
    setCurrentPage(nextPage);
  }, [currentPage, layout.isMobile]);

  const goNext = useCallback(() => {
    const nextPage = layout.isMobile
      ? Math.min(maxLeftPage, currentPage + 1)
      : Math.min(maxLeftPage, currentPage + 2);

    if (nextPage === currentPage) {
      return;
    }

    setAnimDirection("next");
    setCurrentPage(nextPage);
  }, [currentPage, layout.isMobile, maxLeftPage]);

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

      if (offsetX <= -DRAG_THRESHOLD && canGoNext) {
        setDragOffset(0);
        goNext();
        return;
      }

      if (offsetX >= DRAG_THRESHOLD && canGoPrev) {
        setDragOffset(0);
        goPrev();
        return;
      }

      if (offsetX === 0) {
        setDragOffset(0);
        return;
      }

      beginSnapBack(getDragDirection(offsetX));
    },
    [beginSnapBack, canGoNext, canGoPrev, goNext, goPrev],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (animDirection || event.button > 0) {
      return;
    }

    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }

    pendingDragOffsetRef.current = null;
    setIsSnapBack(false);
    snapBackDirectionRef.current = null;

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    setAnimDirection(null);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
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

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag(getReleaseOffset(event.clientX));
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
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
  const activeDirection = isSnapBack
    ? snapBackDirectionRef.current
    : dragDirection;
  const dragProgress = getDragProgress(dragOffset);
  const isDragActive = isDragging || dragOffset !== 0 || isSnapBack;

  const buildTurnState = (
    variant: "left" | "right" | "single",
  ): PageTurnState => {
    const isTarget = isPageTurnTarget(
      variant,
      activeDirection,
      layout.isMobile,
      hasRightPage,
    );
    const progress = isTarget ? dragProgress : 0;
    const settling = isSnapBack && isTarget;

    return {
      progress,
      direction: isTarget ? activeDirection : null,
      dragging: isDragging && isTarget,
      settling,
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

  const spreadClassName = [
    styles.spread,
    isDragging ? styles.spreadDragging : "",
    !isDragActive && animDirection === "next" ? styles.spreadNext : "",
    !isDragActive && animDirection === "prev" ? styles.spreadPrev : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1>グランドメニュー</h1>
        <p>左右スワイプまたはボタンでページをめくれます</p>
      </header>

      <div className={styles.stage} ref={stageRef}>
        <div className={styles.bookArea}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goPrev}
            disabled={isFirstPage}
            aria-label="前のページ"
          >
            ‹
          </button>

          <div className={styles.bookColumn}>
            <div
              className={bookViewClassName}
              style={{ width: layout.spreadWidth }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div className={spreadClassName} key={currentPage}>
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

            <div className={styles.counter}>
              {currentPage + 1} / {MENU_PAGES.length}
            </div>
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={goNext}
            disabled={isLastPage}
            aria-label="次のページ"
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/" className={styles.reserveBtn}>
          ランチ予約へ
        </Link>
        <a href={`tel:${PHONE_NUMBER}`} className={styles.telBtn}>
          電話する
        </a>
      </div>
    </main>
  );
}
