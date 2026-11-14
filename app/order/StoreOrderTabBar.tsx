"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isStoreOrderDineInClient } from "../../lib/storeOrderDineIn";
import {
  resolveActiveStoreTableId,
  storeOrderBillHref,
  storeOrderHistoryHref,
  storeOrderMenuHref,
} from "../../lib/storeOrderMenuUrl";
import styles from "./order.module.css";

type TabId = "menu" | "history" | "bill";

function TabIcon({ tab }: { tab: TabId }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true as const };
  if (tab === "menu") {
    return (
      <svg {...common} className={styles.orderTabIcon}>
        <path
          d="M6 4v4M6 12v8M12 3v18M18 6v6M18 16v4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M4 8h4M16 10h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (tab === "history") {
    return (
      <svg {...common} className={styles.orderTabIcon}>
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 8v4l2.5 2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16.5 5.5 19 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common} className={styles.orderTabIcon}>
      <path
        d="M9 8h6M9 12h6M9 16h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 4V3M16 4V3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function StoreOrderTabBar() {
  const dineIn = isStoreOrderDineInClient();
  const pathname = usePathname();
  const [tableId, setTableId] = useState<string | null>(null);

  useEffect(() => {
    setTableId(resolveActiveStoreTableId());
  }, [pathname]);

  if (!dineIn) return null;

  let active: TabId = "menu";
  if (pathname?.startsWith("/order/history")) active = "history";
  else if (pathname?.startsWith("/order/bill")) active = "bill";

  const tabs: { id: TabId; label: string; href: string }[] = [
    { id: "menu", label: "メニュー", href: storeOrderMenuHref(tableId) },
    { id: "history", label: "履歴", href: storeOrderHistoryHref(tableId) },
    { id: "bill", label: "会計確認", href: storeOrderBillHref(tableId) },
  ];

  return (
    <nav className={styles.orderTabBar} aria-label="注文メニュー">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={
              isActive
                ? `${styles.orderTabBtn} ${styles.orderTabBtnActive}`
                : styles.orderTabBtn
            }
            aria-current={isActive ? "page" : undefined}
          >
            <TabIcon tab={tab.id} />
            <span className={styles.orderTabLabel}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}