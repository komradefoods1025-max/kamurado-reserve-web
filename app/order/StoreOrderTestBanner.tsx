import styles from "./order.module.css";

function isClientTruthy(value: string) {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export default function StoreOrderTestBanner() {
  const testMode = isClientTruthy(
    String(process.env.NEXT_PUBLIC_STORE_ORDER_TEST_MODE || ""),
  );
  const enforceLo = isClientTruthy(
    String(process.env.NEXT_PUBLIC_STORE_ORDER_ENFORCE_LAST_ORDER || ""),
  );

  const dev = process.env.NODE_ENV === "development";
  if (enforceLo) return null;
  if (!dev && !testMode) return null;

  return (
    <div className={styles.testBanner} role="status">
      {dev || testMode
        ? "テストモード：休業日・開店前を無視します（LO は既定で無効）"
        : "ラストオーダー（22:00/22:30）は現在、受付制限に使っていません"}
    </div>
  );
}
