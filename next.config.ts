import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/store-menu/**",
        // search 省略 → ?v=… などのクエリ付き src を許可（店内メニューのキャッシュ更新用）
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "teppanyaki-toda.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
