export const MENU_IMAGE_BASE =
  "https://teppanyaki-toda.com/wp-content/uploads/2026/05";

export const MENU_IMAGE_FALLBACK = "/images/menu-fallback.svg";

export function menuImageUrl(filename: string): string {
  return `${MENU_IMAGE_BASE}/${encodeURI(filename)}`;
}

export function resolveMenuImageSrc(imageUrl?: string): string {
  const trimmed = imageUrl?.trim();
  if (!trimmed) {
    return MENU_IMAGE_FALLBACK;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const normalized = encodeURI(trimmed);
  return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
}
