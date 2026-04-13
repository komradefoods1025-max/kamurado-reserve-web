'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type MenuCategory = 'bento' | 'extra' | 'drink';

type MenuItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description: string;
  category: MenuCategory;
  badge?: string;
};

type CartMap = Record<string, number>;

const STORAGE_KEY = 'kamurado-reservation-cart';

/**
 * ここだけ今のアプリの次画面URLに合わせて変更してね
 * 例:
 * /reserve/customer
 * /reserve/form
 * /reserve/confirm
 */
const NEXT_STEP_PATH = '/reserve/customer';

/**
 * 画像URLは今使っているものに差し替えてOK
 * imageUrl が空でも画面は崩れないようにしてある
 */
const ITEMS: MenuItem[] = [
  {
    id: 'karaage-bento',
    name: 'からあげ弁当',
    price: 700,
    imageUrl: '/images/karaage-bento.jpg',
    description: '外はカリッと、中はジューシー。定番人気のお弁当です。',
    category: 'bento',
    badge: '人気',
  },
  {
    id: 'shogayaki-bento',
    name: '生姜焼き弁当',
    price: 700,
    imageUrl: '/images/shogayaki-bento.jpg',
    description: '生姜の香りと旨みがしっかり広がる、ご飯が進む一品。',
    category: 'bento',
    badge: 'おすすめ',
  },
  {
    id: 'chicken-nanban-bento',
    name: 'チキン南蛮弁当',
    price: 900,
    imageUrl: '/images/chicken-nanban-bento.jpg',
    description: 'コクのある味わいで満足感しっかり。食べ応えのある一品。',
    category: 'bento',
    badge: '満足感',
  },
  {
    id: 'extra-karaage',
    name: '追加唐揚げ',
    price: 80,
    imageUrl: '/images/extra-karaage.jpg',
    description: 'あと一品ほしい時にぴったり。1個から追加できます。',
    category: 'extra',
    badge: '追加',
  },

  /**
   * ドリンク4種は今の登録内容に合わせて name / price / imageUrl を調整してね
   */
  {
    id: 'drink-1',
    name: 'いろはす',
    price: 150,
    imageUrl: '/images/drink-water.jpg',
    description: 'すっきり飲みやすい定番ドリンク。',
    category: 'drink',
  },
  {
    id: 'drink-2',
    name: '烏龍茶',
    price: 200,
    imageUrl: '/images/drink-oolong.jpg',
    description: 'お弁当と相性のよい、さっぱりした味わい。',
    category: 'drink',
  },
  {
    id: 'drink-3',
    name: 'コーラ',
    price: 200,
    imageUrl: '/images/drink-cola.jpg',
    description: '炭酸の爽快感で食事がもっと楽しく。',
    category: 'drink',
  },
  {
    id: 'drink-4',
    name: 'ホットコーヒー',
    price: 300,
    imageUrl: '/images/drink-coffee.jpg',
    description: '食後にも合う、香りを楽しめる一杯。',
    category: 'drink',
  },
];

const categoryLabelMap: Record<MenuCategory | 'all', string> = {
  all: 'すべて',
  bento: 'お弁当',
  extra: '追加',
  drink: 'ドリンク',
};

function formatPrice(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function QuantityButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={label}
    >
      {label}
    </button>
  );
}

export default function ReserveMenuPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartMap>({});
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'all'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as CartMap;
      if (parsed && typeof parsed === 'object') {
        setCart(parsed);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }, [cart, mounted]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return ITEMS;
    return ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const item = ITEMS.find((menu) => menu.id === id);
        if (!item || quantity <= 0) return null;
        return {
          ...item,
          quantity,
          lineTotal: item.price * quantity,
        };
      })
      .filter(Boolean) as Array<MenuItem & { quantity: number; lineTotal: number }>;
  }, [cart]);

  const totalCount = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.quantity, 0);
  }, [cartLines]);

  const totalPrice = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
  }, [cartLines]);

  const setItemQuantity = (itemId: string, nextQuantity: number) => {
    setCart((prev) => {
      const next = { ...prev };

      if (nextQuantity <= 0) {
        delete next[itemId];
        return next;
      }

      next[itemId] = nextQuantity;
      return next;
    });
  };

  const addItem = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const increaseItem = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const decreaseItem = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = { ...prev };

      if (current <= 1) {
        delete next[itemId];
        return next;
      }

      next[itemId] = current - 1;
      return next;
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleNext = () => {
    if (totalCount === 0) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      router.push(NEXT_STEP_PATH);
    } catch (error) {
      console.error('Failed to move next step:', error);
      alert('次の画面へ進めませんでした。もう一度お試しください。');
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#f2eadf_48%,#eee2d2_100%)] text-stone-800">
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-amber-900/10 bg-white/70 shadow-[0_20px_60px_rgba(60,35,10,0.08)] backdrop-blur">
          <div className="bg-[linear-gradient(135deg,rgba(73,44,23,0.96),rgba(98,64,40,0.92))] px-5 py-6 text-white sm:px-8">
            <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs tracking-[0.2em] text-amber-100">
              KAMURADO RESERVATION
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">ご予約メニュー</h1>
            <p className="mt-2 text-sm leading-6 text-amber-50/90 sm:text-base">
              和の落ち着きと、少し上質な雰囲気を意識した予約画面です。
              お好きな商品を選んで、次の画面へお進みください。
            </p>
          </div>

          <div className="border-t border-amber-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(249,244,237,0.88))] px-4 py-4 sm:px-8">
            <div className="flex flex-wrap gap-2">
              {(['all', 'bento', 'extra', 'drink'] as const).map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={[
                      'rounded-full border px-4 py-2 text-sm font-medium transition',
                      active
                        ? 'border-amber-700 bg-amber-700 text-white shadow-sm'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-amber-400 hover:text-amber-800',
                    ].join(' ')}
                  >
                    {categoryLabelMap[category]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const quantity = cart[item.id] || 0;

                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-[24px] border border-amber-900/10 bg-white/85 shadow-[0_12px_40px_rgba(60,35,10,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(60,35,10,0.12)]"
                  >
                    <div className="relative overflow-hidden border-b border-amber-900/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,1),rgba(243,236,226,1))]">
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(120,74,36,0.04),rgba(255,255,255,0))]" />
                      <div className="relative flex aspect-[4/3] items-center justify-center p-4">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-400">
                            画像準備中
                          </div>
                        )}
                      </div>

                      {item.badge ? (
                        <div className="absolute left-3 top-3 rounded-full bg-[linear-gradient(135deg,#8a623f,#6b4629)] px-3 py-1 text-xs font-semibold text-amber-50 shadow">
                          {item.badge}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold tracking-wide text-stone-900">
                            {item.name}
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-stone-600">
                            {item.description}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-800">
                          {formatPrice(item.price)}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-3">
                        {quantity === 0 ? (
                          <button
                            type="button"
                            onClick={() => addItem(item.id)}
                            className="w-full rounded-2xl bg-[linear-gradient(135deg,#6f4a2f,#8b633f)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                          >
                            カートに追加
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <QuantityButton
                                label="−"
                                onClick={() => decreaseItem(item.id)}
                              />
                              <div className="min-w-[48px] text-center text-lg font-bold text-stone-900">
                                {quantity}
                              </div>
                              <QuantityButton
                                label="＋"
                                onClick={() => increaseItem(item.id)}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-[24px] border border-amber-900/10 bg-white/90 shadow-[0_12px_40px_rgba(60,35,10,0.08)]">
              <div className="bg-[linear-gradient(135deg,#4f3321,#6c4a31)] px-5 py-4 text-white">
                <div className="text-sm tracking-[0.2em] text-amber-100">ORDER</div>
                <h2 className="mt-1 text-xl font-bold">ご注文内容</h2>
              </div>

              <div className="p-5">
                {cartLines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm leading-7 text-stone-500">
                    まだ商品が入っていません。<br />
                    気になる商品をカートに追加してください。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartLines.map((line) => (
                      <div
                        key={line.id}
                        className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-stone-900">
                              {line.name}
                            </div>
                            <div className="mt-1 text-xs text-stone-500">
                              {formatPrice(line.price)} × {line.quantity}
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-bold text-stone-900">
                            {formatPrice(line.lineTotal)}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QuantityButton
                              label="−"
                              onClick={() => decreaseItem(line.id)}
                            />
                            <div className="min-w-[40px] text-center text-sm font-bold">
                              {line.quantity}
                            </div>
                            <QuantityButton
                              label="＋"
                              onClick={() => increaseItem(line.id)}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(line.id)}
                            className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 rounded-2xl bg-[linear-gradient(180deg,#faf7f2,#f3ece2)] p-4">
                  <div className="flex items-center justify-between text-sm text-stone-600">
                    <span>点数</span>
                    <span>{totalCount}点</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">合計</span>
                    <span className="text-2xl font-bold text-stone-900">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={cartLines.length === 0}
                  className="mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,#7a5536,#9b724c)] px-4 py-4 text-sm font-bold text-white shadow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ご予約入力へ進む
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-stone-500">
                  商品内容は次の画面でも確認できます。
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-900/10 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-stone-500">ご注文合計</div>
            <div className="truncate text-lg font-bold text-stone-900">
              {formatPrice(totalPrice)}{' '}
              <span className="ml-1 text-sm font-medium text-stone-500">
                ({totalCount}点)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={cartLines.length === 0}
            className="shrink-0 rounded-2xl bg-[linear-gradient(135deg,#7a5536,#9b724c)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      </div>
    </main>
  );
}
