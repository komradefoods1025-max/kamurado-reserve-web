import styles from "./order.module.css";

function isClientTruthy(value: string) {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export default function StoreOrderTestBanner() {
  const testMode = isClientTruthy(
    String(process.env.NEXT_PUBLIC_STORE_ORDER_TEST_MODE || ""),
  );
  const bypassLo = isClientTruthy(
    String(process.env.NEXT_PUBLIC_STORE_ORDER_BYPASS_LAST_ORDER || ""),
  );

  if (!testMode && !bypassLo) return null;

  return (
    <div className={styles.testBanner} role="status">
      {testMode
        ? "テストモード：休業日・開店前・ラストオーダー（22:00/22:30）を無視します"
        : "テスト中：ラストオーダー（22:00/22:30）を無視しています"}
    </div>
  );
}
