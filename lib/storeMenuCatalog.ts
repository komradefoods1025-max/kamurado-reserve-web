export type StoreMenuCategory =
  | "otsumami"
  | "salad"
  | "okonomiyaki"
  | "monjayaki"
  | "topping"
  | "teppanyaki"
  | "fried"
  | "rice"
  | "noodle"
  | "dessert"
  | "drink_beer"
  | "drink_hoppy"
  | "drink_highball"
  | "drink_wine"
  | "drink_cocktail"
  | "drink_sour"
  | "drink_shochu_mugi"
  | "drink_shochu_imo"
  | "drink_mixer"
  | "drink_fruit";

import type { StoreCartLine } from "./storeOrderDraft";
import {
  DESSERT_MENU_ITEMS,
  DRINK_MENU_ITEMS,
} from "./storeDrinkDessertMenu";

export type StoreMenuSecondaryStepper = {
  min: number;
  max: number;
  default?: number;
  unit?: string;
};

export function storeMenuSecondaryStepperLabel(
  stepper: StoreMenuSecondaryStepper,
  count: number,
): string {
  const unit = stepper.unit ?? "個";
  return `${count}${unit}`;
}

export function storeMenuParseSecondaryStepperValue(
  value: string | undefined,
): number | null {
  if (!value) return null;
  const m = /^(\d+)/.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export type StoreMenuItem = {
  id: string;
  name: string;
  /** 未設定時は価格表示なし（○は注文確認画面） */
  price: number | null;
  image: string;
  category: StoreMenuCategory;
  /** 写真上に重ねるラベル（例: 人気商品） */
  badge?: string;
  /** 注文時に選ぶオプション（例: ドレッシング・おにぎりの種類） */
  dressingOptions?: readonly string[];
  /** dressingOptions の見出し（未指定時は「ドレッシング」） */
  optionLabel?: string;
  secondaryDressingOptions?: readonly string[];
  secondaryOptionLabel?: string;
  /** 2つ目の選択を ± で数える（例: グラス数） */
  secondaryOptionStepper?: StoreMenuSecondaryStepper;
  /** 種類ごとに価格が違う場合（例: おにぎり） */
  optionPrices?: Partial<Record<string, number>>;
  /** 白背景の瓶写真などは contain */
  imageFit?: "cover" | "contain";
  /** 横長バナー（ヒーローで 4:3 枠・白背景を使わない） */
  imageBanner?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  /** 選択肢を縦1列で表示 */
  dressingOptionsColumn?: boolean;
  /** テキストのみ商品を2列グリッドではなく全幅1行で表示 */
  menuListFullWidth?: boolean;
  /** 画像があってもカタログ順のグリッド／全幅フローに含める */
  menuCatalogInline?: boolean;
  /** 画像内に商品名があるためカード見出しを非表示 */
  hideCardName?: boolean;
  /** カテゴリ先頭など、写真上に名前がなく見出しを表示する */
  showCardName?: boolean;
};

export const GREEN_SALAD_DRESSINGS = ["ゴマ", "シーザー", "ワサビ"] as const;

export const ONIGIRI_KINDS = ["焼き", "梅干し", "明太"] as const;

/** public/store-menu を差し替えたら rev を上げる（ブラウザ・Next 画像キャッシュ対策） */
const STORE_MENU_IMAGE_REV = "20261112-monja";

const IMG = (n: number) =>
  `/store-menu/${String(n).padStart(2, "0")}.jpg?v=${STORE_MENU_IMAGE_REV}`;

export const STORE_MENU_CATEGORY_LABEL: Record<StoreMenuCategory, string> = {
  otsumami: "おつまみ",
  salad: "サラダ",
  okonomiyaki: "お好み焼き",
  monjayaki: "もんじゃ焼き",
  topping: "トッピング",
  teppanyaki: "鉄板焼き",
  fried: "揚げ物",
  rice: "ご飯",
  noodle: "麺",
  dessert: "デザート",
  drink_beer: "ビール",
  drink_hoppy: "ホッピー",
  drink_highball: "ハイボール",
  drink_wine: "ワイン",
  drink_cocktail: "カクテル",
  drink_sour: "サワー",
  drink_shochu_mugi: "焼酎（麦）",
  drink_shochu_imo: "焼酎（芋）",
  drink_mixer: "割りもの",
  drink_fruit: "果実酒",
};

/** カテゴリ見出し直下に表示する注記（任意） */
export const STORE_MENU_CATEGORY_NOTE: Partial<
  Record<StoreMenuCategory, string>
> = {
  okonomiyaki: "※焼いた状態でご提供となります",
  monjayaki: "※焼いた状態でご提供となります",
  topping: "お好み焼きに追加できます",
  dessert:
    "※鉄板ハニートーストのトッピングは「ハニートースト トッピング」から選択。食後のコーヒー類もこちらです",
  drink_highball: "※メガサイズは各商品＋150円",
  drink_cocktail: "※カクテルは割り方を選択してください",
  drink_sour: "※サワー・お茶ハイ等。メガサイズはスタッフへお声がけください",
  drink_shochu_mugi: "※割り方を選択してください",
  drink_shochu_imo: "※割り方を選択してください",
  drink_fruit: "※果実酒は割り方を選択してください",
  drink_mixer: "※ボトルキープのお供・ピッチャー",
};

const OKONOMIYAKI_TOPPING_MENU_ITEMS: StoreMenuItem[] = (
  [
    ["top_egg_medama", "卵（生・目玉焼き）", 150],
    ["top_onsen_tamago", "温玉", 150],
    ["top_tenkasu", "天かす", 150],
    ["top_baby_star", "ベビースター", 150],
    ["top_mochi", "餅", 150],
    ["top_curry_powder", "カレー粉", 200],
    ["top_shiso", "しそ", 200],
    ["top_sakura_ebi", "桜エビ", 200],
    ["top_oroshi_garlic", "おろしにんにく", 200],
    ["top_beni_shoga", "紅生姜", 200],
    ["top_umeboshi", "梅干し", 200],
    ["top_pork", "豚肉", 300],
    ["top_kimchi", "キムチ", 300],
    ["top_cheese", "チーズ", 300],
    ["top_hotate", "ホタテ", 400],
    ["top_kiri_ika", "きりイカ", 400],
    ["top_ebi", "えび", 400],
    ["top_ika", "いか", 400],
    ["top_soba", "そば", 400],
    ["top_mentaiko", "明太子", 500],
    ["top_gyusuji", "牛すじ", 500],
  ] as const
).map(([id, name, price]) => ({
  id,
  name,
  price,
  image: "",
  category: "topping" as const,
}));

const TEPPANYAKI_MENU_ITEMS: StoreMenuItem[] = (
  [
    ["dashimaki_tamago", "だし巻き卵", 33, 630],
    ["dashimaki_negi", "だし巻きねぎ", 36, 690],
    ["dashimaki_mentai_cheese", "だし巻き明太チーズ", 30, 880],
    ["ita_gyoza", "自家製板ぎょうざ", 31, 680],
    ["jaga_mentai_cheese", "じゃが明太チーズ", 34, 890],
    ["sunagimo_nagaimo_yuzu", "砂肝と長芋の柚子胡椒焼き", 32, 890],
    ["seseri_basil_chicken", "せせりのバジルチキン", 38, 880],
    ["tonpeiyaki", "とんぺい焼き", 37, 880],
    ["yakiniku_harami", "焼き肉屋さんの牛ハラミ", 35, 1250],
    ["ebi_ika_garlic_saute", "エビとイカのガーリックソテー", 41, 1020],
    ["hotate_asparagus_butter", "ホタテとアスパラのバター焼き", 40, 1200],
    ["ajillo_today", "本日のアヒージョ パン4枚付き", 39, 1280],
    ["buta_moyashi_oimayo", "豚ともやしのオイマヨ炒め", 42, 890],
    ["buta_tomato_tamago_chuka", "豚とトマトの卵中華炒め", 45, 890],
  ] as const
).map(([id, name, n, price]) => ({
  id,
  name,
  price,
  image: IMG(n),
  category: "teppanyaki" as const,
  ...(id === "dashimaki_tamago" ? { showCardName: true as const } : {}),
}));

export const STORE_MENU_ITEMS: StoreMenuItem[] = [
  {
    id: "celery_asazuke",
    name: "セロリの浅漬け",
    price: 520,
    image: IMG(1),
    category: "otsumami",
    showCardName: true,
  },
  {
    id: "ume_suisho",
    name: "梅水晶",
    price: 580,
    image: IMG(2),
    category: "otsumami",
  },
  {
    id: "kyuri_ipponzuke",
    name: "きゅうりの一本漬け",
    price: 480,
    image: IMG(3),
    category: "otsumami",
  },
  {
    id: "jikasei_chicken_ham",
    name: "自家製鶏ハム",
    price: 580,
    image: IMG(4),
    category: "otsumami",
  },
  {
    id: "jikasei_chicken_ham_half",
    name: "自家製鶏ハム（ハーフ）",
    price: 380,
    image: "",
    category: "otsumami",
  },
  {
    id: "edamame",
    name: "枝豆",
    price: 380,
    image: IMG(5),
    category: "otsumami",
  },
  {
    id: "quail_umezu",
    name: "ひと口うずらの旨酢漬け",
    price: 480,
    image: IMG(6),
    category: "otsumami",
  },
  {
    id: "quail_umezu_half",
    name: "ひと口うずらの旨酢漬け（ハーフ）",
    price: 380,
    image: "",
    category: "otsumami",
  },
  {
    id: "sunagimo_chanja",
    name: "おつまみ砂肝チャンジャ",
    price: 480,
    image: IMG(7),
    category: "otsumami",
  },
  {
    id: "karikari_cheese",
    name: "カリカリチーズ",
    price: 420,
    image: IMG(8),
    category: "otsumami",
  },
  {
    id: "tori_ume_kyuri",
    name: "鶏梅きゅう",
    price: 530,
    image: IMG(10),
    category: "otsumami",
  },
  {
    id: "nama_spring_roll",
    name: "生春巻き",
    price: 680,
    image: IMG(9),
    category: "otsumami",
  },
  {
    id: "green_salad",
    name: "グリーンサラダ",
    price: 830,
    image: IMG(44),
    category: "salad",
    showCardName: true,
    dressingOptions: GREEN_SALAD_DRESSINGS,
  },
  {
    id: "green_salad_half",
    name: "グリーンサラダ（ハーフ）",
    price: 430,
    image: "",
    category: "salad",
    dressingOptions: GREEN_SALAD_DRESSINGS,
  },
  {
    id: "choregi_salad",
    name: "チョレギサラダ",
    price: 830,
    image: IMG(12),
    category: "salad",
  },
  {
    id: "choregi_salad_half",
    name: "チョレギサラダ（ハーフ）",
    price: 430,
    image: "",
    category: "salad",
  },
  {
    id: "potato_salad",
    name: "ポテトサラダ",
    price: 510,
    image: IMG(11),
    category: "salad",
  },
  {
    id: "buta_tama",
    name: "豚玉",
    price: 1100,
    image: IMG(29),
    category: "okonomiyaki",
    showCardName: true,
    badge: "当店一番人気‼️",
  },
  {
    id: "ika_tama",
    name: "いか玉",
    price: 1200,
    image: IMG(25),
    category: "okonomiyaki",
  },
  {
    id: "mix_tama",
    name: "ミックス玉",
    price: 1550,
    image: IMG(26),
    category: "okonomiyaki",
  },
  {
    id: "ebi_tama",
    name: "えび玉",
    price: 1200,
    image: IMG(27),
    category: "okonomiyaki",
  },
  {
    id: "negi_buta_tama",
    name: "ねぎ豚玉",
    price: 1480,
    image: IMG(28),
    category: "okonomiyaki",
  },
  {
    id: "gyusuji_negi_yaki",
    name: "牛すじねぎ焼き",
    price: 1600,
    image: IMG(24),
    category: "okonomiyaki",
  },
  {
    id: "monja_mentai_mochi_cheese",
    name: "明太もちチーズもんじゃ",
    price: 1600,
    image: IMG(51),
    category: "monjayaki",
    badge: "一番人気‼️",
  },
  {
    id: "monja_buta",
    name: "ぶたもんじゃ",
    price: 1300,
    image: IMG(47),
    category: "monjayaki",
  },
  {
    id: "monja_mix",
    name: "ミックスもんじゃ",
    price: 1650,
    image: IMG(48),
    category: "monjayaki",
  },
  {
    id: "monja_baby_star",
    name: "ベビースターもんじゃ",
    price: 1050,
    image: IMG(49),
    category: "monjayaki",
  },
  {
    id: "monja_negi_shio_buta",
    name: "ねぎ塩豚もんじゃ",
    price: 1350,
    image: IMG(52),
    category: "monjayaki",
  },
  {
    id: "monja_curry_cheese",
    name: "カレーチーズもんじゃ",
    price: 1450,
    image: IMG(53),
    category: "monjayaki",
  },
  ...OKONOMIYAKI_TOPPING_MENU_ITEMS,
  ...TEPPANYAKI_MENU_ITEMS,
  {
    id: "kamurado_karaage",
    name: "かむらどの特製からあげ",
    price: 790,
    image: IMG(13),
    category: "fried",
    showCardName: true,
  },
  {
    id: "french_fries",
    name: "フライドポテト",
    price: 530,
    image: IMG(14),
    category: "fried",
  },
  {
    id: "fries_chili_garlic",
    name: "フライドポテト チリガーリックスパイス",
    price: 580,
    image: IMG(15),
    category: "fried",
  },
  {
    id: "fries_ika_shiokara_butter",
    name: "フライドポテト イカの塩辛バター",
    price: 680,
    image: IMG(14),
    category: "fried",
  },
  {
    id: "kamurado_karaage_half",
    name: "かむらどの特製からあげ（ハーフ2個）",
    price: 510,
    image: "",
    category: "fried",
  },
  {
    id: "satoimo_karaage",
    name: "里芋のから揚げ",
    price: 610,
    image: IMG(16),
    category: "fried",
  },
  {
    id: "chicken_nanban_half",
    name: "チキン南蛮（ハーフ）",
    price: 550,
    image: "",
    category: "fried",
  },
  {
    id: "chicken_nanban",
    name: "チキン南蛮",
    price: 950,
    image: IMG(43),
    category: "fried",
  },
  {
    id: "takana_chahan",
    name: "高菜チャーハン",
    price: 1130,
    image: IMG(19),
    category: "rice",
    showCardName: true,
  },
  {
    id: "kimchi_chahan",
    name: "キムチチャーハン",
    price: 1200,
    image: IMG(17),
    category: "rice",
  },
  {
    id: "garlic_rice",
    name: "ガーリックライス",
    price: 1080,
    image: IMG(46),
    category: "rice",
  },
  {
    id: "mentai_butter_rice",
    name: "明太バターライス",
    price: 1130,
    image: IMG(18),
    category: "rice",
  },
  {
    id: "onigiri_various",
    name: "おにぎり各種",
    price: 430,
    image: IMG(20),
    category: "rice",
    optionLabel: "種類",
    dressingOptions: ONIGIRI_KINDS,
    optionPrices: {
      焼き: 430,
      梅干し: 430,
      明太: 480,
    },
  },
  {
    id: "rice_large",
    name: "ライス（大）",
    price: 300,
    image: "",
    category: "rice",
  },
  {
    id: "rice_medium",
    name: "ライス（中）",
    price: 200,
    image: "",
    category: "rice",
  },
  {
    id: "rice_small",
    name: "ライス（小）",
    price: 150,
    image: "",
    category: "rice",
  },
  {
    id: "gyusuji_yakisoba",
    name: "牛すじ焼きそば",
    price: 1700,
    image: IMG(21),
    category: "noodle",
  },
  {
    id: "sauce_yakisoba",
    name: "ソース焼きそば",
    price: 1200,
    image: IMG(22),
    category: "noodle",
  },
  {
    id: "negi_shio_yakisoba",
    name: "ねぎ塩焼きそば",
    price: 1400,
    image: IMG(23),
    category: "noodle",
  },
  {
    id: "yakisoba_medama_topping",
    name: "目玉焼きトッピング",
    price: 150,
    image: "",
    category: "noodle",
  },
  ...DESSERT_MENU_ITEMS,
  ...DRINK_MENU_ITEMS,
];

const STORE_MENU_NAMED_PHOTO_FOOD_CATEGORIES = new Set<StoreMenuCategory>([
  "otsumami",
  "salad",
  "okonomiyaki",
  "monjayaki",
  "teppanyaki",
  "fried",
  "rice",
]);

/** 写真に商品名が入っている想定（おつまみ〜ご飯など） */
export function storeMenuShouldHideCardName(item: StoreMenuItem): boolean {
  if (item.showCardName) return false;
  if (item.hideCardName) return true;
  if (!item.image.trim()) return false;
  return STORE_MENU_NAMED_PHOTO_FOOD_CATEGORIES.has(item.category);
}

export type StoreMenuNameSegment = { text: string; keepTogether: boolean };

/** 表示用に半角括弧を全角へそろえる */
export function normalizeStoreMenuDisplayName(name: string): string {
  return name.replace(/\(/g, "（").replace(/\)/g, "）");
}

/** 「（12年）」など括弧内で不自然に改行しないよう分割 */
export function storeMenuNameSegments(name: string): StoreMenuNameSegment[] {
  const normalized = normalizeStoreMenuDisplayName(name);
  const parts = normalized.split(/(（[^）]+）)/).filter((p) => p.length > 0);
  return parts.map((text) => ({
    text,
    keepTogether: /^（[^）]+）$/.test(text),
  }));
}

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

export function storeCartDressingSummary(line: Pick<
  StoreCartLine,
  "dressing" | "secondaryDressing"
>): string {
  return [line.dressing, line.secondaryDressing].filter(Boolean).join(" / ");
}

function storeCartDisplayName(
  catalog: StoreMenuItem,
  dressing?: string,
  secondaryDressing?: string,
): string {
  const parts: string[] = [];
  if (catalog.dressingOptions?.length && dressing) {
    const label = catalog.optionLabel ?? "ドレッシング";
    parts.push(`${label}:${dressing}`);
  }
  if (
    secondaryDressing &&
    (catalog.secondaryDressingOptions?.length || catalog.secondaryOptionStepper)
  ) {
    const label = catalog.secondaryOptionLabel ?? "オプション";
    parts.push(`${label}:${secondaryDressing}`);
  }
  if (parts.length) {
    return normalizeStoreMenuDisplayName(
      `${catalog.name}（${parts.join("・")}）`,
    );
  }
  return normalizeStoreMenuDisplayName(catalog.name);
}

export function storeMenuItemUnitPrice(
  item: StoreMenuItem,
  option?: string,
): number | null {
  if (option && item.optionPrices?.[option] != null) {
    return item.optionPrices[option]!;
  }
  return item.price;
}

export function storeMenuCategoryForItemId(
  id: string,
): StoreMenuCategory | null {
  return STORE_MENU_ITEMS.find((m) => m.id === id)?.category ?? null;
}

export function isStoreMenuItemDrink(category: StoreMenuCategory): boolean {
  return category.startsWith("drink_");
}

export function syncStoreCartWithCatalog(items: StoreCartLine[]): StoreCartLine[] {
  return items.map((line) => {
    const catalog = STORE_MENU_ITEMS.find((m) => m.id === line.id);
    if (!catalog) return line;
    const dressing = line.dressing;
    const secondaryDressing = line.secondaryDressing;
    const price = storeMenuItemUnitPrice(catalog, dressing);
    return {
      ...line,
      name: storeCartDisplayName(catalog, dressing, secondaryDressing),
      price,
      image: catalog.image || line.image,
      dressing,
    };
  });
}
