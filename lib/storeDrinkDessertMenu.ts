import type { StoreMenuItem } from "./storeMenuCatalog";

type DrinkCategory =
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

const SHOCHU_SPLITS = [
  "ストレート",
  "ロック",
  "水割り",
  "お湯割り",
  "ソーダ割り",
] as const;

const FRUIT_LIQUOR_SPLITS = [...SHOCHU_SPLITS] as const;

const WINE_COLORS = ["赤", "白"] as const;

const BOTTLE_BEER_BRANDS = [
  "アサヒ マルエフ",
  "サッポロ 赤星",
  "麒麟 晴れ風",
] as const;

const NAMA_BEER_SIZES = ["小ジョッキ", "中ジョッキ", "メガ"] as const;

const HIGHBALL_SIZES = ["レギュラー", "メガ"] as const;
const HIGHBALL_MEGA_SURCHARGE = 150;

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

const SHOCHU_BOTTLE_PHOTO = {
  imageFit: "contain" as const,
  imageBanner: true,
  imageWidth: 640,
  imageHeight: 640,
};

function shochu(
  category: "drink_shochu_mugi" | "drink_shochu_imo",
  id: string,
  name: string,
  price: number,
  extra?: Partial<StoreMenuItem>,
): StoreMenuItem {
  return item(category, id, name, price, {
    optionLabel: "割り方",
    dressingOptions: SHOCHU_SPLITS,
    ...extra,
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
  extra?: Partial<StoreMenuItem>,
): StoreMenuItem {
  return item("drink_cocktail", id, name, 600, {
    optionLabel: "割り方",
    dressingOptions: mixers,
    ...extra,
  });
}

function highball(
  id: string,
  name: string,
  price: number,
  extra?: Partial<StoreMenuItem>,
): StoreMenuItem {
  return item("drink_highball", id, name, price, {
    optionLabel: "サイズ",
    dressingOptions: HIGHBALL_SIZES,
    optionPrices: {
      レギュラー: price,
      メガ: price + HIGHBALL_MEGA_SURCHARGE,
    },
    hideCardName: true,
    ...extra,
  });
}

function sour(
  id: string,
  name: string,
  price: number,
  extra?: Partial<StoreMenuItem>,
): StoreMenuItem {
  return item("drink_sour", id, name, price, {
    optionLabel: "サイズ",
    dressingOptions: HIGHBALL_SIZES,
    optionPrices: {
      レギュラー: price,
      メガ: price + HIGHBALL_MEGA_SURCHARGE,
    },
    ...extra,
  });
}

const ICE_CREAM_FLAVORS = ["バニラ", "抹茶"] as const;

const HONEY_TOAST_TOPPINGS = [
  "チョコソース",
  "はちみつ",
  "ホイップ",
  "バニラアイス",
] as const;

export const DESSERT_MENU_ITEMS: StoreMenuItem[] = [
  item("dessert", "mochi_anko_yaki", "もちあんこ焼き", 550),
  item("dessert", "ice_cream", "アイスクリーム", 380, {
    optionLabel: "種類",
    dressingOptions: ICE_CREAM_FLAVORS,
  }),
  item("dessert", "honey_toast", "鉄板ハニートースト", 680, {
    menuListFullWidth: true,
    image: "/store-menu/honey-toast.png?v=20261112",
    imageWidth: 500,
    imageHeight: 500,
    showCardName: true,
  }),
  item("dessert", "honey_toast_topping", "ハニートースト トッピング", 50, {
    optionLabel: "種類",
    dressingOptions: HONEY_TOAST_TOPPINGS,
    dressingOptionsColumn: true,
    menuListFullWidth: true,
    optionPrices: {
      チョコソース: 50,
      はちみつ: 50,
      ホイップ: 100,
      バニラアイス: 150,
    },
  }),
  item("dessert", "hotteok", "ホットク", 680),
  item("dessert", "hot_coffee", "ホットコーヒー", 300),
  item("dessert", "ice_coffee", "アイスコーヒー", 350),
  item("dessert", "cappuccino", "カプチーノ", 400, {
    image: "/store-menu/cappuccino.png?v=20261112",
    imageWidth: 500,
    imageHeight: 500,
    menuCatalogInline: true,
    hideCardName: true,
  }),
  item("dessert", "espresso", "エスプレッソ", 200, {
    image: "/store-menu/espresso.png?v=20261112",
    imageWidth: 500,
    imageHeight: 500,
    menuCatalogInline: true,
    hideCardName: true,
  }),
  item("dessert", "latte_macchiato", "ラテマキアート", 500),
];

const DRINK_BEER: StoreMenuItem[] = [
  item("drink_beer", "nama_beer", "生ビール", 600, {
    image: "/store-menu/nama-beer-medium.png?v=20261112c",
    imageFit: "contain",
    optionLabel: "サイズ",
    dressingOptions: NAMA_BEER_SIZES,
    optionPrices: {
      小ジョッキ: 530,
      中ジョッキ: 600,
      メガ: 750,
    },
  }),
  item("drink_beer", "bottle_beer", "瓶ビール", 750, {
    image: "/store-menu/bottle-beer.png?v=20261112",
    imageFit: "contain",
    optionLabel: "銘柄",
    dressingOptions: BOTTLE_BEER_BRANDS,
    secondaryOptionLabel: "グラス",
    secondaryOptionStepper: { min: 0, max: 12, default: 1 },
  }),
];

const DRINK_HOPPY: StoreMenuItem[] = [
  item("drink_hoppy", "hoppy_white", "ホッピー 白", 500, {
    image: "/store-menu/hoppy-black.png?v=20261112swap",
    imageFit: "contain",
  }),
  item("drink_hoppy", "hoppy_black", "ホッピー 黒", 500, {
    image: "/store-menu/hoppy-white.png?v=20261112swap",
    imageFit: "contain",
  }),
  item("drink_hoppy", "hoppy_soto", "ホッピー 外", 300),
  item("drink_hoppy", "hoppy_naka", "ホッピー 中", 250),
];

const DRINK_HIGHBALL: StoreMenuItem[] = [
  highball("kaku_highball", "角ハイボール", 600, {
    image: "/store-menu/kaku-highball.png?v=20261112",
    imageFit: "contain",
    imageBanner: true,
    imageWidth: 750,
    imageHeight: 264,
  }),
  highball("black_nikka_highball", "ブラックニッカハイボール", 520, {
    image: "/store-menu/black-nikka-highball.png?v=20261112b",
    imageFit: "contain",
    imageBanner: true,
    imageWidth: 970,
    imageHeight: 408,
  }),
  highball("ginger_highball", "ジンジャーハイボール", 620, {
    showCardName: true,
  }),
  highball("coke_highball", "コークハイボール", 620, {
    showCardName: true,
  }),
  highball("riku_highball", "陸ハイボール", 750, {
    image: "/store-menu/riku-highball.png?v=20261112",
    imageFit: "contain",
    imageBanner: true,
    imageWidth: 738,
    imageHeight: 387,
  }),
  highball("chita_highball", "知多ハイボール", 800, {
    image: "/store-menu/chita-highball.png?v=20261112",
    imageFit: "contain",
    imageBanner: true,
    imageWidth: 617,
    imageHeight: 324,
  }),
  item("drink_highball", "yamazaki_highball_nv", "山崎ハイボール（NV）", 1100),
  item("drink_highball", "yamazaki_highball_12", "山崎ハイボール（12年）", 2200),
  item("drink_highball", "hakushu_highball_nv", "白州ハイボール（NV）", 1100),
  item("drink_highball", "hakushu_highball_12", "白州ハイボール（12年）", 2200),
];

const DRINK_WINE: StoreMenuItem[] = [
  item("drink_wine", "wine_glass", "グラスワイン", 580, {
    image: "/store-menu/wine.png?v=20261112",
    imageFit: "contain",
    imageBanner: true,
    imageWidth: 760,
    imageHeight: 507,
    optionLabel: "種類",
    dressingOptions: WINE_COLORS,
  }),
  item("drink_wine", "wine_decanter", "デキャンタ", 2500, {
    optionLabel: "種類",
    dressingOptions: WINE_COLORS,
  }),
];

const DRINK_COCKTAIL: StoreMenuItem[] = [
  cocktail("cocktail_cassis", "カシス", CASSIS_MIX, {
    image: "/store-menu/cocktail-cassis.jpg?v=20261112",
    imageFit: "contain",
    imageWidth: 1024,
    imageHeight: 1024,
  }),
  cocktail("cocktail_peach", "ピーチ", PEACH_MIX, {
    image: "/store-menu/cocktail-peach.png?v=20261112",
    imageFit: "contain",
    imageWidth: 500,
    imageHeight: 405,
  }),
  cocktail("cocktail_campari", "カンパリ", CAMPARI_MIX, {
    image: "/store-menu/cocktail-campari.png?v=20261112",
    imageFit: "contain",
    imageWidth: 239,
    imageHeight: 1000,
  }),
  cocktail("cocktail_malibu", "マリブ", MALIBU_MIX, {
    image: "/store-menu/cocktail-malibu.png?v=20261112",
    imageFit: "contain",
    imageWidth: 610,
    imageHeight: 920,
  }),
  cocktail("cocktail_kahlua", "カルーア", KAHLUA_MIX, {
    image: "/store-menu/cocktail-kahlua.png?v=20261112",
    imageFit: "contain",
    imageWidth: 500,
    imageHeight: 500,
  }),
];

const DRINK_SOUR: StoreMenuItem[] = [
  sour("fresh_lemon_sour", "生レモンサワー", 600),
  sour("fresh_grapefruit_sour", "生グレープフルーツサワー", 650),
  sour("oolong_hai", "ウーロンハイ", 500),
  sour("green_tea_hai", "緑茶ハイ", 500),
  sour("jasmine_hai", "ジャスミンハイ", 520),
  sour("sugar_free_hai", "無糖ハイ", 520),
  sour("sour_plain_chuhai", "プレーン酎ハイ", 500),
  sour("sour_ginon_lemon", "無糖レモンサワー ジノン", 520),
  sour("sour_lemon", "レモンサワー", 520),
  sour("sour_umeboshi", "梅干しサワー", 520),
  sour("sour_citric", "クエン酸サワー", 520),
  sour("sour_kyoho", "巨峰サワー", 520),
  sour("sour_mango", "マンゴーサワー", 580),
  sour("sour_otokoume", "男梅サワー", 520),
  sour("sour_tomato", "トマトハイ", 550),
];

const DRINK_SHOCHU_MUGI: StoreMenuItem[] = [
  shochu("drink_shochu_mugi", "shochu_iichiko", "いいちこ", 580, {
    image: "/store-menu/shochu-iichiko.png?v=20261112",
    showCardName: true,
    ...SHOCHU_BOTTLE_PHOTO,
  }),
  shochu("drink_shochu_mugi", "shochu_nikaido", "二階堂", 650, {
    image: "/store-menu/shochu-nikaido.png?v=20261113",
    showCardName: true,
    ...SHOCHU_BOTTLE_PHOTO,
  }),
  shochu("drink_shochu_mugi", "shochu_nakanaka", "中々", 780, {
    image: "/store-menu/shochu-nakanaka.png?v=20261113c",
    showCardName: true,
    ...SHOCHU_BOTTLE_PHOTO,
  }),
];

const DRINK_SHOCHU_IMO: StoreMenuItem[] = [
  shochu("drink_shochu_imo", "shochu_kurokirishima", "黒霧島", 650, {
    image: "/store-menu/shochu-kurokirishima.png?v=20261113",
    showCardName: true,
    ...SHOCHU_BOTTLE_PHOTO,
  }),
  shochu("drink_shochu_imo", "shochu_tominohozan", "富乃宝山", 650, {
    image: "/store-menu/shochu-tominohozan.png?v=20261113c",
    showCardName: true,
    ...SHOCHU_BOTTLE_PHOTO,
  }),
  shochu("drink_shochu_imo", "shochu_akato", "赤兎馬", 780, {
    image: "/store-menu/shochu-akato.png?v=20261113",
    showCardName: true,
    ...SHOCHU_BOTTLE_PHOTO,
  }),
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
  ...DRINK_HOPPY,
  ...DRINK_HIGHBALL,
  ...DRINK_WINE,
  ...DRINK_COCKTAIL,
  ...DRINK_SOUR,
  ...DRINK_SHOCHU_MUGI,
  ...DRINK_SHOCHU_IMO,
  ...DRINK_MIXER,
  ...DRINK_FRUIT,
];
