import { STORE_ORDER_LAST_ORDER_LINES } from "../../lib/storeOrderCopy";
import styles from "./order.module.css";

export default function StoreOrderLastOrderNote() {
  return (
    <div className={styles.lastOrderBox} role="note" aria-label="ラストオーダー">
      {STORE_ORDER_LAST_ORDER_LINES.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
