export const RESERVATION_MAINTENANCE_TEL = "048-441-5517";

export const RESERVATION_MAINTENANCE_LINES = [
  "ただいまメンテナンス中です🙇‍♂️",
  "お手数ですがお電話にてご予約お願いします！",
  `TEL ${RESERVATION_MAINTENANCE_TEL}`,
] as const;

export function reservationMaintenanceMessageText(): string {
  return RESERVATION_MAINTENANCE_LINES.join("\n");
}

/** Web/LIFF: メンテナンスONは NEXT_PUBLIC_RESERVATION_MAINTENANCE=true */
export function isWebReservationMaintenance(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_RESERVATION_MAINTENANCE ??
    process.env.RESERVATION_MAINTENANCE ??
    "false";
  const normalized = String(raw).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}
