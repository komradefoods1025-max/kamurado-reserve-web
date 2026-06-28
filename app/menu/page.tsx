import type { Metadata } from "next";
import MenuBook from "./MenuBook";

export const metadata: Metadata = {
  title: "かむらど デジタルメニューブック v1.0",
  description: "鉄板焼きダイニング かむらどのデジタルメニューブック",
};

export default function MenuPage() {
  return <MenuBook />;
}
