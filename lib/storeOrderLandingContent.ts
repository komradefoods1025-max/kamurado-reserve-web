/** `/order` トップ — 表示ブロック（上から順） */

export type StoreOrderLandingImage = {
  kind: "image";
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** MP4 等を public に置いて src を指定（空なら非表示） */
export type StoreOrderLandingVideo = {
  kind: "video";
  /** 例: /store-order/intro.mp4 */
  src: string;
  poster?: string;
  title?: string;
};

/** YouTube 埋め込み（動画 ID のみ。src と同時に使わない想定） */
export type StoreOrderLandingYoutube = {
  kind: "youtube";
  videoId: string;
  title?: string;
};

export type StoreOrderLandingSection =
  | StoreOrderLandingImage
  | StoreOrderLandingVideo
  | StoreOrderLandingYoutube;

export const STORE_ORDER_LANDING_SECTIONS: StoreOrderLandingSection[] = [
  {
    kind: "image",
    src: "/store-order/mobile-order-hero.png?v=20261109-new",
    alt: "鉄板焼きダイニングかむらど 店内モバイルオーダーのご案内",
    width: 723,
    height: 1024,
  },
  {
    kind: "video",
    src: "",
    poster: "",
    title: "ご利用方法（動画）",
  },
];

/** チラシ画像に手順が含まれる場合は false 推奨 */
export const STORE_ORDER_LANDING_SHOW_TEXT_STEPS = false;

/** `/order/menu` カテゴリ上部の PR（動画・画像）。空なら非表示 */
export const STORE_ORDER_MENU_PROMO_SECTIONS: StoreOrderLandingSection[] = [];
