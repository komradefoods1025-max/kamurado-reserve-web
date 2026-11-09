import type { StoreMenuItem } from "./storeMenuCatalog";

const SHOCHU_SPLITS = [
  "ストレート",
  "ロック",
  "水割り",
  "お湯割り",
  "ソーダ割り",
] as const;

const FRUIT_LIQUOR_SPLITS = [...SHOCHU_SPLITS] as const;

const CASSIS_MIX = ["ウーロン", "ソーダ", "オレンジ", "ミルク"] as const;
const PEACH_MIX = ["ウーロン", "ソーダ", "オレンジ", "コーク", "ミルク"] as const;
const CAMPARI_MIX = ["ソーダ", "オレンジ", "コーク"] as const;
const MALIBU_MIX = [...PEACH_MIX] as const;
const KAHLUA_MIX = [...PEACH_MIX, "ホット"] as const;

function item(
  category: "drink" | "dessert",
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
  id: string,
  name: string,
  price: number,
): StoreMenuItem {
  return item("drink", id, name, price, {
    optionLabel: "割り方",
    dressingOptions: SHOCHU_SPLITS,
  });
}

function fruitLiquor(id: string, name: string, price: number): StoreMenuItem {
  return item("drink", id, name, price, {
    optionLabel: "割り方",
    dressingOptions: FRUIT_LIQUOR_SPLITS,
  });
}

function cocktail(
  id: string,
  name: string,
  mixers: readonly string[],
): StoreMenuItem {
  return item("drink", id, name, 600, {
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

export const DRINK_MENU_ITEMS: StoreMenuItem[] = [
  // ハイボール
  item("drink", "kaku_highball", "角ハイボール", 600),
  item("drink", "black_nikka_highball", "ブラックニッカハイボール", 520),
  item("drink", "ginger_highball", "ジンジャーハイボール", 620),
  item("drink", "coke_highball", "コークハイボール", 620),
  item("drink", "riku_highball", "陸ハイボール", 750),
  item("drink", "chita_highball", "知多ハイボール", 800),
  item("drink", "yamazaki_highball_nv", "山崎ハイボール（NV）", 1100),
  item("drink", "yamazaki_highball_12", "山崎ハイボール（12年）", 2200),
  item("drink", "hakushu_highball_nv", "白州ハイボール（NV）", 1100),
  item("drink", "hakushu_highball_12", "白州ハイボール（12年）", 2200),
  // ホッピー
  item("drink", "hoppy_white_black", "ホッピー 白／黒", 500),
  item("drink", "hoppy_soto", "ホッピー 外", 300),
  item("drink", "hoppy_naka", "ホッピー 中", 250),
  // ビール
  item("drink", "nama_beer_medium", "生ビール 中ジョッキ", 600),
  item("drink", "nama_beer_small", "生ビール 小ジョッキ", 530),
  item("drink", "bottle_beer", "瓶ビール", 750),
  // 生搾りサワー
  item("drink", "fresh_lemon_sour", "生レモンサワー", 600),
  item("drink", "fresh_grapefruit_sour", "生グレープフルーツサワー", 650),
  // お茶ハイ
  item("drink", "oolong_hai", "ウーロンハイ", 500),
  item("drink", "green_tea_hai", "緑茶ハイ", 500),
  item("drink", "jasmine_hai", "ジャスミンハイ", 520),
  item("drink", "sugar_free_hai", "無糖ハイ", 520),
  // 焼酎 麦
  shochu("shochu_iichiko", "いいちこ", 580),
  shochu("shochu_nikaido", "二階堂", 650),
  shochu("shochu_nakanaka", "中々", 780),
  // 焼酎 芋
  shochu("shochu_kurokirishima", "黒霧島", 650),
  shochu("shochu_tominohozan", "富乃宝山", 650),
  shochu("shochu_akato", "赤兎馬", 780),
  // ボトルのお供
  item("drink", "bottle_umeboshi", "ボトル用 梅干し（1個）", 110),
  item("drink", "bottle_lemon", "ボトル用 カットレモン（1個）", 300),
  item("drink", "bottle_ice", "ボトル用 氷", 150),
  item("drink", "bottle_water", "ボトル用 ミネラルウォーター", 150),
  item("drink", "soda_pitcher", "炭酸ピッチャー", 500),
  item("drink", "oolong_pitcher", "ウーロンピッチャー", 500),
  item("drink", "jasmine_pitcher", "ジャスミンピッチャー", 550),
  item("drink", "green_tea_pitcher", "緑茶ピッチャー", 500),
  item("drink", "sugar_free_pitcher", "無糖ピッチャー", 550),
  // ワイン
  item("drink", "wine_glass_red", "グラスワイン 赤", 580),
  item("drink", "wine_glass_white", "グラスワイン 白", 580),
  item("drink", "wine_decanter_red", "デキャンタ 赤", 2500),
  item("drink", "wine_decanter_white", "デキャンタ 白", 2500),
  // 果実酒
  fruitLiquor("fruit_ume", "梅酒", 630),
  fruitLiquor("fruit_apricot", "あんず酒", 630),
  fruitLiquor("fruit_lychee", "ライチ酒", 630),
  fruitLiquor("fruit_shikuwasa", "シークワーサー酒", 630),
  fruitLiquor("fruit_oni_kiwi", "鬼おろしキウイ", 680),
  fruitLiquor("fruit_oni_pine", "鬼おろしパイン", 680),
  fruitLiquor("fruit_oni_peach", "鬼おろしもも", 680),
  fruitLiquor("fruit_oni_mikan", "鬼おろしみかん", 680),
  // サワー
  item("drink", "sour_plain_chuhai", "プレーン酎ハイ", 500),
  item("drink", "sour_ginon_lemon", "無糖レモンサワー ジノン", 520),
  item("drink", "sour_lemon", "レモンサワー", 520),
  item("drink", "sour_umeboshi", "梅干しサワー", 520),
  item("drink", "sour_citric", "クエン酸サワー", 520),
  item("drink", "sour_kyoho", "巨峰サワー", 520),
  item("drink", "sour_mango", "マンゴーサワー", 580),
  item("drink", "sour_otokoume", "男梅サワー", 520),
  item("drink", "sour_tomato", "トマトハイ", 550),
  // カクテル
  cocktail("cocktail_cassis", "カシス", CASSIS_MIX),
  cocktail("cocktail_peach", "ピーチ", PEACH_MIX),
  cocktail("cocktail_campari", "カンパリ", CAMPARI_MIX),
  cocktail("cocktail_malibu", "マリブ", MALIBU_MIX),
  cocktail("cocktail_kahlua", "カルーア", KAHLUA_MIX),
];
