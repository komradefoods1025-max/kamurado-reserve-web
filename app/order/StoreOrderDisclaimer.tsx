import { STORE_ORDER_BUSY_DISCLAIMER } from "../../lib/storeOrderCopy";
import styles from "./order.module.css";

export default function StoreOrderDisclaimer() {
  return (
    <p className={styles.disclaimerBox} role="note">
      {STORE_ORDER_BUSY_DISCLAIMER}
    </p>
  );
}
