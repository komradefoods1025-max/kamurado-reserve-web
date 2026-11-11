import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "各卓QR｜店内オーダー",
  robots: { index: false, follow: false },
};

export default function StoreOrderSeatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
