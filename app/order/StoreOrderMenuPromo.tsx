import type { StoreOrderLandingSection } from "../../lib/storeOrderLandingContent";
import StoreOrderLandingSections from "./StoreOrderLandingSections";
import styles from "./order.module.css";

export default function StoreOrderMenuPromo({
  sections,
}: {
  sections: StoreOrderLandingSection[];
}) {
  return (
    <div className={styles.menuPromo}>
      <StoreOrderLandingSections sections={sections} />
    </div>
  );
}
