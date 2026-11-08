import { STORE_ORDER_MAINTENANCE_LINES } from "../../../lib/storeOrderMaintenance";
import styles from "../order.module.css";

export default function StoreOrderMaintenancePage() {
  return (
    <main className={styles.page}>
      <div className={styles.section}>
        <div className={styles.panel}>
          <h1 className={styles.title}>店内オーダー</h1>
          {STORE_ORDER_MAINTENANCE_LINES.map((line) => (
            <p key={line} className={styles.stepNote} style={{ marginTop: 12 }}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
