"use client";

import { useState } from "react";
import styles from "./page.module.css";

const pages = [
  "/menu/01.jpg",
  "/menu/02.jpg",
  "/menu/03.jpg",
  "/menu/04.jpg",
  "/menu/05.jpg",
  "/menu/06.jpg",
  "/menu/07.jpg",
  "/menu/08.jpg",
  "/menu/09.jpg",
  "/menu/10.jpg",
  "/menu/11.jpg",
];

export default function MenuBook() {
  const [page, setPage] = useState(0);
  const [flipping, setFlipping] = useState(false);

  const nextPage = () => {
    if (page >= pages.length - 1 || flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setPage(page + 1);
      setFlipping(false);
    }, 450);
  };

  const prevPage = () => {
    if (page <= 0 || flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setPage(page - 1);
      setFlipping(false);
    }, 450);
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1>グランドメニュー</h1>
        <p>左右のボタンでページをめくれます</p>
      </header>

      <div className={styles.bookArea}>
        <button className={styles.navBtn} onClick={prevPage} disabled={page === 0}>
          ‹
        </button>

        <div className={styles.book} onClick={nextPage}>
          <img
            src={pages[page]}
            alt={`メニュー ${page + 1}ページ`}
            className={`${styles.pageImage} ${flipping ? styles.flip : ""}`}
          />
          <div className={styles.pageCurl}></div>
        </div>

        <button className={styles.navBtn} onClick={nextPage} disabled={page === pages.length - 1}>
          ›
        </button>
      </div>

      <div className={styles.counter}>
        {page + 1} / {pages.length}
      </div>

      <div className={styles.dots}>
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={i === page ? styles.activeDot : styles.dot}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <a href="/" className={styles.reserveBtn}>🍱 ランチ予約へ</a>
        <a href="tel:0480000000" className={styles.telBtn}>☎ 電話する</a>
      </div>
    </main>
  );
}
