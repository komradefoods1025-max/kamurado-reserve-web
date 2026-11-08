import styles from "./order.module.css";

export default function StoreOrderTestBanner() {
  const enabled =
    String(process.env.NEXT_PUBLIC_STORE_ORDER_TEST_MODE || "")
      .trim()
      .toLowerCase() === "true";

  if (!enabled) return null;

  return (
    <div className={styles.testBanner} role="status">
      テストモード：営業時間・休業日を無視して受け取り時間を表示しています
    </div>
  );
}
