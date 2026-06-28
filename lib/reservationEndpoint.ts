export function getReservationSaveUrl() {
  const endpoint =
    process.env.NEXT_PUBLIC_RESERVATION_SAVE_URL ??
    process.env.RESERVATION_SAVE_URL ??
    process.env.NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT ??
    "";

  return endpoint.trim();
}

export function missingReservationSaveUrlMessage() {
  return "NEXT_PUBLIC_RESERVATION_SAVE_URL または RESERVATION_SAVE_URL が未設定です";
}

export function getReservationSaveUrlDebugInfo() {
  return {
    hasNextPublicReservationSaveUrl: Boolean(
      process.env.NEXT_PUBLIC_RESERVATION_SAVE_URL,
    ),
    hasReservationSaveUrl: Boolean(process.env.RESERVATION_SAVE_URL),
    hasNextPublicWebReservationEndpoint: Boolean(
      process.env.NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT,
    ),
    configured: Boolean(getReservationSaveUrl()),
  };
}
