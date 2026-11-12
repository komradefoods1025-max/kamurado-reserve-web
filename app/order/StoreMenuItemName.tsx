import { storeMenuNameSegments } from "../../lib/storeMenuCatalog";
import styles from "./order.module.css";

export default function StoreMenuItemName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const segments = storeMenuNameSegments(name);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.keepTogether ? (
          <span key={i} className={styles.menuNameKeep}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}
