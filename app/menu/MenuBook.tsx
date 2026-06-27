"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

type Layout = {
  isMobile: boolean;
  pageWidth: number;
  spreadWidth: number;
};

const DEFAULT_LAYOUT: Layout = {
  isMobile: true,
  pageWidth: 320,
  spreadWidth: 320,
};

function getMaxLeftPage(isMobile: boolean): number {
  if (isMobile) {
    return MENU_PAGES.length - 1;
  }

  return MENU_PAGES.length % 2 === 1
    ? MENU_PAGES.length - 1
    : MENU_PAGES.length - 2;
}

type MenuPageProps = {
  page: (typeof MENU_PAGES)[number];
  empty?: boolean;
};

function MenuPage({ page, empty = false }: MenuPageProps) {
  if (empty) {
    return <div className={`${styles.page} ${styles.pageEmpty}`} aria-hidden />;
  }

  return (
    <div className={styles.page}>
      <img
        src={page.src}
        alt={page.alt}
        className={styles.pageImage}
        draggable={false}
      />
    </div>
  );
}

export default function MenuBook() {
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === "undefined") {
        return;
      }

      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
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

  const maxLeftPage = getMaxLeftPage(layout.isMobile);
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= maxLeftPage;
  const rightPage = layout.isMobile ? null : MENU_PAGES[currentPage + 1];

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

  const bookViewClassName = [
    styles.bookView,
    layout.isMobile ? styles.bookViewSingle : styles.bookViewSpread,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1>グランドメニュー</h1>
        <p>左右ボタンでページをめくれます</p>
      </header>

      <div className={styles.stage}>
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
            >
              <div className={styles.spread}>
                <MenuPage page={MENU_PAGES[currentPage]} />

                {!layout.isMobile && (
                  <MenuPage
                    page={rightPage ?? MENU_PAGES[currentPage]}
                    empty={!rightPage}
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
