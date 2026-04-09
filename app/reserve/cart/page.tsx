
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

function readFirstAvailableJson<T>(keys: string[], fallback: T): T {
  for (const key of keys) {
    const value = readJson<T | null>(key, null);
    if (value) return value;
  }
  return fallback;
}

function writeCart(items: CartItem[]) {
  for (const key of CART_KEYS) {
    writeJson(key, items);
  }
}

function writeDraft(draft: ReservationDraft) {
  for (const key of DRAFT_KEYS) {
    writeJson(key, draft);
  }
}

function normalizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any, index) => {
      const quantity = Number(
        item?.quantity ?? item?.qty ?? item?.count ?? item?.amount ?? 1
      );
      const price = Number(item?.price ?? item?.unitPrice ?? 0);

      return {
        id: String(item?.id ?? item?.menuId ?? item?.key ?? `item-${index}`),
        name: String(item?.name ?? item?.title ?? "商品"),
        price: Number.isFinite(price) ? price : 0,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        imageUrl: item?.imageUrl ?? item?.image ?? "",
        description: item?.description ?? "",
        selectedOptionLabel:
          item?.selectedOptionLabel ??
          item?.optionLabel ??
          item?.selectedSizeLabel ??
          "",
        selectedOptions: Array.isArray(item?.selectedOptions)
          ? item.selectedOptions.map(String)
          : [],
        note: item?.note ?? "",
      };
    })
    .filter((item) => item.name);
}

function calcTotals(items: CartItem[]) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return { totalQuantity, totalAmount };
}

export default function ReserveCartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedCart = readFirstAvailableJson<unknown[]>(CART_KEYS, []);
    const normalized = normalizeCartItems(savedCart);
    setCartItems(normalized);

    const currentDraft = readFirstAvailableJson<ReservationDraft>(DRAFT_KEYS, {
      items: [],
    });
    const totals = calcTotals(normalized);

    writeDraft({
      ...currentDraft,
      items: normalized,
      totalAmount: totals.totalAmount,
      totalQuantity: totals.totalQuantity,
    });

    setLoaded(true);
  }, []);

  const totals = useMemo(() => calcTotals(cartItems), [cartItems]);

  function syncAll(nextItems: CartItem[]) {
    const normalized = normalizeCartItems(nextItems);
    setCartItems(normalized);
    writeCart(normalized);

    const currentDraft = readFirstAvailableJson<ReservationDraft>(DRAFT_KEYS, {
      items: [],
    });
    const nextTotals = calcTotals(normalized);

    writeDraft({
      ...currentDraft,
      items: normalized,
      totalAmount: nextTotals.totalAmount,
      totalQuantity: nextTotals.totalQuantity,
    });
  }

  function increaseQuantity(id: string) {
    const next = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    syncAll(next);
  }

  function decreaseQuantity(id: string) {
    const next = cartItems
      .map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
      .filter((item) => item.quantity > 0);
    syncAll(next);
  }

  function removeItem(id: string) {
    const next = cartItems.filter((item) => item.id !== id);
    syncAll(next);
  }

  function handleNext() {
    if (cartItems.length === 0) return;
    router.push("/reserve/schedule");
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">カートを読み込み中です…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <p className="text-sm tracking-[0.2em] text-amber-700">RESERVE</p>
          <h1 className="mt-1 text-2xl font-bold">ご注文内容の確認</h1>
          <p className="mt-2 text-sm text-stone-600">
            内容をご確認のうえ、受取日時の選択へ進んでください。
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2 text-xs text-stone-500">
          <span className="rounded-full bg-amber-900 px-3 py-1 text-white">
            1. メニュー
          </span>
          <span>→</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            2. カート
          </span>
          <span>→</span>
          <span className="rounded-full bg-stone-200 px-3 py-1">3. 日時</span>
          <span>→</span>
          <span className="rounded-full bg-stone-200 px-3 py-1">4. お客様情報</span>
        </div>

        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
            <p className="text-base font-medium">カートに商品が入っていません。</p>
            <p className="mt-2 text-sm text-stone-600">
              先にメニューを選んでください。
            </p>

            <div className="mt-6">
              <Link
                href="/reserve/menu"
                className="inline-flex rounded-2xl bg-amber-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                メニュー選択に戻る
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <section
                  key={item.id}
                  className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">{item.name}</h2>

                      {item.selectedOptionLabel ? (
                        <p className="mt-1 text-sm text-stone-600">
                          オプション：{item.selectedOptionLabel}
                        </p>
                      ) : null}

                      {item.selectedOptions && item.selectedOptions.length > 0 ? (
                        <p className="mt-1 text-sm text-stone-600">
                          選択：{item.selectedOptions.join(" / ")}
                        </p>
                      ) : null}

                      {item.note ? (
                        <p className="mt-1 text-sm text-stone-600">
                          備考：{item.note}
                        </p>
                      ) : null}

                      <p className="mt-2 text-sm text-stone-500">
                        ¥{money.format(item.price)} / 1点
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-semibold">
                        ¥{money.format(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.id)}
                        className="h-10 w-10 rounded-full border border-stone-300 text-lg hover:bg-stone-100"
                      >
                        －
                      </button>
                      <div className="min-w-[56px] rounded-2xl bg-stone-100 px-4 py-2 text-center text-sm font-medium">
                        {item.quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.id)}
                        className="h-10 w-10 rounded-full border border-stone-300 text-lg hover:bg-stone-100"
                      >
                        ＋
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-2xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      この商品を削除
                    </button>
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-stone-700">
                <span>商品数</span>
                <span>{totals.totalQuantity}点</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-lg font-bold text-stone-900">
                <span>合計金額</span>
                <span>¥{money.format(totals.totalAmount)}</span>
              </div>
            </section>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Link
                href="/reserve/menu"
                className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                メニューに戻る
              </Link>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                受取日時を選ぶ
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
