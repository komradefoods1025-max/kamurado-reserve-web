"use client";

import styles from "./bookCloseOverlay.module.css";

export default function BookCloseOverlay() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.bookWrap}>
        <div className={styles.bookShell}>
          <span className={styles.metalCorner} data-corner="tl" />
          <span className={styles.metalCorner} data-corner="tr" />
          <span className={styles.metalCorner} data-corner="bl" />
          <span className={styles.metalCorner} data-corner="br" />
          <div className={styles.bookSpread}>
            <div className={`${styles.pageHalf} ${styles.pageHalfLeft}`}>
              <span className={styles.pageTexture} />
            </div>
            <div className={`${styles.pageHalf} ${styles.pageHalfRight}`}>
              <span className={styles.pageTexture} />
            </div>
          </div>
          <span className={styles.spineGlow} />
          <span className={styles.coverFlash} />
        </div>
      </div>
    </div>
  );
}
