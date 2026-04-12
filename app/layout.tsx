import type { Metadata } from "next";
import { Noto_Sans_JP, Zen_Old_Mincho } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const zenOldMincho = Zen_Old_Mincho({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "かむらど お弁当ご予約ページ",
  description: "かむらどのランチ弁当Web予約ページ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSans.variable} ${zenOldMincho.variable}`}>
        {children}
      </body>
    </html>
  );
}
