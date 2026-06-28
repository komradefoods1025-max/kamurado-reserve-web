import type { MenuBookPage } from "./menuBookPages";
import { isOrderableMenuBookPage } from "./menuBookPages";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
  itemType?: "bento" | "drink" | "extra";
  riceSize?: string;
  selectedOptionLabel?: string;
  selectedOptions?: string[];
  note?: string;
};

export const RICE_SIZE_OPTIONS = ["普通", "大盛り", "小盛り"] as const;
export type RiceSize = (typeof RICE_SIZE_OPTIONS)[number];
export const DEFAULT_RICE_SIZE: RiceSize = "普通";

export function isBentoCartItem(item: CartItem): boolean {
  return item.itemType !== "drink" && item.itemType !== "extra";
}

export function getCartItemRiceSize(item: CartItem): RiceSize {
  const value = item.riceSize || item.selectedOptionLabel || DEFAULT_RICE_SIZE;
  if (RICE_SIZE_OPTIONS.includes(value as RiceSize)) {
    return value as RiceSize;
  }

  return DEFAULT_RICE_SIZE;
}

export function formatCartItemLabel(item: CartItem): string {
  const quantity = Number(item.quantity || 0);

  if (isBentoCartItem(item)) {
    return `${item.name} ×${quantity}（ご飯：${getCartItemRiceSize(item)}）`;
  }

  return `${item.name} ×${quantity}`;
}

function normalizeCartItem(item: CartItem): CartItem {
  if (!isBentoCartItem(item)) {
    return item;
  }

  const riceSize = getCartItemRiceSize(item);

  return {
    ...item,
    itemType: item.itemType || "bento",
    riceSize,
    selectedOptionLabel: riceSize,
    selectedOptions: [riceSize],
  };
}

function normalizeDraftItems(items: CartItem[]): CartItem[] {
  return items
    .filter((item) => Number(item.quantity || 0) > 0)
    .map(normalizeCartItem);
}

export type ReservationDraft = {
  items: CartItem[];
  pickupDate?: string;
  pickupTime?: string;
  customerName?: string;
  phone?: string;
  note?: string;
  totalAmount?: number;
  totalQuantity?: number;
  updatedAt?: number;
};

const DRAFT_KEYS = [
  "kamurado-reserve-draft",
  "kamurado-reservation-draft",
  "reservationDraft",
  "webReservationDraft",
  "kamurado-web-reservation",
  "reservation-draft",
  "reserve-draft",
  "reservation",
];

function safeParseDraft(raw: string | null): ReservationDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      items: normalizeDraftItems(Array.isArray(parsed.items) ? parsed.items : []),
      pickupDate: parsed.pickupDate || "",
      pickupTime: parsed.pickupTime || "",
      customerName: parsed.customerName || "",
      phone: parsed.phone || "",
      note: parsed.note || "",
      totalAmount: parsed.totalAmount,
      totalQuantity: parsed.totalQuantity,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function summarizeDraft(draft: ReservationDraft): ReservationDraft {
  const totalQuantity = draft.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const totalAmount = draft.items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  return {
    ...draft,
    totalQuantity,
    totalAmount,
    updatedAt: Date.now(),
  };
}

export function readDraft(): ReservationDraft {
  if (typeof window === "undefined") {
    return { items: [] };
  }

  for (const key of DRAFT_KEYS) {
    const found = safeParseDraft(window.localStorage.getItem(key));
    if (found) {
      return found;
    }
  }

  return { items: [] };
}

export function writeDraft(draft: ReservationDraft): ReservationDraft {
  if (typeof window === "undefined") {
    return draft;
  }

  const nextDraft = summarizeDraft(draft);
  const value = JSON.stringify(nextDraft);

  DRAFT_KEYS.forEach((key) => {
    window.localStorage.setItem(key, value);
  });

  return nextDraft;
}

export function addMenuBookItemToDraft(page: MenuBookPage): ReservationDraft | null {
  return adjustMenuBookItemQuantity(page, 1);
}

export function adjustMenuBookItemQuantity(
  page: MenuBookPage,
  delta: number,
): ReservationDraft | null {
  if (!isOrderableMenuBookPage(page) || delta === 0) {
    return null;
  }

  const draft = readDraft();
  const nextItems = [...draft.items];
  const index = nextItems.findIndex((item) => item.id === page.id);

  if (delta > 0) {
    if (index >= 0) {
      nextItems[index] = {
        ...nextItems[index],
        quantity: Number(nextItems[index].quantity || 0) + delta,
        price: page.price,
        name: page.name,
      };
    } else {
      const riceSize =
        page.itemType === "bento" ? DEFAULT_RICE_SIZE : undefined;

      nextItems.push({
        id: page.id,
        name: page.name,
        price: page.price,
        quantity: delta,
        imageUrl: page.image,
        description: "",
        itemType: page.itemType,
        riceSize,
        selectedOptionLabel: riceSize || "",
        selectedOptions: riceSize ? [riceSize] : [],
        note: "",
      });
    }
  } else if (index >= 0) {
    const nextQuantity = Number(nextItems[index].quantity || 0) + delta;

    if (nextQuantity <= 0) {
      nextItems.splice(index, 1);
    } else {
      nextItems[index] = {
        ...nextItems[index],
        quantity: nextQuantity,
        price: page.price,
        name: page.name,
      };
    }
  }

  return writeDraft({ ...draft, items: nextItems });
}

export function updateCartItemRiceSize(
  itemId: string,
  riceSize: RiceSize,
): ReservationDraft | null {
  if (!RICE_SIZE_OPTIONS.includes(riceSize)) {
    return null;
  }

  const draft = readDraft();
  const index = draft.items.findIndex((item) => item.id === itemId);

  if (index < 0 || !isBentoCartItem(draft.items[index])) {
    return null;
  }

  const nextItems = [...draft.items];
  nextItems[index] = {
    ...nextItems[index],
    riceSize,
    selectedOptionLabel: riceSize,
    selectedOptions: [riceSize],
  };

  return writeDraft({ ...draft, items: nextItems });
}

export function getItemQuantity(
  itemId: string,
  draft: ReservationDraft = readDraft(),
): number {
  const item = draft.items.find((entry) => entry.id === itemId);
  return item ? Number(item.quantity || 0) : 0;
}

export function getCartCount(draft: ReservationDraft = readDraft()): number {
  return draft.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
}

export function getCartAmount(draft: ReservationDraft = readDraft()): number {
  return draft.items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
}

export function getCartSummary(
  draft: ReservationDraft = readDraft(),
): { count: number; amount: number } {
  return {
    count: getCartCount(draft),
    amount: getCartAmount(draft),
  };
}
