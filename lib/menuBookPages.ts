export type MenuBookPage = {
  pageNumber: number;
  src: string;
  alt: string;
  orderable: boolean;
  id?: string;
  name?: string;
  price?: number;
  itemType?: "bento" | "extra";
};

/** public/menu/01.jpg〜11.jpg と予約カート id の対応 */
export const MENU_BOOK_PAGES: MenuBookPage[] = [
  {
    pageNumber: 1,
    src: "/menu/01.jpg",
    alt: "おろしポン酢ハンバーグ弁当",
    orderable: true,
    id: "oroshi_ponzu_hamburg_bento",
    name: "おろしポン酢ハンバーグ弁当",
    price: 850,
    itemType: "bento",
  },
  {
    pageNumber: 2,
    src: "/menu/02.jpg",
    alt: "チキン南蛮弁当",
    orderable: true,
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 900,
    itemType: "bento",
  },
  {
    pageNumber: 3,
    src: "/menu/03.jpg",
    alt: "チキンカツ弁当 タルタルソースがけ",
    orderable: true,
    id: "chicken_katsu_tartar_bento",
    name: "チキンカツ弁当 タルタルソースがけ",
    price: 700,
    itemType: "bento",
  },
  {
    pageNumber: 4,
    src: "/menu/04.jpg",
    alt: "生姜焼き弁当",
    orderable: true,
    id: "shogayaki_bento",
    name: "生姜焼き弁当",
    price: 700,
    itemType: "bento",
  },
  {
    pageNumber: 5,
    src: "/menu/05.jpg",
    alt: "デミグラスハンバーグ弁当",
    orderable: true,
    id: "demiglace_hamburg_bento",
    name: "デミグラスハンバーグ弁当",
    price: 850,
    itemType: "bento",
  },
  {
    pageNumber: 6,
    src: "/menu/06.jpg",
    alt: "チキン南蛮弁当",
    orderable: true,
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 850,
    itemType: "bento",
  },
  {
    pageNumber: 7,
    src: "/menu/07.jpg",
    alt: "チキンカツ弁当",
    orderable: true,
    id: "chicken_katsu_bento",
    name: "チキンカツ弁当",
    price: 800,
    itemType: "bento",
  },
  {
    pageNumber: 8,
    src: "/menu/08.jpg",
    alt: "チーズハンバーグ弁当",
    orderable: true,
    id: "cheese_hamburg_bento",
    name: "チーズハンバーグ弁当",
    price: 850,
    itemType: "bento",
  },
  {
    pageNumber: 9,
    src: "/menu/09.jpg",
    alt: "からあげ弁当",
    orderable: true,
    id: "karaage_bento",
    name: "からあげ弁当",
    price: 700,
    itemType: "bento",
  },
  {
    pageNumber: 10,
    src: "/menu/10.jpg",
    alt: "オリジナルハンバーグ弁当",
    orderable: true,
    id: "original_hamburg_bento",
    name: "オリジナルハンバーグ弁当",
    price: 750,
    itemType: "bento",
  },
  {
    pageNumber: 11,
    src: "/menu/11.jpg",
    alt: "チキンカツおろしポン酢弁当",
    orderable: true,
    id: "chicken_katsu_oroshi_ponzu_bento",
    name: "チキンカツおろしポン酢弁当",
    price: 750,
    itemType: "bento",
  },
];

export function getMenuBookPage(index: number): MenuBookPage {
  return MENU_BOOK_PAGES[index] ?? MENU_BOOK_PAGES[0];
}

export function isOrderableMenuBookPage(
  page: MenuBookPage,
): page is MenuBookPage & {
  id: string;
  name: string;
  price: number;
  itemType: "bento" | "extra";
} {
  return (
    page.orderable &&
    typeof page.id === "string" &&
    typeof page.name === "string" &&
    typeof page.price === "number" &&
    (page.itemType === "bento" || page.itemType === "extra")
  );
}

export function formatMenuPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}
