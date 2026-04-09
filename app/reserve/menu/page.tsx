
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MenuCard from "../../../components/MenuCard";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isSoldOut?: boolean;
  badge?: string;
};

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

const MENU_ITEMS: MenuItem[] = [
  {
    id: "karaage-bento",
    name: "唐揚げ弁当",
    price: 780,
    description: "定番人気。ジューシーな唐揚げをしっかり楽しめるお弁当です。",
    badge: "人気",
  },
  {
    id: "ginger-pork-bento",
    name: "生姜焼き弁当",
    price: 820,
    description: "ごはんが進む王道の味。やわらかいお肉と香りの良い生姜だれ。",
  },
  {
    id: "chicken-nanban-bento",
    name: "チキン南蛮弁当",
    price: 850,
    description: "甘酢とタルタルの相性が抜群。満足感のある一品です。",
    badge: "おすすめ",
  },
  {
    id: "daily-bento",
    name: "日替わり弁当",
    price: 700,
    description: "その日のお楽しみ。内容は日によって変わります。",
  },
  {
    id: "irohasu",
    name: "いろはす",
    price: 150,
    description: "お弁当と一緒にどうぞ。",
  },
  {
    id: "oolong-tea",
    name: "烏龍茶",
    price: 200,
    description: "食事に合わせやすい定番ドリンクです。",
  },
];

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

function toCartItem(item: MenuItem, quantity: number): CartItem {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    quantity,
    imageUrl: item.imageUrl,
    description: item.description,
  };
}

function calcTotals(items: CartItem[]) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return { totalQuantity, totalAmount };
}

export default function ReserveMenuPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedCart = readFirstAvailableJson<CartItem[]>(CART_KEYS, []);
    setCartItems(savedCart);

    const currentDraft = readFirstAvailableJson<ReservationDraft>(DRAFT_KEYS, {
      items: savedCart,
    });

    const totals = calcTotals(savedCart);

    writeDraft({
      ...currentDraft,
      items: savedCart,
      totalQuantity: totals.totalQuantity,
      totalAmount: totals.totalAmount,
    });

    setLoaded(true);
  }, []);

  const totalQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalAmount = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  function syncCart(nextItems: CartItem[]) {
    setCartItems(nextItems);
    writeCart(nextItems);

    const currentDraft = readFirstAvailableJson<ReservationDraft>(DRAFT_KEYS, {
      items: [],
    });

    const totals = calcTotals(nextItems);

    writeDraft({
      ...currentDraft,
      items: nextItems,
      totalQuantity: totals.totalQuantity,
      totalAmount: totals.totalAmount,
    });
  }

  function handleAdd(item: MenuItem) {
    const existing = cartItems.find((cartItem) => cartItem.id === item.id);

    let nextItems: CartItem[];

    if (existing) {
      nextItems = cartItems.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    } else {
      nextItems = [...cartItems, toCartItem(item, 1)];
    }

    syncCart(nextItems);
  }

  function handleDecrease(id: string) {
    const nextItems = cartItems
      .map((item) =>
        item.id === id ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter((item) => item.quantity > 0);

    syncCart(nextItems);
  }

  function handleIncrease(id: string) {
    const menuItem = MENU_ITEMS.find((item) => item.id === id);
    if (!menuItem) return;
    handleAdd(menuItem);
  }

  function handleRemove(id: string) {
    const nextItems = cartItems.filter((item) => item.id !== id);
    syncCart(nextItems);
  }

  function getQuantity(id: string) {
    return cartItems.find((item) => item.id === id)?.quantity ?? 0;
  }

  function handleNext() {
    if (cartItems.length === 0) return;
    router.push("/reserve/cart");
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">メニューを読み込み中です…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <p className="text-sm tracking-[0.2em] text-amber-700">RESERVE</p>
          <h1 className="mt-1 text-2xl font-bold">メニューを選ぶ</h1>
          <p className="mt-2 text-sm text-stone-600">
            ご希望の商品をカートに追加してください。
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2 text-xs text-stone-500">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            1. メニュー
          </span>
          <span>→</span>
          <span className="rounded-full bg-stone-200 px-3 py-1">2. カート</span>
          <span>→</span>
          <span className="rounded-full bg-stone-200 px-3 py-1">3. 日時</span>
          <span>→</span>
          <span className="rounded-full bg-stone-200 px-3 py-1">4. お客様情報</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
              {MENU_ITEMS.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  quantity={getQuantity(item.id)}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">カート</h2>

              {cartItems.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                  まだ商品が入っていません。
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-stone-100 pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            ¥{item.price.toLocaleString("ja-JP")} × {item.quantity}
                          </p>
                        </div>

                        <p className="text-sm font-semibold">
                          ¥{(item.price * item.quantity).toLocaleString("ja-JP")}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDecrease(item.id)}
                            className="h-8 w-8 rounded-full border border-stone-300 text-sm hover:bg-stone-100"
                          >
                            －
                          </button>
                          <div className="min-w-[40px] text-center text-sm font-medium">
                            {item.quantity}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleIncrease(item.id)}
                            className="h-8 w-8 rounded-full border border-stone-300 text-sm hover:bg-stone-100"
                          >
                            ＋
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="text-sm text-red-600 hover:opacity-80"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-base font-semibold">ご注文の合計</h2>

              <div className="mt-4 space-y-3 text-sm text-stone-700">
                <div className="flex items-center justify-between">
                  <span>商品数</span>
                  <span>{totalQuantity}点</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-stone-900">
                  <span>合計金額</span>
                  <span>¥{totalAmount.toLocaleString("ja-JP")}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={cartItems.length === 0}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-amber-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                カート確認へ進む
              </button>

              <Link
                href="/"
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                トップへ戻る
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
