"use client";

import { useEffect, useState } from "react";
import {
  MENU_IMAGE_FALLBACK,
  resolveMenuImageSrc,
} from "../lib/menuImage";

type MenuImageProps = {
  src?: string;
  alt: string;
  style?: React.CSSProperties;
};

export default function MenuImage({ src, alt, style }: MenuImageProps) {
  const [imgSrc, setImgSrc] = useState(() => resolveMenuImageSrc(src));

  useEffect(() => {
    setImgSrc(resolveMenuImageSrc(src));
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        setImgSrc((current) =>
          current === MENU_IMAGE_FALLBACK ? current : MENU_IMAGE_FALLBACK,
        );
      }}
      style={style}
    />
  );
}
