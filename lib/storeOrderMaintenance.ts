const DISABLED_VALUES = new Set(["true", "1", "yes", "on"]);

export function isStoreOrderDisabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_STORE_ORDER_DISABLED ??
    process.env.STORE_ORDER_DISABLED ??
    "false";
  return DISABLED_VALUES.has(String(raw).trim().toLowerCase());
}

export function isStoreOrderMaintenance(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_STORE_ORDER_MAINTENANCE ??
    process.env.STORE_ORDER_MAINTENANCE ??
    "false";
  return DISABLED_VALUES.has(String(raw).trim().toLowerCase());
}

export const STORE_ORDER_MAINTENANCE_LINES = [
  "ただいまモバイルオーダーは一時停止中です。",
  "店内にてお声がけください。",
] as const;
