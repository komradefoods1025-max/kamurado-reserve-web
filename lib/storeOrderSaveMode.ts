import { isStoreOrderDineInServer } from "./storeOrderDineIn";

export type StoreOrderSaveMode = "gas" | "display_only" | "both";

function parseMode(value: string | undefined): StoreOrderSaveMode | null {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "gas" || raw === "sheet" || raw === "spreadsheet") return "gas";
  if (raw === "both" || raw === "dual") return "both";
  if (
    raw === "display_only" ||
    raw === "display-only" ||
    raw === "display" ||
    raw === "kitchen"
  ) {
    return "display_only";
  }
  return null;
}

/** 店内オーダーの保存先（スプシ / 店舗画面 / 両方） */
export function resolveStoreOrderSaveMode(
  dineIn = isStoreOrderDineInServer(),
): StoreOrderSaveMode {
  const explicit = parseMode(process.env.STORE_ORDER_SAVE_MODE);
  if (explicit) return explicit;
  if (dineIn) return "display_only";
  return "gas";
}

export function shouldSaveStoreOrderToGas(mode: StoreOrderSaveMode): boolean {
  return mode === "gas" || mode === "both";
}

export function shouldSaveStoreOrderToDisplay(mode: StoreOrderSaveMode): boolean {
  return mode === "display_only" || mode === "both";
}
