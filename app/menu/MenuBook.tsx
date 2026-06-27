"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const MENU_PAGES = Array.from({ length: 11 }, (_, index) => {
  const pageNumber = String(index + 1).padStart(2, "0");
  return {
    src: `/menu/${pageNumber}.jpg`,
    alt: `メニュー ${index + 1}ページ`,
  };
});

const MOBILE_BREAKPOINT = 768;
const SWIPE_THRESHOLD = 48;

type Layout = {
  isMobile: boolean;
  pageWidth: number;
  spreadWidth: number;
};

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

export default function MenuBook() {
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [layout, setLayout] = useState<Layout>({
    isMobile: true,
    pageWidth: 320,
    spreadWidth: 320,
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [animDirection, setAnimDirection] = useState<"next" | "prev" | null>(
    null,
  );

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
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [animDirection, currentPage]);

  const maxLeftPage = getMaxLeftPage(layout.isMobile);
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= maxLeftPage;

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

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!layout.isMobile || touchStartX.current === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (delta <= -SWIPE_THRESHOLD) {
      goNext();
      return;
    }

    if (delta >= SWIPE_THRESHOLD) {
      goPrev();
    }
  };

  const rightPage = layout.isMobile ? null : MENU_PAGES[currentPage + 1];
  const spreadClassName = [
    styles.spread,
    animDirection === "next" ? styles.spreadNext : "",
    animDirection === "prev" ? styles.spreadPrev : "",
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
              className={styles.bookView}
              style={{
                width: layout.spreadWidth,
                ["--page-max-width" as string]: `${layout.pageWidth}px`,
                ["--page-max-height" as string]: `${layout.pageWidth}px`,
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className={spreadClassName} key={currentPage}>
                <div className={styles.page}>
                  <img
                    src={MENU_PAGES[currentPage].src}
                    alt={MENU_PAGES[currentPage].alt}
                    className={styles.pageImage}
                    draggable={false}
                  />
                </div>

                {!layout.isMobile && (
                  <div
                    className={`${styles.page} ${styles.pageRight} ${
                      rightPage ? "" : styles.pageEmpty
                    }`}
                  >
                    {rightPage ? (
                      <img
                        src={rightPage.src}
                        alt={rightPage.alt}
                        className={styles.pageImage}
                        draggable={false}
                      />
                    ) : null}
                  </div>
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
        <a href="tel:0480000000" className={styles.telBtn}>
          電話する
        </a>
      </div>
    </main>
  );
}
