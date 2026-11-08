export type StoreMenuCategory =
  | "otsumami"
  | "salad"
  | "okonomiyaki"
  | "topping"
  | "teppanyaki"
  | "fried"
  | "rice"
  | "noodle";

import type { StoreCartLine } from "./storeOrderDraft";

export type StoreMenuItem = {
  id: string;
  name: string;
  /** 未設定時は価格表示なし（○は注文確認画面） */
  price: number | null;
  image: string;
  category: StoreMenuCategory;
};

/** public/store-menu を差し替えたら rev を上げる（ブラウザ・Next 画像キャッシュ対策） */
const STORE_MENU_IMAGE_REV = "20261109-6";

const IMG = (n: number) =>
  `/store-menu/${String(n).padStart(2, "0")}.jpg?v=${STORE_MENU_IMAGE_REV}`;

export const STORE_MENU_CATEGORY_LABEL: Record<StoreMenuCategory, string> = {
  otsumami: "おつまみ",
  salad: "サラダ",
  okonomiyaki: "お好み焼き",
  topping: "トッピング",
  teppanyaki: "鉄板焼き",
  fried: "揚げ物",
  rice: "ご飯",
  noodle: "麺",
};

/** カテゴリ見出し直下に表示する注記（任意） */
export const STORE_MENU_CATEGORY_NOTE: Partial<
  Record<StoreMenuCategory, string>
> = {
  okonomiyaki: "※焼いた状態でご提供となります",
  topping: "お好み焼きに追加できます",
};

const OKONOMIYAKI_TOPPING_MENU_ITEMS: StoreMenuItem[] = (
  [
    ["top_egg_medama", "卵(生・目玉焼き)"],
    ["top_onsen_tamago", "温玉"],
    ["top_tenkasu", "天かす"],
    ["top_baby_star", "ベビースター"],
    ["top_mochi", "餅"],
    ["top_curry_powder", "カレー粉"],
    ["top_sakura_ebi", "桜エビ"],
    ["top_oroshi_garlic", "おろしにんにく"],
    ["top_beni_shoga", "紅生姜"],
    ["top_umeboshi", "梅干し"],
    ["top_pork", "豚肉"],
    ["top_kimchi", "キムチ"],
    ["top_cheese", "チーズ"],
    ["top_hotate", "ホタテ"],
    ["top_kiri_ika", "きりイカ"],
    ["top_ebi", "えび"],
    ["top_ika", "いか"],
    ["top_soba", "そば"],
    ["top_mentaiko", "明太子"],
    ["top_gyusuji", "牛すじ"],
  ] as const
).map(([id, name]) => ({
  id,
  name,
  price: null,
  image: "",
  category: "topping" as const,
}));

const TEPPANYAKI_MENU_ITEMS: StoreMenuItem[] = (
  [
    ["dashimaki_tamago", "だし巻き卵", 33],
    ["dashimaki_negi", "だし巻きねぎ", 36],
    ["dashimaki_mentai_cheese", "だし巻き明太チーズ", 30],
    ["ita_gyoza", "自家製ぎょうざ", 31],
    ["jaga_mentai_cheese", "じゃが明太チーズ", 34],
    ["sunagimo_nagaimo_yuzu", "砂肝と長芋の柚子胡椒焼き", 32],
    ["seseri_basil_chicken", "せせりのバジルチキン", 38],
    ["tonpeiyaki", "とんぺい焼き", 37],
    ["yakiniku_harami", "焼き肉屋さんの牛ハラミ", 35],
    ["ebi_ika_garlic_saute", "エビとイカのガーリックソテー", 41],
    ["hotate_asparagus_butter", "ホタテとアスパラのバター焼き", 40],
    ["ajillo_today", "本日のアヒージョ", 39],
    ["buta_moyashi_oimayo", "豚ともやしのこく旨オイマヨ炒め", 42],
  ] as const
).map(([id, name, n]) => ({
  id,
  name,
  price: null,
  image: IMG(n),
  category: "teppanyaki" as const,
}));

export const STORE_MENU_ITEMS: StoreMenuItem[] = [
  {
    id: "celery_asazuke",
    name: "セロリの浅漬け",
    price: null,
    image: IMG(1),
    category: "otsumami",
  },
  {
    id: "ume_suisho",
    name: "梅水晶",
    price: null,
    image: IMG(2),
    category: "otsumami",
  },
  {
    id: "kyuri_ipponzuke",
    name: "きゅうりの一本漬け",
    price: null,
    image: IMG(3),
    category: "otsumami",
  },
  {
    id: "jikasei_chicken_ham",
    name: "自家製鶏ハム",
    price: null,
    image: IMG(4),
    category: "otsumami",
  },
  {
    id: "edamame",
    name: "枝豆",
    price: null,
    image: IMG(5),
    category: "otsumami",
  },
  {
    id: "quail_umezu",
    name: "ひと口うずらの旨酢漬け",
    price: null,
    image: IMG(6),
    category: "otsumami",
  },
  {
    id: "sunagimo_kara_ponzu",
    name: "おつまみ砂肝旨辛ポン酢",
    price: null,
    image: IMG(7),
    category: "otsumami",
  },
  {
    id: "karikari_cheese",
    name: "カリカリチーズ",
    price: null,
    image: IMG(8),
    category: "otsumami",
  },
  {
    id: "nama_spring_roll",
    name: "生春巻き",
    price: null,
    image: IMG(9),
    category: "otsumami",
  },
  {
    id: "tori_ume_kyuri",
    name: "鶏梅きゅうり",
    price: null,
    image: IMG(10),
    category: "salad",
  },
  {
    id: "potato_salad",
    name: "ポテトサラダ",
    price: null,
    image: IMG(11),
    category: "salad",
  },
  {
    id: "choregi_salad",
    name: "チョレギサラダ",
    price: null,
    image: IMG(12),
    category: "salad",
  },
  {
    id: "gyusuji_negi_yaki",
    name: "牛すじねぎ焼き",
    price: null,
    image: IMG(24),
    category: "okonomiyaki",
  },
  {
    id: "ika_tama",
    name: "いか玉",
    price: null,
    image: IMG(25),
    category: "okonomiyaki",
  },
  {
    id: "mix_tama",
    name: "ミックス玉",
    price: null,
    image: IMG(26),
    category: "okonomiyaki",
  },
  {
    id: "ebi_tama",
    name: "えび玉",
    price: null,
    image: IMG(27),
    category: "okonomiyaki",
  },
  {
    id: "negi_buta_tama",
    name: "ねぎ豚玉",
    price: null,
    image: IMG(28),
    category: "okonomiyaki",
  },
  {
    id: "buta_tama",
    name: "豚玉",
    price: null,
    image: IMG(29),
    category: "okonomiyaki",
  },
  ...OKONOMIYAKI_TOPPING_MENU_ITEMS,
  ...TEPPANYAKI_MENU_ITEMS,
  {
    id: "kamurado_karaage",
    name: "かむらどの特製からあげ",
    price: null,
    image: IMG(13),
    category: "fried",
  },
  {
    id: "french_fries",
    name: "フライドポテト",
    price: null,
    image: IMG(14),
    category: "fried",
  },
  {
    id: "fries_chili_garlic",
    name: "フライドポテト チリガーリックスパイス",
    price: null,
    image: IMG(15),
    category: "fried",
  },
  {
    id: "satoimo_karaage",
    name: "里芋のから揚げ",
    price: null,
    image: IMG(16),
    category: "fried",
  },
  {
    id: "chicken_nanban",
    name: "チキン南蛮",
    price: null,
    image: IMG(43),
    category: "fried",
  },
  {
    id: "kimchi_chahan",
    name: "キムチチャーハン",
    price: null,
    image: IMG(17),
    category: "rice",
  },
  {
    id: "mentai_butter_rice",
    name: "明太バターライス",
    price: null,
    image: IMG(18),
    category: "rice",
  },
  {
    id: "takana_chahan",
    name: "高菜チャーハン",
    price: null,
    image: IMG(19),
    category: "rice",
  },
  {
    id: "onigiri_various",
    name: "おにぎり各種",
    price: null,
    image: IMG(20),
    category: "rice",
  },
  {
    id: "gyusuji_yakisoba",
    name: "牛すじ焼きそば",
    price: null,
    image: IMG(21),
    category: "noodle",
  },
  {
    id: "sauce_yakisoba",
    name: "ソース焼きそば",
    price: null,
    image: IMG(22),
    category: "noodle",
  },
  {
    id: "negi_shio_yakisoba",
    name: "ねぎ塩焼きそば",
    price: null,
    image: IMG(23),
    category: "noodle",
  },
];

export function formatStoreItemPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price) || price <= 0) {
    return "";
  }
  return `¥${price.toLocaleString("ja-JP")}`;
}

export function storeItemLineTotal(price: number | null, qty: number): number {
  if (price === null || !Number.isFinite(price)) return 0;
  return price * qty;
}

/** 注文確認画面用（未設定時は ○） */
export function formatStoreOrderUnitPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price) || price <= 0) return "○";
  return `¥${price.toLocaleString("ja-JP")}`;
}

export function formatStoreOrderLineTotal(
  price: number | null,
  qty: number,
): string {
  if (price === null || !Number.isFinite(price) || price <= 0) return "○";
  return `¥${(price * qty).toLocaleString("ja-JP")}`;
}

export function formatStoreOrderCartTotal(
  items: { price: number | null; quantity: number }[],
): string {
  const { amount, priced } = computeStoreCartMoney(items);
  if (!priced) return "○";
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function computeStoreCartMoney(
  items: { price: number | null; quantity: number }[],
): { amount: number; priced: boolean } {
  let amount = 0;
  let priced = false;
  for (const item of items) {
    if (item.price != null && item.price > 0) {
      priced = true;
      amount += item.price * item.quantity;
    }
  }
  return { amount, priced };
}

export function syncStoreCartWithCatalog(items: StoreCartLine[]): StoreCartLine[] {
  return items.map((line) => {
    const catalog = STORE_MENU_ITEMS.find((m) => m.id === line.id);
    if (!catalog) return line;
    return {
      ...line,
      name: catalog.name,
      price: catalog.price,
      image: catalog.image,
    };
  });
}
