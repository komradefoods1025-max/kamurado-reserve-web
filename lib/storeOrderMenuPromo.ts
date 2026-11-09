import type { StoreMenuCategory } from "./storeMenuCatalog";
import type { StoreOrderLandingSection } from "./storeOrderLandingContent";

/**
 * カテゴリごとの PR（画像・MP4・YouTube）。
 *
 * お好み焼きの MP4 はチャットで送れないので、手元のファイルをリポジトリに置く:
 *   ./scripts/install-okonomiyaki-video.sh ~/Downloads/動画.mp4
 * その後 git add → commit → push（Vercel に載る）
 *
 * YouTube だけで済ませる場合は kind: "youtube" に差し替え（videoId のみ）。
 */
export const STORE_ORDER_MENU_PROMO_BY_CATEGORY: Partial<
  Record<StoreMenuCategory, StoreOrderLandingSection[]>
> = {
  okonomiyaki: [
    {
      kind: "video",
      src: "/store-order/okonomiyaki.mp4",
      title: "",
      autoplay: true,
      loop: true,
      muted: true,
      controls: false,
    },
  ],
};

export function getStoreOrderMenuPromoSections(
  category: StoreMenuCategory,
): StoreOrderLandingSection[] {
  return STORE_ORDER_MENU_PROMO_BY_CATEGORY[category] ?? [];
}

export function hasVisibleStoreOrderMenuPromo(
  category: StoreMenuCategory,
): boolean {
  return getStoreOrderMenuPromoSections(category).some((s) => {
    if (s.kind === "image") return Boolean(s.src);
    if (s.kind === "video") return Boolean(s.src.trim());
    if (s.kind === "youtube") return Boolean(s.videoId.trim());
    return false;
  });
}
