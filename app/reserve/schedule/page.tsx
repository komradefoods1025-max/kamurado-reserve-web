
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
  selectedOptionLabel?: string;
  selectedOptions?: string[];
  note?: string;
};

type ReservationDraft = {
  items: CartItem[];
  pickupDate?: string;
  pickupTime?: string;
  customerName?: string;
  phone?: string;
  note?: string;
  totalAmount?: number;
  totalQuantity?: number;
};

const CART_KEYS = [
  "kamurado-web-cart",
  "reservation-cart",
  "reserve-cart",
  "bento-cart",
  "cart",
];

const DRAFT_KEYS = [
  "kamurado-web-reservation",
  "reservation-draft",
  "reserve-draft",
  "reservation",
];

const OPEN_MINUTES = 11 * 60 + 30; // 11:30
const CLOSE_MINUTES = 14 * 60; // 14:00
const SLOT_INTERVAL = 15;
const SAME_DAY_BUFFER_MINUTES = 30;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readFirstAvailableJson<T>(keys: string[], fallback: T): T {
  for (const key of keys) {
    const value = readJson<T | null>(key, null);
    if (value) return value;
  }
  return fallback;
}

function writeDraft(draft: ReservationDraft) {
  for (const key of DRAFT_KEYS) {
    writeJson(key, draft);
  }
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateToYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function formatDateLabel(ymd: string) {
  const date = new Date(`${ymd}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function roundUpToInterval(minutes: number, interval: number) {
  return Math.ceil(minutes / interval) * interval;
}

function generateTimeSlots() {
  const slots: string[] = [];
  for (let m = OPEN_MINUTES; m <= CLOSE_MINUTES; m += SLOT_INTERVAL) {
    slots.push(fromMinutes(m));
  }
  return slots;
}

function generateFallbackDates(count: number) {
  const dates: string[] = [];
  const base = new Date();

  for (let i = 0; i < 31 && dates.length < count; i += 1) {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    dates.push(formatDateToYmd(date));
  }

  return dates;
}

async function fetchAvailableDates(): Promise<string[]> {
  const bookingConfigUrl = process.env.NEXT_PUBLIC_BOOKING_CONFIG_URL || "";
  const fallbackCount = Number(process.env.NEXT_PUBLIC_BOOKABLE_DATE_COUNT || 10);

  if (!bookingConfigUrl) {
    return generateFallbackDates(fallbackCount);
  }

  try {
    const res = await fetch(bookingConfigUrl, { cache: "no-store" });
    const data = await res.json();

    const dates = data?.availableDates ?? data?.dates ?? data?.bookableDates ?? [];

    if (Array.isArray(dates) && dates.length > 0) {
      return dates.map(String);
    }

    const count = Number(data?.bookableDateCount ?? fallbackCount);
    return generateFallbackDates(count);
  } catch {
    return generateFallbackDates(fallbackCount);
  }
}

export default function ReserveSchedulePage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ReservationDraft>({ items: [] });
  const [loaded, setLoaded] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const cartItems = readFirstAvailableJson<CartItem[]>(CART_KEYS, []);
      const currentDraft = readFirstAvailableJson<ReservationDraft>(DRAFT_KEYS, {
        items: cartItems,
      });

      const dates = await fetchAvailableDates();

      if (!mounted) return;

      setNow(new Date());
      setDraft({
        ...currentDraft,
        items: currentDraft.items?.length ? currentDraft.items : cartItems,
      });
      setAvailableDates(dates);
      setSelectedDate(currentDraft.pickupDate ?? dates[0] ?? "");
      setSelectedTime(currentDraft.pickupTime ?? "");
      setLoaded(true);
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const cartCount = useMemo(
    () => draft.items.reduce((sum, item) => sum + item.quantity, 0),
    [draft.items]
  );

  const availableTimes = useMemo(() => {
    const slots = generateTimeSlots();

    if (!selectedDate || !now) return slots;

    const today = formatDateToYmd(now);
    if (selectedDate !== today) return slots;

    const minAllowed = roundUpToInterval(
      now.getHours() * 60 + now.getMinutes() + SAME_DAY_BUFFER_MINUTES,
      SLOT_INTERVAL
    );

    return slots.filter((slot) => toMinutes(slot) >= minAllowed);
  }, [selectedDate, now]);

  useEffect(() => {
    if (!selectedTime) return;
    if (!availableTimes.includes(selectedTime)) {
      setSelectedTime("");
    }
  }, [availableTimes, selectedTime]);

  function handleNext() {
    if (!selectedDate || !selectedTime) return;

    const nextDraft: ReservationDraft = {
      ...draft,
      pickupDate: selectedDate,
      pickupTime: selectedTime,
    };

    writeDraft(nextDraft);
    router.push("/reserve/customer");
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">受取日時を準備しています…</p>
        </div>
      </main>
    );
  }

  if (!draft.items || draft.items.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-800">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">受取日時の選択</h1>
          <p className="mt-3 text-sm text-stone-600">
            先にメニューを選んでください。
          </p>

          <div className="mt-6">
            <Link
              href="/reserve/menu"
              className="inline-flex rounded-2xl bg-amber-900 px-5 py-3 text-sm font-medium text-white"
            >
              メニュー選択へ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <p className="text-sm tracking-[0.2em] text-amber-700">RESERVE</p>
          <h1 className="mt-1 text-2xl font-bold">受取日時を選択</h1>
          <p className="mt-2 text-sm text-stone-600">
            ご注文 {cartCount}点分の受取日時を選んでください。
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2 text-xs text-stone-500">
          <span className="rounded-full bg-amber-900 px-3 py-1 text-white">
            1. メニュー
          </span>
          <span>→</span>
          <span className="rounded-full bg-amber-900 px-3 py-1 text-white">
            2. カート
          </span>
          <span>→</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            3. 日時
          </span>
          <span>→</span>
          <span className="rounded-full bg-stone-200 px-3 py-1">4. お客様情報</span>
        </div>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">受取日</h2>
          <p className="mt-1 text-sm text-stone-600">
            ご希望の日付を選択してください。
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {availableDates.map((date) => {
              const active = selectedDate === date;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition",
                    active
                      ? "border-amber-800 bg-amber-900 text-white"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100",
                  ].join(" ")}
                >
                  <div className="text-sm font-medium">{formatDateLabel(date)}</div>
                  <div
                    className={[
                      "mt-1 text-xs",
                      active ? "text-amber-100" : "text-stone-500",
                    ].join(" ")}
                  >
                    {date}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">受取時間</h2>
          <p className="mt-1 text-sm text-stone-600">
            {selectedDate
              ? "ご希望の受取時間を選択してください。"
              : "先に受取日を選択してください。"}
          </p>

          {selectedDate ? (
            availableTimes.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {availableTimes.map((time) => {
                  const active = selectedTime === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={[
                        "rounded-2xl border px-4 py-3 text-center text-sm font-medium transition",
                        active
                          ? "border-amber-800 bg-amber-900 text-white"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-100",
                      ].join(" ")}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-700">
                当日の受付可能時間がありません。別の日付をお選びください。
              </div>
            )
          ) : (
            <div className="mt-4 rounded-2xl bg-stone-100 px-4 py-4 text-sm text-stone-500">
              日付を選択すると時間が表示されます。
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-base font-semibold">選択中の内容</h2>
          <div className="mt-3 space-y-2 text-sm text-stone-700">
            <div className="flex items-center justify-between">
              <span>受取日</span>
              <span>{selectedDate ? formatDateLabel(selectedDate) : "未選択"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>受取時間</span>
              <span>{selectedTime || "未選択"}</span>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/reserve/cart"
            className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            カートへ戻る
          </Link>

          <button
            type="button"
            onClick={handleNext}
            disabled={!selectedDate || !selectedTime}
            className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-6 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90"
          >
            お客様情報の入力へ
          </button>
        </div>
      </div>
    </main>
  );
}
