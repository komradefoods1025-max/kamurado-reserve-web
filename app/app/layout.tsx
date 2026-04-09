import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "かむらど予約Web",
  description: "かむらどのお弁当予約Webアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
