import type { StoreDisplayItem, StoreDisplayOrder } from "./storeDisplayQueue";
import {
  resolveAirRegiMapping,
  type AirRegiProductMapping,
} from "./storeAirRegiCodes";

export type AirRegiRegisterLine = {
  menuKey: string;
  displayName: string;
  dressing?: string;
  secondaryDressing?: string;
  qty: number;
  mapping: AirRegiProductMapping | null;
  mapped: boolean;
};

function lineDisplayName(item: StoreDisplayItem): string {
  const base = String(item.menuName || item.name || "").trim() || "商品";
  const dressing = String(item.dressing || "").trim();
  if (dressing) return `${base}（${dressing}）`;
  return base;
}

function itemQty(item: StoreDisplayItem): number {
  return Math.max(0, Number(item.qty ?? item.quantity ?? 0)) || 0;
}

export function buildAirRegiRegisterLines(
  order: StoreDisplayOrder,
): AirRegiRegisterLine[] {
  const lines: AirRegiRegisterLine[] = [];
  for (const item of order.items) {
    const menuKey = String(item.menuKey || "").trim();
    const dressing = String(item.dressing || "").trim() || undefined;
    const qty = itemQty(item);
    if (!menuKey || qty <= 0) continue;

    const mapping = resolveAirRegiMapping(menuKey, dressing);

    lines.push({
      menuKey,
      displayName: lineDisplayName(item),
      dressing,
      qty,
      mapping,
      mapped: Boolean(mapping?.code),
    });
  }
  return lines;
}

export function formatAirRegiLinesForClipboard(
  lines: AirRegiRegisterLine[],
): string {
  return lines
    .map((row) => {
      const code = row.mapping?.code ?? "（未設定）";
      return `${code}\t${row.qty}\t${row.displayName}`;
    })
    .join("\n");
}

export function airRegiRegisterLineStats(lines: AirRegiRegisterLine[]) {
  const unmapped = lines.filter((l) => !l.mapped).length;
  return {
    lineCount: lines.length,
    unmapped,
    allMapped: lines.length > 0 && unmapped === 0,
  };
}