import type { StoreMenuItem } from "./storeMenuCatalog";
import {
  CAMPARI_MIX,
  CASSIS_MIX,
  KAHLUA_MIX,
  MALIBU_MIX,
  PEACH_MIX,
} from "./storeDrinkDessertMenu";

export const NOMIHOUDAI_REGIONS = [
  "ビール",
  "ハイボール",
  "サワー",
  "果実酒",
  "焼酎",
  "お茶ハイ",
  "グラスワイン",
  "梅酒",
  "日本酒",
  "カクテル",
  "ソフトドリンク",
] as const;

const NOMI_SPLITS = [
  "ロック",
  "ストレート",
  "水割り",
  "ソーダ割り",
] as const;

const WINE_COLORS = ["赤", "白"] as const;

function nomi(
  region: (typeof NOMIHOUDAI_REGIONS)[number],
  id: string,
  name: string,
  extra?: Partial<StoreMenuItem>,
): StoreMenuItem {
  return {
    id,
    name,
    price: 0,
    image: "",
    category: "drink_nomihoudai",
    menuRegion: region,
    menuListFullWidth: true,
    ...extra,
  };
}

function nomiWithSplits(
  region: (typeof NOMIHOUDAI_REGIONS)[number],
  id: string,
  name: string,
): StoreMenuItem {
  return nomi(region, id, name, {
    optionLabel: "割り方",
    dressingOptions: NOMI_SPLITS,
    optionPrices: Object.fromEntries(
      NOMI_SPLITS.map((s) => [s, 0]),
    ) as Partial<Record<string, number>>,
  });
}

function nomiCocktail(
  id: string,
  name: string,
  mixers: readonly string[],
): StoreMenuItem {
  return nomi("カクテル", id, name, {
    optionLabel: "割り方",
    dressingOptions: mixers,
    optionPrices: Object.fromEntries(
      mixers.map((m) => [m, 0]),
    ) as Partial<Record<string, number>>,
  });
}

export const NOMIHOUDAI_MENU_ITEMS: StoreMenuItem[] = [
  nomi("ビール", "nomi_beer_nama", "生ビール"),
  nomi("ビール", "nomi_beer_asahi_super_dry", "アサヒスーパードライ"),
  nomi("ハイボール", "nomi_highball", "ハイボール"),
  nomi("ハイボール", "nomi_coke_highball", "コークハイボール"),
  nomi("ハイボール", "nomi_ginger_highball", "ジンジャーハイボール"),
  nomi("サワー", "nomi_lemon_sour", "レモンサワー"),
  nomi("サワー", "nomi_grapefruit_sour", "グレープフルーツサワー"),
  nomi("サワー", "nomi_otokoume_sour", "男梅サワー"),
  nomi("サワー", "nomi_citric_sour", "クエン酸サワー"),
  nomi("サワー", "nomi_kyoho_sour", "巨峰サワー"),
  nomi("サワー", "nomi_shikuwasa_sour", "シークワーサーサワー"),
  nomiWithSplits("果実酒", "nomi_fruit_apricot", "あんず酒"),
  nomiWithSplits("果実酒", "nomi_fruit_lychee", "ライチ酒"),
  nomi("果実酒", "nomi_oni_pine", "鬼おろしパイン"),
  nomi("果実酒", "nomi_oni_peach", "鬼おろしもも"),
  nomi("果実酒", "nomi_oni_mikan", "鬼おろしみかん"),
  nomi("果実酒", "nomi_oni_kiwi", "鬼おろしキウイ"),
  nomiWithSplits("焼酎", "nomi_shochu_mugi", "麦"),
  nomiWithSplits("焼酎", "nomi_shochu_imo", "芋"),
  nomi("お茶ハイ", "nomi_oolong_hai", "ウーロンハイ"),
  nomi("お茶ハイ", "nomi_green_tea_hai", "緑茶ハイ"),
  nomi("お茶ハイ", "nomi_jasmine_hai", "ジャスミンハイ"),
  nomi("お茶ハイ", "nomi_sugar_free_tea_hai", "無糖茶ハイ"),
  nomi("グラスワイン", "nomi_wine_glass", "グラスワイン", {
    optionLabel: "種類",
    dressingOptions: WINE_COLORS,
    optionPrices: { 赤: 0, 白: 0 },
  }),
  nomiWithSplits("梅酒", "nomi_ume", "梅酒"),
  nomi("日本酒", "nomi_sake_atsukan", "熱燗"),
  nomi("日本酒", "nomi_sake_reishu", "冷酒"),
  nomiCocktail("nomi_cocktail_cassis", "カシス", CASSIS_MIX),
  nomiCocktail("nomi_cocktail_peach", "ピーチ", PEACH_MIX),
  nomiCocktail("nomi_cocktail_campari", "カンパリ", CAMPARI_MIX),
  nomiCocktail("nomi_cocktail_malibu", "マリブ", MALIBU_MIX),
  nomiCocktail("nomi_cocktail_kahlua", "カルーア", KAHLUA_MIX),
  nomi("ソフトドリンク", "nomi_soft_oolong", "ウーロン茶"),
  nomi("ソフトドリンク", "nomi_soft_green_tea", "緑茶"),
  nomi("ソフトドリンク", "nomi_soft_jasmine", "ジャスミン茶"),
  nomi("ソフトドリンク", "nomi_soft_sugar_free_tea", "無糖茶"),
  nomi("ソフトドリンク", "nomi_soft_cola", "コーラ"),
  nomi("ソフトドリンク", "nomi_soft_ginger_ale", "ジンジャーエール"),
  nomi("ソフトドリンク", "nomi_soft_calpis_water", "カルピスウォーター"),
  nomi("ソフトドリンク", "nomi_soft_calpis_soda", "カルピスソーダ"),
  nomi("ソフトドリンク", "nomi_soft_melon_soda", "メロンソーダ"),
];
