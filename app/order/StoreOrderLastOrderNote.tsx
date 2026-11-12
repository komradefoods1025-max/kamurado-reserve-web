import { STORE_ORDER_LAST_ORDER_TELOP } from "../../lib/storeOrderCopy";
import styles from "./order.module.css";

export default function StoreOrderLastOrderNote() {
  const text = STORE_ORDER_LAST_ORDER_TELOP;
  return (
    <div
      className={styles.lastOrderBox}
      role="note"
      aria-label={text}
    >
      <div className={styles.lastOrderTelop}>
        <div className={styles.lastOrderTelopTrack}>
          <span className={styles.lastOrderTelopText}>{text}</span>
          <span className={styles.lastOrderTelopText} aria-hidden="true">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
