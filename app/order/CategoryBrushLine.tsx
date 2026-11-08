import styles from "./order.module.css";

/** カテゴリー見出しの背景用・筆掠め */
export default function CategoryBrushLine({ idSuffix }: { idSuffix: string }) {
  const gradientId = `storeCategoryBrush-${idSuffix}`;

  return (
    <svg
      className={styles.categoryBrushLine}
      viewBox="0 0 320 28"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e8c08a" stopOpacity="0.98" />
          <stop offset="55%" stopColor="#c8874a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#8b5d34" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <path
        d="M1 15.5 C 28 9.5, 52 20, 88 12.5 C 118 6.5, 142 19, 172 13 C 198 8, 224 17, 258 12 C 286 8.5, 304 16, 319 13.5 L 317.5 18.5 C 292 22, 248 21, 188 19.5 C 128 18, 68 20.5, 24 18 C 12 17, 4 17.5, 1 16.5 Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M6 17 Q 72 12.5 148 16 T 296 14.5"
        fill="none"
        stroke="#f5e6c8"
        strokeWidth="1.4"
        strokeOpacity="0.28"
        strokeLinecap="round"
      />
      <path
        d="M218 11.5 C 248 8, 278 18, 312 12"
        fill="none"
        stroke="#a86432"
        strokeWidth="2.2"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />
    </svg>
  );
}
