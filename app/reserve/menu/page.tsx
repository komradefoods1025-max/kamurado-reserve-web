'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
const NEXT_STEP_CANDIDATES = [
  '/reserve/schedule',
  '/reserve/customer',
  '/reserve/date',
  '/reserve/form',
];

const ITEMS: MenuItem[] = [
  {
    id: 'karaage-bento',
    name: 'からあげ弁当',
    price: 700,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e59490e68f9ae38192.jpeg',
    description: '外はカリッと、中はジューシー。定番人気のお弁当です。',
    category: 'bento',
    badge: '人気',
  },
  {
    id: 'shogayaki-bento',
    name: '生姜焼き弁当',
    price: 700,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/5.png',
    description: '生姜の香りと旨みがしっかり広がる、ご飯が進む一品。',
    category: 'bento',
    badge: 'おすすめ',
  },
  {
    id: 'chicken-nanban-bento',
    name: 'チキン南蛮弁当',
    price: 900,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/3.png',
    description: 'コクのある味わいで満足感しっかり。食べ応えのある一品。',
    category: 'bento',
    badge: '満足感',
  },
  {
    id: 'extra-karaage',
    name: '追加唐揚げ',
    price: 80,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/photo_2026-03-22_14-58-55.jpg',
    description: 'あと一品ほしい時にぴったり。1個から追加できます。',
    category: 'extra',
    badge: '追加',
  },
  {
    id: 'drink-1',
    name: 'いろはす',
    price: 150,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e6b0b4-1.jpg',
    description: 'すっきり飲みやすいミネラルウォーター',
    category: 'drink',
  },
  {
    id: 'drink-2',
    name: 'やかんの麦茶',
    price: 200,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/518rlhbonql.jpg',
    description: 'お弁当と相性のよい定番ドリンク',
    category: 'drink',
  },
  {
    id: 'drink-3',
    name: 'コカ・コーラ',
    price: 200,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e382b3e383bce383a9-1.jpg',
    description: '炭酸の爽快感で食事がもっと楽しく',
    category: 'drink',
  },
  {
    id: 'drink-4',
    name: 'コカ・コーラゼロ',
    price: 200,
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/mono62457659-240314-02.jpg',
    description: 'ゼロシュガー・ゼロカロリー',
    category: 'drink',
  },
];

const categoryLabelMap: Record<MenuCategory | 'all', string> = {
  all: 'すべて',
  bento: 'お弁当',
  extra: '追加',
  drink: 'ドリンク',
};

const solidBrownStyle: CSSProperties = {
  backgroundColor: '#7a5536',
  color: '#ffffff',
  borderColor: '#7a5536',
  opacity: 1,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: 'none',
  boxShadow: '0 10px 24px rgba(122, 85, 54, 0.22)',
  filter: 'none',
};

const solidBrownPressedStyle: CSSProperties = {
  backgroundColor: '#68482e',
  color: '#ffffff',
  borderColor: '#68482e',
  opacity: 1,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: 'none',
  boxShadow: '0 10px 24px rgba(122, 85, 54, 0.22)',
  filter: 'none',
};

const activeCategoryStyle: CSSProperties = {
  backgroundColor: '#7a5536',
  color: '#ffffff',
  borderColor: '#7a5536',
  opacity: 1,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: 'none',
  boxShadow: '0 6px 18px rgba(122, 85, 54, 0.22)',
  filter: 'none',
};

function formatPrice(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

async function resolveNextStepPath() {
  for (const path of NEXT_STEP_CANDIDATES) {
    try {
      const response = await fetch(path, {
        method: 'HEAD',
        cache: 'no-store',
      });

      if (response.ok) {
        return path;
      }
    } catch (error) {
      console.error(`Path check failed: ${path}`, error);
    }
  }

  return NEXT_STEP_CANDIDATES[0];
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
      style={{
        appearance: 'none',
        WebkitAppearance: 'none',
        opacity: 1,
      }}
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
  const [hoveredButtonId, setHoveredButtonId] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);

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

  const handleNext = async () => {
    if (totalCount === 0 || isRouting) return;

    setIsRouting(true);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      const nextPath = await resolveNextStepPath();
      router.push(nextPath);
    } catch (error) {
      console.error('Failed to move next step:', error);
      alert('次の画面へ進めませんでした。もう一度お試しください。');
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#f2eadf_48%,#eee2d2_100%)] text-stone-800">
      <div className="mx-auto max-w-7xl px-4 pb-36 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-amber-900/10 bg-white/70 shadow-[0_20px_60px_rgba(60,35,10,0.08)] backdrop-blur">
          <div className="bg-[linear-gradient(135deg,#4f3321,#6c4a31)] px-5 py-6 text-white sm:px-8">
            <div className="text-sm tracking-[0.2em] text-amber-100">KAMURADO TAKEOUT</div>
            <h1 className="mt-2 text-2xl font-bold tracking-wide sm:text-3xl">
              お弁当・ドリンクを選ぶ
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-50/90">
              お受け取り前に、まずはご注文内容を選択してください。
              数量の調整や削除もこの画面で行えます。
            </p>
          </div>

          <div className="border-t border-amber-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(247,240,231,0.65))] px-4 py-4 sm:px-6">
            <div className="flex flex-wrap gap-3">
              {(['all', 'bento', 'extra', 'drink'] as const).map((category) => {
                const isActive = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className="rounded-full border px-4 py-2 text-sm font-semibold transition"
                    style={
                      isActive
                        ? activeCategoryStyle
                        : {
                            backgroundColor: '#ffffff',
                            color: '#5f4630',
                            borderColor: '#e7d7c4',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            backgroundImage: 'none',
                          }
                    }
                  >
                    {categoryLabelMap[category]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const quantity = cart[item.id] || 0;
                const isHovered = hoveredButtonId === item.id;

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
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-bold tracking-wide text-stone-900">
                            {item.name}
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-stone-600">
                            {item.description}
                          </p>
                        </div>

                        <div
                          className="inline-flex h-10 min-w-[84px] shrink-0 items-center justify-center self-start rounded-full border px-3.5 text-sm font-semibold leading-none"
                          style={{
                            backgroundColor: '#fbf4e9',
                            color: '#6b4a2f',
                            borderColor: '#e5d2bb',
                            opacity: 1,
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            backgroundImage: 'none',
                            filter: 'none',
                            lineHeight: 1,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {formatPrice(item.price)}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-3">
                        {quantity === 0 ? (
                          <button
                            type="button"
                            onClick={() => addItem(item.id)}
                            onMouseEnter={() => setHoveredButtonId(item.id)}
                            onMouseLeave={() => setHoveredButtonId(null)}
                            className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                            style={isHovered ? solidBrownPressedStyle : solidBrownStyle}
                          >
                            カートに追加
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <QuantityButton label="−" onClick={() => decreaseItem(item.id)} />
                              <div className="min-w-[48px] text-center text-lg font-bold text-stone-900">
                                {quantity}
                              </div>
                              <QuantityButton label="＋" onClick={() => increaseItem(item.id)} />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                              style={{
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                opacity: 1,
                              }}
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
                    まだ商品が入っていません。
                    <br />
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
                            <QuantityButton label="−" onClick={() => decreaseItem(line.id)} />
                            <div className="min-w-[40px] text-center text-sm font-bold">
                              {line.quantity}
                            </div>
                            <QuantityButton label="＋" onClick={() => increaseItem(line.id)} />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(line.id)}
                            className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            style={{
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              opacity: 1,
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-2xl bg-[linear-gradient(180deg,#faf7f2,#f3ece2)] p-4">
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
                  disabled={cartLines.length === 0 || isRouting}
                  className="mt-4 hidden w-full rounded-2xl border px-4 py-4 text-sm font-bold transition disabled:cursor-not-allowed lg:block"
                  style={
                    cartLines.length === 0 || isRouting
                      ? {
                          backgroundColor: '#d6d3d1',
                          color: '#ffffff',
                          borderColor: '#d6d3d1',
                          opacity: 1,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          backgroundImage: 'none',
                          boxShadow: 'none',
                        }
                      : solidBrownStyle
                  }
                >
                  {isRouting ? '移動中...' : '受取日時の選択へ進む'}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-stone-500">
                  商品内容は次の画面でも確認できます。
                </p>

                <div className="mt-3 rounded-[24px] border border-amber-900/10 bg-white/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:hidden">
                  <div className="min-w-0">
                    <div className="text-xs text-stone-500">ご注文合計</div>
                    <div className="truncate text-lg font-bold text-stone-900">
                      {formatPrice(totalPrice)}{' '}
                      <span className="ml-1 text-sm font-medium text-stone-500">
                        ({totalCount}点)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-50 px-4 lg:hidden"
        style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={handleNext}
          disabled={cartLines.length === 0 || isRouting}
          className="w-full rounded-[24px] border px-4 py-4 text-sm font-bold transition disabled:cursor-not-allowed"
          style={
            cartLines.length === 0 || isRouting
              ? {
                  backgroundColor: '#d6d3d1',
                  color: '#ffffff',
                  borderColor: '#d6d3d1',
                  opacity: 1,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: 'none',
                  boxShadow: 'none',
                }
              : solidBrownStyle
          }
        >
          {isRouting ? '移動中...' : '受取日時の選択へ進む'}
        </button>
      </div>
    </main>
  );
}
