import styles from "./page.module.css";

const MENU_PAGES = Array.from({ length: 11 }, (_, index) => {
  const pageNumber = String(index + 1).padStart(2, "0");
  return `/menu/${pageNumber}.jpg`;
});

export default function MenuBook() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {MENU_PAGES.map((src, index) => (
          <figure key={src} className={styles.page}>
            <img
              src={src}
              alt={`メニュー ${index + 1}ページ`}
              className={styles.image}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </main>
  );
}
