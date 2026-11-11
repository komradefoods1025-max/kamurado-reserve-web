import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "店舗オーダー表示｜かむらど",
  robots: { index: false, follow: false },
};

export default function StoreDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
