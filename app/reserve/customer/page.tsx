
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

type SubmitResponse = {
  ok?: boolean;
  reservationNo?: string;
  reservation_no?: string;
  id?: string;
  message?: string;
  error?: string;
  detail?: unknown;
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

const money = new Intl.NumberFormat("ja-JP");

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

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
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

function clearReservationStorage() {
  for (const key of CART_KEYS) removeKey(key);
  for (const key of DRAFT_KEYS) removeKey(key);
}

function formatDateLabel(ymd?: string) {
  if (!ymd) return "";
  const date = new Date(`${ymd}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function isValidJapanesePhone(phone: string) {
  const digits = normalizePhone(phone);
  return /^0\d{9,10}$/.test(digits);
}

async function submitReservation(payload: Record<string, unknown>) {
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: SubmitResponse = {};

  try {
    data = rawText ? (JSON.parse(rawText) as SubmitResponse) : {};
  } catch {
    data = { message: rawText };
  }

  if (!res.ok || data.ok === false) {
    throw new Error(
      data.message || data.error || "予約送信に失敗しました。"
    );
  }

  return data;
}

export default function ReserveCustomerPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ReservationDraft>({ items: [] });
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [completed, setCompleted] = useState<{
    reservationNo?: string;
  } | null>(null);

  useEffect(() => {
    const cartItems = readFirstAvailableJson<CartItem[]>(CART_KEYS, []);
    const currentDraft = readFirstAvailableJson<ReservationDraft>(DRAFT_KEYS, {
      items: cartItems,
    });

    setDraft({
      ...currentDraft,
      items: currentDraft.items?.length ? currentDraft.items : cartItems,
    });
    setName(currentDraft.customerName ?? "");
    setPhone(currentDraft.phone ?? "");
    setNote(currentDraft.note ?? "");
    setLoaded(true);
  }, []);

  const totals = useMemo(() => {
    const totalQuantity = draft.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = draft.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return { totalQuantity, totalAmount };
  }, [draft.items]);

  function validate() {
    const nextErrors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      nextErrors.name = "お名前を入力してください。";
    }

    if (!phone.trim()) {
      nextErrors.phone = "電話番号を入力してください。";
    } else if (!isValidJapanesePhone(phone)) {
      nextErrors.phone = "電話番号は 09012345678 のように入力してください。";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!validate()) return;
    if (!draft.pickupDate || !draft.pickupTime) {
      setSubmitError("受取日時が未設定です。日時選択に戻って設定してください。");
      return;
    }
    if (!draft.items || draft.items.length === 0) {
      setSubmitError("ご注文内容がありません。メニューから選択してください。");
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    const nextDraft: ReservationDraft = {
      ...draft,
      customerName: name.trim(),
      phone: normalizedPhone,
      note: note.trim(),
      totalAmount: totals.totalAmount,
      totalQuantity: totals.totalQuantity,
    };

    writeDraft(nextDraft);
    setDraft(nextDraft);

    const payload = {
      channel: "WEB",
      source: "next-web-app",
      storeName: "かむらど",

      name: name.trim(),
      phone: normalizedPhone,
      note: note.trim(),

      pickupDate: nextDraft.pickupDate,
      pickupTime: nextDraft.pickupTime,

      items: nextDraft.items,
      totalQuantity: totals.totalQuantity,
      totalAmount: totals.totalAmount,

      customer: {
        name: name.trim(),
        phone: normalizedPhone,
        note: note.trim(),
      },

      reservation: {
        pickupDate: nextDraft.pickupDate,
        pickupTime: nextDraft.pickupTime,
      },

      submittedAt: new Date().toISOString(),
    };

    try {
      setSubmitting(true);

      const result = await submitReservation(payload);

      const reservationNo =
        result.reservationNo || result.reservation_no || result.id || "";

      clearReservationStorage();
      setCompleted({
        reservationNo,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "予約の送信に失敗しました。時間をおいて再度お試しください。";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">お客様情報を読み込み中です…</p>
        </div>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-800">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-sm tracking-[0.2em] text-amber-700">COMPLETE</p>
          <h1 className="mt-2 text-2xl font-bold">ご予約を受け付けました</h1>

          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-stone-700">
            <p>ありがとうございます。ご予約内容を送信しました。</p>
            {completed.reservationNo ? (
              <p className="mt-2 font-medium">
                予約番号：{completed.reservationNo}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-6 py-3 text-sm font-medium text-white"
            >
              トップへ戻る
            </Link>

            <button
              type="button"
              onClick={() => router.push("/reserve/menu")}
              className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700"
            >
              もう一度予約する
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!draft.items || draft.items.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-800">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">お客様情報の入力</h1>
          <p className="mt-3 text-sm text-stone-600">
            先にメニューと受取日時を選択してください。
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <p className="text-sm tracking-[0.2em] text-amber-700">RESERVE</p>
          <h1 className="mt-1 text-2xl font-bold">お客様情報の入力</h1>
          <p className="mt-2 text-sm text-stone-600">
            内容をご確認のうえ、ご予約を確定してください。
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
          <span className="rounded-full bg-amber-900 px-3 py-1 text-white">
            3. 日時
          </span>
          <span>→</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            4. お客様情報
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">ご入力情報</h2>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">お名前</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：山田 太郎"
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-amber-700"
                />
                {errors.name ? (
                  <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">電話番号</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="例：09012345678"
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-amber-700"
                />
                <p className="mt-2 text-xs text-stone-500">
                  ハイフンなしでも入力できます。
                </p>
                {errors.phone ? (
                  <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  備考（任意）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="ご要望があればご記入ください"
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-amber-700"
                />
              </div>
            </div>

            {submitError ? (
              <div className="mt-5 rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Link
                href="/reserve/schedule"
                className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                受取日時を変更する
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-6 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90"
              >
                {submitting ? "送信中…" : "この内容で予約する"}
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-lg font-semibold">受取情報</h2>
              <div className="mt-4 space-y-3 text-sm text-stone-700">
                <div className="flex items-center justify-between gap-4">
                  <span>受取日</span>
                  <span className="text-right font-medium">
                    {formatDateLabel(draft.pickupDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>受取時間</span>
                  <span className="font-medium">{draft.pickupTime}</span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">ご注文内容</h2>

              <div className="mt-4 space-y-4">
                {draft.items.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-stone-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.name}</p>

                        {item.selectedOptionLabel ? (
                          <p className="mt-1 text-xs text-stone-500">
                            オプション：{item.selectedOptionLabel}
                          </p>
                        ) : null}

                        {item.selectedOptions && item.selectedOptions.length > 0 ? (
                          <p className="mt-1 text-xs text-stone-500">
                            選択：{item.selectedOptions.join(" / ")}
                          </p>
                        ) : null}

                        <p className="mt-1 text-xs text-stone-500">
                          ¥{money.format(item.price)} × {item.quantity}
                        </p>
                      </div>

                      <p className="text-sm font-semibold">
                        ¥{money.format(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-stone-50 p-4">
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>商品数</span>
                  <span>{totals.totalQuantity}点</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-base font-bold">
                  <span>合計</span>
                  <span>¥{money.format(totals.totalAmount)}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
