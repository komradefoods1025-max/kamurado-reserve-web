"use client";

import Link from "next/link";
import { PageFlip } from "page-flip";
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
const PHONE_NUMBER = "0484415517";

type BookSize = {
  width: number;
  height: number;
  isMobile: boolean;
};

function getViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getBookSize(): BookSize {
  if (typeof window === "undefined") {
    return { width: 320, height: 320, isMobile: true };
  }

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const viewportHeight = getViewportHeight();
  const footerHeight = 148;
  const verticalPadding = 28;
  const navSpace = isMobile ? 84 : 108;
  const horizontalPadding = 28;
  const maxPageWidth = isMobile ? 360 : 350;

  const maxPageHeight = Math.max(
    200,
    viewportHeight - footerHeight - verticalPadding,
  );
  const contentWidth = window.innerWidth - horizontalPadding - navSpace;
  const pageWidth = Math.floor(
    Math.min(
      isMobile ? contentWidth : contentWidth / 2,
      maxPageWidth,
      maxPageHeight,
    ),
  );
  const size = Math.max(220, pageWidth);

  return {
    width: size,
    height: size,
    isMobile,
  };
}

export default function MenuBook() {
  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const [bookSize, setBookSize] = useState<BookSize>({
    width: 320,
    height: 320,
    isMobile: true,
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      requestAnimationFrame(() => {
        setBookSize(getBookSize());
      });
    };

    updateSize();

    const stage = stageRef.current;
    const resizeObserver =
      stage && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateSize)
        : null;

    if (stage) {
      resizeObserver?.observe(stage);
    }

    window.addEventListener("resize", updateSize);
    window.visualViewport?.addEventListener("resize", updateSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateSize);
      window.visualViewport?.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    const host = bookRef.current;
    if (!host) {
      return;
    }

    const pages = host.querySelectorAll<HTMLElement>(`.${styles.flipPage}`);
    if (pages.length === 0) {
      return;
    }

    setReady(false);

    const pageFlip = new PageFlip(host, {
      width: bookSize.width,
      height: bookSize.height,
      size: "stretch",
      minWidth: 220,
      maxWidth: bookSize.isMobile ? 380 : 360,
      minHeight: 220,
      maxHeight: bookSize.isMobile ? 380 : 360,
      drawShadow: true,
      flippingTime: 700,
      usePortrait: true,
      maxShadowOpacity: 0.88,
      mobileScrollSupport: true,
      swipeDistance: 28,
      showCover: false,
      autoSize: true,
      useMouseEvents: true,
    });

    pageFlip.on("init", (event) => {
      const payload = event.data as { page: number };
      setCurrentPage(payload.page);
      setReady(true);
    });

    pageFlip.on("flip", (event) => {
      setCurrentPage(event.data as number);
    });

    pageFlip.loadFromHtml(Array.from(pages));
    pageFlipRef.current = pageFlip;

    return () => {
      pageFlip.destroy();
      pageFlipRef.current = null;
      setReady(false);
    };
  }, [bookSize.height, bookSize.isMobile, bookSize.width]);

  const pageCount = MENU_PAGES.length;
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= pageCount - 1;

  const goPrev = useCallback(() => {
    pageFlipRef.current?.flipPrev();
  }, []);

  const goNext = useCallback(() => {
    pageFlipRef.current?.flipNext();
  }, []);

  const goToPage = useCallback((index: number) => {
    pageFlipRef.current?.turnToPage(index);
  }, []);

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
            disabled={!ready || isFirstPage}
            aria-label="前のページ"
          >
            ‹
          </button>

          <div className={styles.bookColumn}>
            <div
              className={styles.bookShell}
              style={{
                width: bookSize.isMobile
                  ? bookSize.width + 28
                  : bookSize.width * 2 + 28,
              }}
            >
              <div className={styles.bookCoverEdge} aria-hidden />
              <div
                className={styles.bookFlipHost}
                key={`${bookSize.width}-${bookSize.height}-${bookSize.isMobile}`}
              >
                <div ref={bookRef} className={styles.bookRoot}>
                  {MENU_PAGES.map((page) => (
                    <div key={page.src} className={styles.flipPage}>
                      <div className={styles.pageFace}>
                        <img
                          src={page.src}
                          alt={page.alt}
                          className={styles.pageImage}
                          draggable={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.bookSpineGlow} aria-hidden />
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
                  disabled={!ready}
                  onClick={() => goToPage(index)}
                />
              ))}
            </div>

            <div className={styles.counter}>
              {currentPage + 1} / {pageCount}
            </div>
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={goNext}
            disabled={!ready || isLastPage}
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
