import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/display/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    localPatterns: [
      {
        pathname: "/store-menu/**",
        // search 省略 → ?v=… などのクエリ付き src を許可（店内メニューのキャッシュ更新用）
      },
      {
        pathname: "/store-order/**",
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
