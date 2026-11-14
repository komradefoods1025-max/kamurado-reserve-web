import {
  STORE_MENU_ITEMS,
  computeStoreCartMoney,
  storeMenuItemUnitPrice,
  storeMenuSecondaryStepperLabel,
  syncStoreCartWithCatalog,
} from "./storeMenuCatalog";
import type { StoreCartLine } from "./storeOrderDraft";
import {
  readStoreOrderDraft,
  storeCartLineKey,
  storeCartQuantity,
  writeStoreOrderDraft,
} from "./storeOrderDraft";

export type StoreReorderLine = {
  menuKey: string;
  name: string;
  dressing?: string;
  secondaryDressing?: string;
  /** 前回の注文数量（表示用） */
  lastQty: number;
  lastSubmittedAt: string;
};

export type TableBillHistoryItem = {
  label: string;
  qty: number;
  subtotal: number;
  menuKey?: string;
  dressing?: string;
};

/** API の dressing 文字列（cart と同形式）を分解 */
export function parseStoreOrderDressingSummary(summary: string): {
  dressing?: string;
  secondaryDressing?: string;
} {
  const raw = String(summary || "").trim();
  if (!raw) return {};
  const parts = raw.split(" / ").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return {};
  if (parts.length === 1) return { dressing: parts[0] };
  return { dressing: parts[0], secondaryDressing: parts[1] };
}

function cartLineOptionsMatch(
  c: StoreCartLine,
  id: string,
  dressing?: string,
  secondaryDressing?: string,
): boolean {
  if (c.id !== id) return false;
  return (
    (c.dressing ?? "") === (dressing ?? "") &&
    (c.secondaryDressing ?? "") === (secondaryDressing ?? "")
  );
}

/** 卓の注文履歴からおかわり用一覧を構築 */
export function buildStoreReorderLinesFromHistory(
  orders: {
    submittedAt: string;
    items: TableBillHistoryItem[];
  }[],
): StoreReorderLine[] {
  const map = new Map<string, StoreReorderLine>();

  for (const order of orders) {
    const submittedAt = order.submittedAt;
    for (const row of order.items) {
      const menuKey = String(row.menuKey || "").trim();
      if (!menuKey) continue;
      const catalog = STORE_MENU_ITEMS.find((m) => m.id === menuKey);
      if (!catalog) continue;

      const { dressing, secondaryDressing } = parseStoreOrderDressingSummary(
        row.dressing || "",
      );
      const key = `${menuKey}::${dressing ?? ""}::${secondaryDressing ?? ""}`;
      const prev = map.get(key);
      const lastQty = Math.max(0, Number(row.qty) || 0);
      if (
        !prev ||
        (Date.parse(submittedAt) || 0) >=
          (Date.parse(prev.lastSubmittedAt) || 0)
      ) {
        map.set(key, {
          menuKey,
          name: catalog.name,
          dressing,
          secondaryDressing,
          lastQty,
          lastSubmittedAt: submittedAt,
        });
      }
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      (Date.parse(b.lastSubmittedAt) || 0) -
      (Date.parse(a.lastSubmittedAt) || 0),
  );
}

export function appendStoreReorderToDraft(
  menuKey: string,
  dressingSummary?: string,
  addQty = 1,
): boolean {
  if (typeof window === "undefined" || addQty <= 0) return false;

  const catalog = STORE_MENU_ITEMS.find((m) => m.id === menuKey);
  if (!catalog) return false;

  const parsed = parseStoreOrderDressingSummary(dressingSummary || "");
  let dressing = parsed.dressing;
  let secondaryDressing = parsed.secondaryDressing;

  if (catalog.dressingOptions?.length && !dressing) {
    dressing = catalog.dressingOptions[0];
  }
  if (catalog.secondaryDressingOptions?.length && !secondaryDressing) {
    secondaryDressing = catalog.secondaryDressingOptions[0];
  }
  if (catalog.secondaryOptionStepper && !secondaryDressing) {
    const stepper = catalog.secondaryOptionStepper;
    const n = stepper.default ?? stepper.min;
    secondaryDressing = storeMenuSecondaryStepperLabel(stepper, n);
  }

  const draft = readStoreOrderDraft();
  const items = syncStoreCartWithCatalog(draft.items);
  const matchesLine = (c: StoreCartLine) =>
    cartLineOptionsMatch(c, menuKey, dressing, secondaryDressing);

  const current = items.find(matchesLine);
  const nextQty = (current?.quantity ?? 0) + addQty;

  const line: StoreCartLine = {
    id: catalog.id,
    name: catalog.name,
    price: storeMenuItemUnitPrice(catalog, dressing),
    quantity: nextQty,
    image: catalog.image,
    ...(dressing ? { dressing } : {}),
    ...(secondaryDressing ? { secondaryDressing } : {}),
  };

  const others = items.filter((c) => !matchesLine(c));
  const next = syncStoreCartWithCatalog([...others, line]);
  const { amount } = computeStoreCartMoney(next);

  writeStoreOrderDraft({
    ...draft,
    items: next,
    totalQuantity: storeCartQuantity(next),
    totalAmount: amount,
  });

  return true;
}

export function storeReorderCartQty(
  menuKey: string,
  dressingSummary?: string,
): number {
  const catalog = STORE_MENU_ITEMS.find((m) => m.id === menuKey);
  if (!catalog) return 0;
  const parsed = parseStoreOrderDressingSummary(dressingSummary || "");
  const items = readStoreOrderDraft().items;
  const line = items.find((c) =>
    cartLineOptionsMatch(
      c,
      menuKey,
      parsed.dressing,
      parsed.secondaryDressing,
    ),
  );
  return line?.quantity ?? 0;
}

export function storeReorderLineKey(line: StoreReorderLine): string {
  return storeCartLineKey({
    id: line.menuKey,
    dressing: line.dressing,
    secondaryDressing: line.secondaryDressing,
  });
}

export function dressingSummaryFromReorderLine(line: StoreReorderLine): string {
  return [line.dressing, line.secondaryDressing].filter(Boolean).join(" / ");
}

export function changeStoreReorderQty(
  menuKey: string,
  dressingSummary: string | undefined,
  delta: number,
): boolean {
  if (delta === 0) return false;
  if (delta > 0) {
    return appendStoreReorderToDraft(menuKey, dressingSummary, delta);
  }
  const catalog = STORE_MENU_ITEMS.find((m) => m.id === menuKey);
  if (!catalog) return false;
  const parsed = parseStoreOrderDressingSummary(dressingSummary || "");
  const draft = readStoreOrderDraft();
  const items = syncStoreCartWithCatalog(draft.items);
  const matchesLine = (c: StoreCartLine) =>
    cartLineOptionsMatch(
      c,
      menuKey,
      parsed.dressing,
      parsed.secondaryDressing,
    );
  const current = items.find(matchesLine);
  if (!current) return false;
  const nextQty = current.quantity + delta;
  if (nextQty <= 0) {
    const next = items.filter((c) => !matchesLine(c));
    const { amount } = computeStoreCartMoney(next);
    writeStoreOrderDraft({
      ...draft,
      items: next,
      totalQuantity: storeCartQuantity(next),
      totalAmount: amount,
    });
    return true;
  }
  return appendStoreReorderToDraft(menuKey, dressingSummary, delta);
}