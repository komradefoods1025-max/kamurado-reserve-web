export type MenuBookItem = {
  pageNumber: number;
  id: string;
  name: string;
  price: number;
  image: string;
  alt: string;
  orderable: boolean;
  itemType: "bento" | "drink" | "extra";
};

/** public/menu/01.jpg〜11.jpg。各 jpg の写真内容と商品データを1対1で対応 */
export const MENU_BOOK_PAGES: MenuBookItem[] = [
  {
    pageNumber: 1,
    id: "oroshi_ponzu_hamburg_bento",
    name: "おろしポン酢ハンバーグ弁当",
    price: 850,
    image: "/menu/01.jpg",
    alt: "おろしポン酢ハンバーグ弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 2,
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 900,
    image: "/menu/02.jpg",
    alt: "チキン南蛮弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 3,
    id: "chicken_katsu_tartar_bento",
    name: "チキンカツタルタルソースがけ",
    price: 750,
    image: "/menu/03.jpg",
    alt: "チキンカツタルタルソースがけ",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 4,
    id: "shogayaki_bento",
    name: "生姜焼き弁当",
    price: 700,
    image: "/menu/04.jpg",
    alt: "生姜焼き弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 5,
    id: "demiglace_hamburg_bento",
    name: "デミグラスハンバーグ弁当",
    price: 850,
    image: "/menu/05.jpg",
    alt: "デミグラスハンバーグ弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 6,
    id: "chicken_katsu_oroshi_ponzu_bento",
    name: "チキンカツおろしポン酢弁当",
    price: 750,
    image: "/menu/06.jpg",
    alt: "チキンカツおろしポン酢弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 7,
    id: "chicken_katsu_bento",
    name: "チキンカツ弁当",
    price: 700,
    image: "/menu/07.jpg",
    alt: "チキンカツ弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 8,
    id: "cheese_hamburg_bento",
    name: "チーズハンバーグ弁当",
    price: 850,
    image: "/menu/08.jpg",
    alt: "チーズハンバーグ弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 9,
    id: "karaage_bento",
    name: "からあげ弁当",
    price: 700,
    image: "/menu/09.jpg",
    alt: "からあげ弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 10,
    id: "original_hamburg_bento",
    name: "オリジナルハンバーグ弁当",
    price: 800,
    image: "/menu/10.jpg",
    alt: "オリジナルハンバーグ弁当",
    orderable: true,
    itemType: "bento",
  },
  {
    pageNumber: 11,
    id: "extra_karaage",
    name: "追加唐揚げ",
    price: 80,
    image: "/menu/11.jpg",
    alt: "追加唐揚げ",
    orderable: true,
    itemType: "extra",
  },
];

export type MenuBookPage = MenuBookItem;

export function getMenuBookPage(index: number): MenuBookItem {
  return MENU_BOOK_PAGES[index] ?? MENU_BOOK_PAGES[0];
}

export function getMenuBookItemById(id: string): MenuBookItem | undefined {
  return MENU_BOOK_PAGES.find((item) => item.id === id);
}

export function isOrderableMenuBookPage(
  page: MenuBookItem,
): page is MenuBookItem {
  return page.orderable;
}

export function formatMenuPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}
