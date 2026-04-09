
import {
  BookingConfigResponse,
  ReservationDraft,
  ReservationSubmitResponse,
} from "./types";

function normalizeJson<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object") return fallback;
  return value as T;
}

export async function fetchBookingConfig(): Promise<BookingConfigResponse> {
  const bookingConfigUrl = process.env.NEXT_PUBLIC_BOOKING_CONFIG_URL || "";

  if (!bookingConfigUrl) {
    return {
      ok: true,
      availableDates: [],
      bookableDateCount: Number(
        process.env.NEXT_PUBLIC_BOOKABLE_DATE_COUNT || 10
      ),
    };
  }

  try {
    const res = await fetch(bookingConfigUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("予約設定の取得に失敗しました。");
    }

    const data = await res.json();
    return normalizeJson<BookingConfigResponse>(data, {
      ok: false,
      availableDates: [],
    });
  } catch (error) {
    console.error("fetchBookingConfig error:", error);

    return {
      ok: false,
      availableDates: [],
      bookableDateCount: Number(
        process.env.NEXT_PUBLIC_BOOKABLE_DATE_COUNT || 10
      ),
    };
  }
}

export async function submitReservation(
  draft: ReservationDraft
): Promise<ReservationSubmitResponse> {
  const endpoint =
    process.env.NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT ||
    process.env.NEXT_PUBLIC_RESERVATION_SAVE_URL ||
    "";

  if (!endpoint) {
    throw new Error(
      "送信先URLが未設定です。NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT を設定してください。"
    );
  }

  const totalQuantity = draft.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalAmount = draft.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const payload = {
    channel: "WEB",
    source: "next-web-app",
    storeName: "かむらど",

    name: draft.customerName || "",
    phone: draft.phone || "",
    note: draft.note || "",

    pickupDate: draft.pickupDate || "",
    pickupTime: draft.pickupTime || "",

    items: draft.items,
    totalQuantity,
    totalAmount,

    customer: {
      name: draft.customerName || "",
      phone: draft.phone || "",
      note: draft.note || "",
    },

    reservation: {
      pickupDate: draft.pickupDate || "",
      pickupTime: draft.pickupTime || "",
    },

    submittedAt: new Date().toISOString(),
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();

  let data: ReservationSubmitResponse = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { message: rawText };
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.message || "予約送信に失敗しました。");
  }

  return data;
}
