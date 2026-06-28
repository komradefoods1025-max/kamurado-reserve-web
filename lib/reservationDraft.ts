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
  selectedOptionLabel?: string;
  selectedOptions?: string[];
  note?: string;
};

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
      items: Array.isArray(parsed.items) ? parsed.items : [],
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
      nextItems.push({
        id: page.id,
        name: page.name,
        price: page.price,
        quantity: delta,
        imageUrl: page.src,
        description: "",
        itemType: page.itemType,
        selectedOptionLabel: "",
        selectedOptions: [],
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
