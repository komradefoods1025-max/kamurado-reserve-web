export const RESERVATION_MAINTENANCE_TEL = "048-441-5517";

export const RESERVATION_MAINTENANCE_LINES = [
  "ただいまメンテナンス中です🙇‍♂️",
  "お手数ですがお電話にてご予約お願いします！",
  `TEL ${RESERVATION_MAINTENANCE_TEL}`,
] as const;

export function reservationMaintenanceMessageText(): string {
  return RESERVATION_MAINTENANCE_LINES.join("\n");
}

/** Web/LIFF: 予約再開時は NEXT_PUBLIC_RESERVATION_MAINTENANCE=false */
export function isWebReservationMaintenance(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_RESERVATION_MAINTENANCE ??
    process.env.RESERVATION_MAINTENANCE ??
    "true";
  const normalized = String(raw).trim().toLowerCase();
  return normalized !== "false" && normalized !== "0";
}
