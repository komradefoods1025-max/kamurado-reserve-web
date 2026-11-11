import type { StoreMenuItem } from "./storeMenuCatalog";

type DrinkCategory =
  | "drink_beer"
  | "drink_cocktail"
  | "drink_sour"
  | "drink_shochu_mugi"
  | "drink_shochu_imo"
  | "drink_mixer"
  | "drink_fruit";

const SHOCHU_SPLITS = [
  "ストレート",
  "ロック",
  "水割り",
  "お湯割り",
  "ソーダ割り",
] as const;

const FRUIT_LIQUOR_SPLITS = [...SHOCHU_SPLITS] as const;

const BOTTLE_BEER_BRANDS = [
  "アサヒ マルエフ",
  "麒麟 晴れ風",
  "サッポロ 赤星",
] as const;

const CASSIS_MIX = ["ウーロン", "ソーダ", "オレンジ", "ミルク"] as const;
const PEACH_MIX = ["ウーロン", "ソーダ", "オレンジ", "コーク", "ミルク"] as const;
const CAMPARI_MIX = ["ソーダ", "オレンジ", "コーク"] as const;
const MALIBU_MIX = [...PEACH_MIX] as const;
const KAHLUA_MIX = [...PEACH_MIX, "ホット"] as const;

function item(
  category: DrinkCategory | "dessert",
  id: string,
  name: string,
  price: number,
  extra?: Partial<StoreMenuItem>,
): StoreMenuItem {
  return {
    id,
    name,
    price,
    image: "",
    category,
    ...extra,
  };
}

function shochu(
  category: "drink_shochu_mugi" | "drink_shochu_imo",
  id: string,
  name: string,
  price: number,
): StoreMenuItem {
  return item(category, id, name, price, {
    optionLabel: "割り方",
    dressingOptions: SHOCHU_SPLITS,
  });
}

function fruitLiquor(id: string, name: string, price: number): StoreMenuItem {
  return item("drink_fruit", id, name, price, {
    optionLabel: "割り方",
    dressingOptions: FRUIT_LIQUOR_SPLITS,
  });
}

function cocktail(
  id: string,
  name: string,
  mixers: readonly string[],
): StoreMenuItem {
  return item("drink_cocktail", id, name, 600, {
    optionLabel: "割り方",
    dressingOptions: mixers,
  });
}

export const DESSERT_MENU_ITEMS: StoreMenuItem[] = [
  item("dessert", "mochi_anko_yaki", "もちあんこ焼き", 550),
  item("dessert", "vanilla_ice", "バニラアイス", 380),
  item("dessert", "matcha_ice", "抹茶アイス", 380),
  item("dessert", "honey_toast", "鉄板ハニートースト", 680),
  item("dessert", "hotteok", "ホットク", 680),
  item("dessert", "honey_toast_choco", "ハニートースト チョコソース", 50),
  item("dessert", "honey_toast_honey", "ハニートースト はちみつ", 50),
  item("dessert", "honey_toast_whip", "ハニートースト ホイップ", 100),
  item("dessert", "honey_toast_ice", "ハニートースト バニラアイス", 150),
  item("dessert", "hot_coffee", "ホットコーヒー", 300),
  item("dessert", "ice_coffee", "アイスコーヒー", 350),
  item("dessert", "cappuccino", "カプチーノ", 400),
  item("dessert", "espresso", "エスプレッソ", 200),
  item("dessert", "latte_macchiato", "ラテマキアート", 500),
];

const DRINK_BEER: StoreMenuItem[] = [
  item("drink_beer", "nama_beer_medium", "生ビール 中ジョッキ", 600),
  item("drink_beer", "nama_beer_small", "生ビール 小ジョッキ", 530),
  item("drink_beer", "bottle_beer", "瓶ビール", 750, {
    image: "/store-menu/bottle-beer.png?v=20261112",
    optionLabel: "銘柄",
    dressingOptions: BOTTLE_BEER_BRANDS,
  }),
  item("drink_beer", "hoppy_white_black", "ホッピー 白／黒", 500),
  item("drink_beer", "hoppy_soto", "ホッピー 外", 300),
  item("drink_beer", "hoppy_naka", "ホッピー 中", 250),
];

const DRINK_COCKTAIL: StoreMenuItem[] = [
  item("drink_cocktail", "kaku_highball", "角ハイボール", 600),
  item("drink_cocktail", "black_nikka_highball", "ブラックニッカハイボール", 520),
  item("drink_cocktail", "ginger_highball", "ジンジャーハイボール", 620),
  item("drink_cocktail", "coke_highball", "コークハイボール", 620),
  item("drink_cocktail", "riku_highball", "陸ハイボール", 750),
  item("drink_cocktail", "chita_highball", "知多ハイボール", 800),
  item("drink_cocktail", "yamazaki_highball_nv", "山崎ハイボール（NV）", 1100),
  item("drink_cocktail", "yamazaki_highball_12", "山崎ハイボール（12年）", 2200),
  item("drink_cocktail", "hakushu_highball_nv", "白州ハイボール（NV）", 1100),
  item("drink_cocktail", "hakushu_highball_12", "白州ハイボール（12年）", 2200),
  item("drink_cocktail", "wine_glass_red", "グラスワイン 赤", 580),
  item("drink_cocktail", "wine_glass_white", "グラスワイン 白", 580),
  item("drink_cocktail", "wine_decanter_red", "デキャンタ 赤", 2500),
  item("drink_cocktail", "wine_decanter_white", "デキャンタ 白", 2500),
  cocktail("cocktail_cassis", "カシス", CASSIS_MIX),
  cocktail("cocktail_peach", "ピーチ", PEACH_MIX),
  cocktail("cocktail_campari", "カンパリ", CAMPARI_MIX),
  cocktail("cocktail_malibu", "マリブ", MALIBU_MIX),
  cocktail("cocktail_kahlua", "カルーア", KAHLUA_MIX),
];

const DRINK_SOUR: StoreMenuItem[] = [
  item("drink_sour", "fresh_lemon_sour", "生レモンサワー", 600),
  item("drink_sour", "fresh_grapefruit_sour", "生グレープフルーツサワー", 650),
  item("drink_sour", "oolong_hai", "ウーロンハイ", 500),
  item("drink_sour", "green_tea_hai", "緑茶ハイ", 500),
  item("drink_sour", "jasmine_hai", "ジャスミンハイ", 520),
  item("drink_sour", "sugar_free_hai", "無糖ハイ", 520),
  item("drink_sour", "sour_plain_chuhai", "プレーン酎ハイ", 500),
  item("drink_sour", "sour_ginon_lemon", "無糖レモンサワー ジノン", 520),
  item("drink_sour", "sour_lemon", "レモンサワー", 520),
  item("drink_sour", "sour_umeboshi", "梅干しサワー", 520),
  item("drink_sour", "sour_citric", "クエン酸サワー", 520),
  item("drink_sour", "sour_kyoho", "巨峰サワー", 520),
  item("drink_sour", "sour_mango", "マンゴーサワー", 580),
  item("drink_sour", "sour_otokoume", "男梅サワー", 520),
  item("drink_sour", "sour_tomato", "トマトハイ", 550),
];

const DRINK_SHOCHU_MUGI: StoreMenuItem[] = [
  shochu("drink_shochu_mugi", "shochu_iichiko", "いいちこ", 580),
  shochu("drink_shochu_mugi", "shochu_nikaido", "二階堂", 650),
  shochu("drink_shochu_mugi", "shochu_nakanaka", "中々", 780),
];

const DRINK_SHOCHU_IMO: StoreMenuItem[] = [
  shochu("drink_shochu_imo", "shochu_kurokirishima", "黒霧島", 650),
  shochu("drink_shochu_imo", "shochu_tominohozan", "富乃宝山", 650),
  shochu("drink_shochu_imo", "shochu_akato", "赤兎馬", 780),
];

const DRINK_MIXER: StoreMenuItem[] = [
  item("drink_mixer", "bottle_umeboshi", "梅干し（1個）", 110),
  item("drink_mixer", "bottle_lemon", "カットレモン（1個）", 300),
  item("drink_mixer", "bottle_ice", "氷", 150),
  item("drink_mixer", "bottle_water", "ミネラルウォーター", 150),
  item("drink_mixer", "soda_pitcher", "炭酸ピッチャー", 500),
  item("drink_mixer", "oolong_pitcher", "ウーロンピッチャー", 500),
  item("drink_mixer", "jasmine_pitcher", "ジャスミンピッチャー", 550),
  item("drink_mixer", "green_tea_pitcher", "緑茶ピッチャー", 500),
  item("drink_mixer", "sugar_free_pitcher", "無糖ピッチャー", 550),
];

const DRINK_FRUIT: StoreMenuItem[] = [
  fruitLiquor("fruit_ume", "梅酒", 630),
  fruitLiquor("fruit_apricot", "あんず酒", 630),
  fruitLiquor("fruit_lychee", "ライチ酒", 630),
  fruitLiquor("fruit_shikuwasa", "シークワーサー酒", 630),
  fruitLiquor("fruit_oni_kiwi", "鬼おろしキウイ", 680),
  fruitLiquor("fruit_oni_pine", "鬼おろしパイン", 680),
  fruitLiquor("fruit_oni_peach", "鬼おろしもも", 680),
  fruitLiquor("fruit_oni_mikan", "鬼おろしみかん", 680),
];

export const DRINK_MENU_ITEMS: StoreMenuItem[] = [
  ...DRINK_BEER,
  ...DRINK_COCKTAIL,
  ...DRINK_SOUR,
  ...DRINK_SHOCHU_MUGI,
  ...DRINK_SHOCHU_IMO,
  ...DRINK_MIXER,
  ...DRINK_FRUIT,
];
