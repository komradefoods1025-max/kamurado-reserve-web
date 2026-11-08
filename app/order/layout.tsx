import type { Metadata, Viewport } from "next";
import styles from "./order.module.css";

export const metadata: Metadata = {
  title: "かむらど 店内オーダー",
  description: "店内メニューのモバイルオーダー（受取・店頭支払い）",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1410",
};

export default function StoreOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.orderRoot}>{children}</div>;
}
