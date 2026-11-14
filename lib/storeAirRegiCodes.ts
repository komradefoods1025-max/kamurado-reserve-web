import {
  STORE_MENU_CATEGORY_LABEL,
  STORE_MENU_ITEMS,
  type StoreMenuItem,
} from "./storeMenuCatalog";

export type AirRegiProductMapping = {
  code: string;
  /** ハンディ検索用の名称ヒント */
  handyName?: string;
  note?: string;
};

/**
 * メニュー key 別の Airレジコード（lookupKey → マッピング）
 *
 * lookupKey:
 *   - `menuKey`（バリエーションなし）
 *   - `menuKey::dressing`
 *   - `menuKey::dressing::secondary`
 *
 * カタログの airRegiCode / airRegiOptionCodes が優先されない場合の上書きにも使えます。
 * 運用開始時は空のままでも可（画面で「未設定」と表示）。
 */
export const AIR_REGI_PRODUCT_CODES: Record<string, AirRegiProductMapping> = {
  // 例:
  // okonomi_mixed: { code: "1001", handyName: "ミックス" },
  // "cocktail_cassis::ウーロン": { code: "2101" },
};

export function buildAirRegiLookupKey(
  menuKey: string,
  dressing?: string,
  secondaryDressing?: string,
): string {
  const base = String(menuKey || "").trim();
  const d = String(dressing || "").trim();
  const s = String(secondaryDressing || "").trim();
  if (!base) return "";
  if (d && s) return `${base}::${d}::${s}`;
  if (d) return `${base}::${d}`;
  return base;
}

/** より具体的なキーからフォールバック順で列挙 */
export function airRegiLookupKeyCandidates(
  menuKey: string,
  dressing?: string,
  secondaryDressing?: string,
): string[] {
  const keys: string[] = [];
  const full = buildAirRegiLookupKey(menuKey, dressing, secondaryDressing);
  const withDressing = buildAirRegiLookupKey(menuKey, dressing, undefined);
  const base = buildAirRegiLookupKey(menuKey, undefined, undefined);
  if (full) keys.push(full);
  if (withDressing && withDressing !== full) keys.push(withDressing);
  if (base && !keys.includes(base)) keys.push(base);
  return keys;
}

export function resolveAirRegiMapping(
  menuKey: string,
  dressing?: string,
  secondaryDressing?: string,
): AirRegiProductMapping | null {
  const catalog = STORE_MENU_ITEMS.find((m) => m.id === menuKey);

  for (const key of airRegiLookupKeyCandidates(
    menuKey,
    dressing,
    secondaryDressing,
  )) {
    const fromTable = AIR_REGI_PRODUCT_CODES[key];
    if (fromTable?.code?.trim()) {
      return {
        code: fromTable.code.trim(),
        handyName: fromTable.handyName,
        note: fromTable.note,
      };
    }
  }

  if (catalog) {
    const d = String(dressing || "").trim();
    const optionCode = d ? catalog.airRegiOptionCodes?.[d] : undefined;
    if (optionCode?.trim()) {
      return { code: optionCode.trim() };
    }
    if (catalog.airRegiCode?.trim()) {
      return { code: catalog.airRegiCode.trim() };
    }
  }

  return null;
}

export type AirRegiCatalogSlot = {
  lookupKey: string;
  menuKey: string;
  menuName: string;
  categoryLabel: string;
  dressing?: string;
  secondaryDressing?: string;
  mapping: AirRegiProductMapping | null;
};

function slotsForMenuItem(item: StoreMenuItem): AirRegiCatalogSlot[] {
  const dressings = item.dressingOptions?.length
    ? [...item.dressingOptions]
    : [undefined];
  const secondaries = item.secondaryDressingOptions?.length
    ? [...item.secondaryDressingOptions]
    : [undefined];
  const categoryLabel = STORE_MENU_CATEGORY_LABEL[item.category] ?? item.category;
  const slots: AirRegiCatalogSlot[] = [];

  for (const dressing of dressings) {
    for (const secondaryDressing of secondaries) {
      const lookupKey = buildAirRegiLookupKey(
        item.id,
        dressing,
        secondaryDressing,
      );
      slots.push({
        lookupKey,
        menuKey: item.id,
        menuName: item.name,
        categoryLabel,
        dressing,
        secondaryDressing,
        mapping: resolveAirRegiMapping(
          item.id,
          dressing,
          secondaryDressing,
        ),
      });
    }
  }

  return slots;
}

export function listAirRegiCatalogSlots(): AirRegiCatalogSlot[] {
  return STORE_MENU_ITEMS.flatMap(slotsForMenuItem);
}

export function airRegiCatalogStats(slots = listAirRegiCatalogSlots()) {
  const mapped = slots.filter((s) => s.mapping?.code).length;
  return { total: slots.length, mapped, unmapped: slots.length - mapped };
}