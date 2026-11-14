import type { StoreMenuItem } from "./storeMenuCatalog";

const RECOMMENDED_IMAGE_REV = "20261115";
const RIMG = (n: number) =>
  `/store-menu/${String(n).padStart(2, "0")}.jpg?v=${RECOMMENDED_IMAGE_REV}`;

const RECOMMENDED_PHOTO = {
  showCardName: true,
  imageCropBottomCaption: true,
} as const satisfies Pick<StoreMenuItem, "showCardName" | "imageCropBottomCaption">;

/** 店内オーダー「おすすめ」カテゴリ（おかわりの次） */
export const RECOMMENDED_MENU_ITEMS: StoreMenuItem[] = [
  {
    id: "rec_soba_meshi",
    name: "そば飯",
    price: 980,
    image: RIMG(50),
    category: "recommended",
    ...RECOMMENDED_PHOTO,
  },
  {
    id: "rec_shiitake_shoyu_butter",
    name: "しいたけの醤油バター",
    price: 890,
    image: RIMG(51),
    category: "recommended",
    ...RECOMMENDED_PHOTO,
  },
  {
    id: "rec_seseri_shikuwasa",
    name: "せせりのシークワーサー",
    price: 880,
    image: RIMG(52),
    category: "recommended",
    ...RECOMMENDED_PHOTO,
  },
  {
    id: "rec_chicken_nanban_sand",
    name: "絶品！！チキン南蛮サンド",
    price: 880,
    image: RIMG(53),
    category: "recommended",
    ...RECOMMENDED_PHOTO,
  },
];