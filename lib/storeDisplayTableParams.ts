import {
  normalizeStoreTableId,
  storeTableLabel,
  STORE_ORDER_TABLE_COUNT,
} from "./storeOrderTables";

export function parseDisplayTableRouteParam(
  raw: string | string[] | undefined,
): { tableId: string | null; titleSuffix: string } {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value === "all") {
    return { tableId: null, titleSuffix: "" };
  }
  const tableId = normalizeStoreTableId(value);
  if (!tableId) {
    return { tableId: null, titleSuffix: "" };
  }
  return { tableId, titleSuffix: storeTableLabel(tableId) };
}

export { STORE_ORDER_TABLE_COUNT };
