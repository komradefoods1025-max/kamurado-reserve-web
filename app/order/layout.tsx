import type { Metadata, Viewport } from "next";
import StoreOrderTabBar from "./StoreOrderTabBar";
import styles from "./order.module.css";

export const metadata: Metadata = {
  title: "かむらど 店内オーダー",
  description: "店内メニューのモバイルオーダー（店内飲食・レジ精算）",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3a2218",
};

export default function StoreOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.orderRoot}>
      {children}
      <StoreOrderTabBar />
    </div>
  );
}
