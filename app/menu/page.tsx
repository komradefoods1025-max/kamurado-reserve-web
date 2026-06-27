import type { Metadata } from "next";
import MenuBook from "./MenuBook";

export const metadata: Metadata = {
  title: "メニュー | かむらど",
  description: "かむらどのグランドメニュー",
};

export default function MenuPage() {
  return <MenuBook />;
}
