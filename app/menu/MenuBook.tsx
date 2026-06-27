"use client";

import HTMLFlipBook from "react-pageflip";
import Link from "next/link";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
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
const PAGE_RATIO = 0.72;

function getViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function syncPageIndex(
  bookRef: RefObject<FlipBookHandle | null>,
  setCurrentPage: Dispatch<SetStateAction<number>>,
) {
  const page = bookRef.current?.pageFlip().getCurrentPageIndex();
  if (typeof page === "number" && Number.isFinite(page)) {
    setCurrentPage(page);
  }
}

type BookDimensions = {
  width: number;
  height: number;
  isMobile: boolean;
};

type FlipBookHandle = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    getCurrentPageIndex: () => number;
    getPageCount: () => number;
  };
};

type BookPageProps = {
  src: string;
  alt: string;
};

const BookPage = forwardRef<HTMLDivElement, BookPageProps>(function BookPage(
  { src, alt },
  ref,
) {
  return (
    <div className={styles.page} ref={ref} data-density="soft">
      <img src={src} alt={alt} className={styles.pageImage} />
    </div>
  );
});

function getBookDimensions(): BookDimensions {
  if (typeof window === "undefined") {
    return { width: 320, height: 427, isMobile: true };
  }

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const viewportHeight = getViewportHeight();
  const headerHeight = isMobile ? 72 : 84;
  const footerHeight = 96;
  const counterHeight = 28;
  const verticalPadding = 24;
  const horizontalPadding = isMobile ? 88 : 120;
  const maxPageWidth = isMobile ? 420 : 400;

  const availableWidth = window.innerWidth - horizontalPadding;
  const availableHeight =
    viewportHeight - headerHeight - footerHeight - counterHeight - verticalPadding;

  if (isMobile) {
    const height = Math.max(280, Math.min(availableHeight, 560));
    const width = Math.min(
      maxPageWidth,
      availableWidth,
      Math.round(height * PAGE_RATIO),
    );
    return { width, height, isMobile: true };
  }

  const spreadMaxWidth = Math.min(availableWidth, maxPageWidth * 2);
  const pageWidth = Math.min(Math.floor(spreadMaxWidth / 2), maxPageWidth);
  const height = Math.max(
    280,
    Math.min(availableHeight, Math.round(pageWidth / PAGE_RATIO)),
  );

  return { width: pageWidth, height, isMobile: false };
}

export default function MenuBook() {
  const bookRef = useRef<FlipBookHandle>(null);
  const [mounted, setMounted] = useState(false);
  const [dims, setDims] = useState<BookDimensions>({
    width: 320,
    height: 427,
    isMobile: true,
  });
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      setDims(getBookDimensions());
    };

    updateDimensions();
    setMounted(true);

    window.addEventListener("resize", updateDimensions);
    window.visualViewport?.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      window.visualViewport?.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const handleFlip = useCallback(() => {
    syncPageIndex(bookRef, setCurrentPage);
  }, []);

  const handleInit = useCallback(() => {
    syncPageIndex(bookRef, setCurrentPage);
  }, []);

  const goPrev = () => {
    bookRef.current?.pageFlip().flipPrev();
  };

  const goNext = () => {
    bookRef.current?.pageFlip().flipNext();
  };

  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= MENU_PAGES.length - 1;
  const spreadWidth = dims.isMobile ? dims.width : dims.width * 2;

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1>グランドメニュー</h1>
        <p>左右スワイプまたはボタンでページをめくれます</p>
      </header>

      <div className={styles.stage}>
        <div className={styles.bookArea}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goPrev}
            disabled={!mounted || isFirstPage}
            aria-label="前のページ"
          >
            ‹
          </button>

          <div
            className={styles.flipBookWrap}
            style={{ width: spreadWidth, height: dims.height }}
          >
            {mounted ? (
              <HTMLFlipBook
                key={`${dims.isMobile}-${dims.width}-${dims.height}`}
                ref={bookRef}
                className={styles.flipBook}
                style={{}}
                startPage={0}
                width={dims.width}
                height={dims.height}
                size="fixed"
                minWidth={200}
                maxWidth={420}
                minHeight={280}
                maxHeight={620}
                drawShadow
                flippingTime={650}
                usePortrait={dims.isMobile}
                startZIndex={0}
                autoSize={false}
                maxShadowOpacity={0.45}
                showCover={false}
                mobileScrollSupport
                swipeDistance={24}
                clickEventForward
                useMouseEvents
                showPageCorners
                disableFlipByClick={false}
                onFlip={handleFlip}
                onInit={handleInit}
              >
                {MENU_PAGES.map((page) => (
                  <BookPage key={page.src} src={page.src} alt={page.alt} />
                ))}
              </HTMLFlipBook>
            ) : (
              <div
                className={styles.bookPlaceholder}
                style={{ width: spreadWidth, height: dims.height }}
                aria-hidden
              />
            )}
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={goNext}
            disabled={!mounted || isLastPage}
            aria-label="次のページ"
          >
            ›
          </button>
        </div>

        <div className={styles.counter}>
          {currentPage + 1} / {MENU_PAGES.length}
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
