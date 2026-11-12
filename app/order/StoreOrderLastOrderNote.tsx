import {
  STORE_ORDER_DINE_IN_TELOP,
  STORE_ORDER_LAST_ORDER_ONE_LINE,
} from "../../lib/storeOrderCopy";
import styles from "./order.module.css";

export default function StoreOrderLastOrderNote() {
  const telop = STORE_ORDER_DINE_IN_TELOP;
  const lastOrder = STORE_ORDER_LAST_ORDER_ONE_LINE;
  return (
    <div
      className={styles.lastOrderWrap}
      role="note"
      aria-label={`${telop} ${lastOrder}`}
    >
      <div className={styles.lastOrderTelop}>
        <div className={styles.lastOrderTelopTrack}>
          <span className={styles.lastOrderTelopText}>{telop}</span>
          <span className={styles.lastOrderTelopText} aria-hidden="true">
            {telop}
          </span>
        </div>
      </div>
      <div className={styles.lastOrderBox}>
        <p className={styles.lastOrderFixedLine}>{lastOrder}</p>
      </div>
    </div>
  );
}
