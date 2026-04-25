"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type ReserveMenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  label?: string;
  itemType?: "bento" | "drink" | "extra";
};

type CartItem = {
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

type ReservationDraft = {
  items: CartItem[];
  pickupDate?: string;
  pickupTime?: string;
  customerName?: string;
  phone?: string;
  note?: string;
  updatedAt?: number;
};

type MenuCardViewProps = {
  item: ReserveMenuItem;
  cartQty: number;
  onIncrement: (item: ReserveMenuItem) => void;
  onDecrement: (item: ReserveMenuItem) => void;
};

const STORAGE_KEYS = [
  "kamurado-reserve-draft",
  "kamurado-reservation-draft",
  "reservationDraft",
  "webReservationDraft",
];

/**
 * ここでは raw の画像URLを持たせる
 * 表示時だけ /api/image-proxy を通す
 */
const BENTO_MENUS: ReserveMenuItem[] = [
  {
    id: "karaage_bento",
    name: "からあげ弁当",
    price: 700,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/04/signal-2026-03-23-214213_002.jpg",
    description:
      "定番人気。外は香ばしく、中はジューシーに仕上げた定番のお弁当です。",
    label: "人気",
    itemType: "bento",
  },
  {
    id: "shogayaki_bento",
    name: "生姜焼き弁当",
    price: 700,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/04/名称未設定のデザイン-5-1.png",
    description:
      "ごはんが進む王道の味。やわらかいお肉と香りの良い生姜だれ。",
    itemType: "bento",
  },
  {
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 900,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/04/名称未設定のデザイン-3-1.png",
    description:
      "甘酢とタルタルの相性が抜群。満足感のある一品です。",
    label: "おすすめ",
    itemType: "bento",
  },
];

const EXTRA_MENUS: ReserveMenuItem[] = [
  {
    id: "extra_karaage",
    name: "追加からあげ",
    price: 80,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/04/SCN_20260409_2239.pdf.jpg",
    description: "もう1個食べたい時に。1個から追加できます。",
    itemType: "extra",
  },
];

const DRINK_MENUS: ReserveMenuItem[] = [
  {
    id: "drink_irohasu",
    name: "いろはす",
    price: 150,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/04/スクリーンショット-2026-04-08-9.14.51.png",
    description:
      "食事に合わせやすい、すっきり飲みやすいミネラルウォーター。",
    itemType: "drink",
  },
  {
    id: "drink_yakan_mugicha",
    name: "やかんの麦茶",
    price: 200,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/04/スクリーンショット-2026-04-08-9.15.18.png",
    description:
      "香ばしくやさしい味わい。食事にも合わせやすい定番ドリンク。",
    itemType: "drink",
  },
  {
    id: "drink_cocacola_zero",
    name: "コカ・コーラゼロ",
    price: 200,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/04/名称未設定のデザイン.png",
    description:
      "すっきり飲みやすいゼロ系コーラ。後味も軽やかです。",
    itemType: "drink",
  },
];

function buildProxyImageUrl(imageUrl?: string) {
  const value = (imageUrl || "").trim();
  if (!value) return "";

  // すでに proxy 化済みならそのまま使う
  if (value.startsWith("/api/image-proxy?url=")) {
    return value;
  }

  return `/api/image-proxy?url=${encodeURIComponent(value)}`;
}

function formatPrice(value: number) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}

function normalizeCartItem(item: unknown): CartItem | null {
  if (!item || typeof item !== "object") return null;

  const raw = item as Record<string, unknown>;

  const id = String(raw.id || "");
  const name = String(raw.name || "");
  const quantity = Math.max(0, Number(raw.quantity || 0));

  if (!id || !name || quantity <= 0) {
    return null;
  }

  return {
    id,
    name,
    price: Number(raw.price || 0),
    quantity,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : "",
    description: typeof raw.description === "string" ? raw.description : "",
    itemType:
      raw.itemType === "drink" ||
      raw.itemType === "extra" ||
      raw.itemType === "bento"
        ? raw.itemType
        : "bento",
    selectedOptionLabel:
      typeof raw.selectedOptionLabel === "string"
        ? raw.selectedOptionLabel
        : "",
    selectedOptions: Array.isArray(raw.selectedOptions)
      ? raw.selectedOptions.map((v) => String(v))
      : [],
    note: typeof raw.note === "string" ? raw.note : "",
  };
}

function safeParseDraft(raw: string | null): ReservationDraft | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    const items = Array.isArray(record.items)
      ? record.items
          .map(normalizeCartItem)
          .filter((item): item is CartItem => Boolean(item))
      : [];

    return {
      items,
      pickupDate: typeof record.pickupDate === "string" ? record.pickupDate : "",
      pickupTime: typeof record.pickupTime === "string" ? record.pickupTime : "",
      customerName:
        typeof record.customerName === "string" ? record.customerName : "",
      phone: typeof record.phone === "string" ? record.phone : "",
      note: typeof record.note === "string" ? record.note : "",
      updatedAt: Number(record.updatedAt || 0),
    };
  } catch {
    return null;
  }
}

function getStoredDraftValue(key: string) {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getCartQuantity(draft: ReservationDraft) {
  return draft.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function chooseBestDraft(candidates: ReservationDraft[]) {
  if (candidates.length === 0) {
    return { items: [] };
  }

  const sorted = [...candidates].sort((a, b) => {
    const aQty = getCartQuantity(a);
    const bQty = getCartQuantity(b);

    // 空データより、商品が入っているデータを優先
    if (aQty > 0 && bQty <= 0) return -1;
    if (bQty > 0 && aQty <= 0) return 1;

    // 次に新しいデータを優先
    const aTime = Number(a.updatedAt || 0);
    const bTime = Number(b.updatedAt || 0);

    if (aTime !== bTime) {
      return bTime - aTime;
    }

    // 最後に数量が多い方を優先
    return bQty - aQty;
  });

  return sorted[0] || { items: [] };
}

function readDraft(): ReservationDraft {
  if (typeof window === "undefined") return { items: [] };

  const candidates: ReservationDraft[] = [];

  for (const key of STORAGE_KEYS) {
    const found = safeParseDraft(getStoredDraftValue(key));
    if (found) {
      candidates.push(found);
    }
  }

  return chooseBestDraft(candidates);
}

function writeDraft(draft: ReservationDraft) {
  if (typeof window === "undefined") return;

  const value = JSON.stringify({
    ...draft,
    items: Array.isArray(draft.items) ? draft.items : [],
    updatedAt: Date.now(),
  });

  for (const key of STORAGE_KEYS) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Safariのプライベートブラウズ等でlocalStorageが失敗しても画面は落とさない
    }
  }
}

function MenuCardImage({
  imageUrl,
  alt,
  itemType,
}: {
  imageUrl?: string;
  alt: string;
  itemType?: ReserveMenuItem["itemType"];
}) {
  const src = useMemo(() => buildProxyImageUrl(imageUrl), [imageUrl]);
  const [hasError, setHasError] = useState(false);
  const isDrink = itemType === "drink";

  return (
    <div
      className={
        isDrink
          ? "h-[150px] md:h-[160px]"
          : "h-[240px] md:h-[170px] lg:h-[160px]"
      }
      style={{
        width: "100%",
        background: hasError
          ? "linear-gradient(135deg, rgba(110,75,42,0.08), rgba(184,139,67,0.14))"
          : "#f6efe4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderBottom: "1px solid rgba(189,167,142,0.25)",
      }}
    >
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setHasError(true)}
          style={{
            width: isDrink ? "72%" : "100%",
            height: isDrink ? "72%" : "100%",
            objectFit: isDrink ? "contain" : "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            textAlign: "center",
            color: "#8a6240",
            fontWeight: 700,
            letterSpacing: "0.12em",
            fontSize: 14,
          }}
        >
          KAMURADO
        </div>
      )}
    </div>
  );
}

function MenuCardView({
  item,
  cartQty,
  onIncrement,
  onDecrement,
}: MenuCardViewProps) {
  return (
    <article
      className="rounded-3xl border border-stone-200 bg-white"
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 12px 32px rgba(74, 44, 19, 0.06)",
      }}
    >
      <MenuCardImage
  imageUrl={item.imageUrl}
  alt={item.name}
  itemType={item.itemType}
/>

      <div
        className="p-6"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {item.label ? (
              <div
                className="rounded-full bg-amber-900 text-white"
                style={{
                  display: "inline-flex",
                  marginBottom: 12,
                  fontSize: 13,
                  padding: "8px 14px",
                  fontWeight: 700,
                }}
              >
                {item.label}
              </div>
            ) : null}

            <h3
              style={{
                fontSize: 24,
                lineHeight: 1.4,
                fontWeight: 700,
                color: "#2f241d",
                margin: 0,
              }}
            >
              {item.name}
            </h3>
          </div>

          <div
            style={{
              color: "#b3873d",
              fontSize: 22,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {formatPrice(item.price)}
          </div>
        </div>

        {item.description ? (
          <p
            style={{
              color: "#7c6a5b",
              fontSize: 16,
              lineHeight: 1.9,
              margin: 0,
            }}
          >
            {item.description}
          </p>
        ) : null}

        {cartQty > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: "auto",
            }}
          >
            <div
              style={{
                color: "#8a6240",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              カートに {cartQty} 点
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => onDecrement(item)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 9999,
                  border: "1px solid rgba(138,98,64,0.22)",
                  background: "#fff",
                  color: "#8a6240",
                  fontSize: 24,
                  lineHeight: 1,
                  fontWeight: 700,
                }}
              >
                −
              </button>

              <div
                style={{
                  minWidth: 28,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#2f241d",
                }}
              >
                {cartQty}
              </div>

              <button
                type="button"
                onClick={() => onIncrement(item)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 9999,
                  border: "none",
                  background: "#9a6739",
                  color: "#fff",
                  fontSize: 24,
                  lineHeight: 1,
                  fontWeight: 700,
                }}
              >
                ＋
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onIncrement(item)}
            style={{
              marginTop: "auto",
              width: "100%",
              border: "none",
              borderRadius: 9999,
              background: "#9a6739",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              padding: "18px 20px",
              boxShadow: "0 10px 24px rgba(154,103,57,0.2)",
            }}
          >
            カートに追加
          </button>
        )}
      </div>
    </article>
  );
}

export default function ReserveMenuPage() {
  const [draft, setDraft] = useState<ReservationDraft>({ items: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refreshDraft = () => {
      const current = readDraft();
      setDraft(current);
      setMounted(true);
    };

    refreshDraft();

    // ブラウザバックやタブ復帰時に古い表示のままにならないように再読み込み
    window.addEventListener("pageshow", refreshDraft);
    window.addEventListener("focus", refreshDraft);

    return () => {
      window.removeEventListener("pageshow", refreshDraft);
      window.removeEventListener("focus", refreshDraft);
    };
  }, []);

  const cartCount = useMemo(() => {
    return draft.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [draft.items]);

  const cartTotal = useMemo(() => {
    return draft.items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [draft.items]);

  const itemQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    draft.items.forEach((item) => {
      map.set(item.id, Number(item.quantity || 0));
    });
    return map;
  }, [draft.items]);

  function updateDraftItemsFrom(updater: (items: CartItem[]) => CartItem[]) {
    setDraft((prev) => {
      const nextItems = updater(Array.isArray(prev.items) ? prev.items : []);

      const updated: ReservationDraft = {
        ...prev,
        items: nextItems,
        updatedAt: Date.now(),
      };

      writeDraft(updated);

      return updated;
    });
  }

  function incrementItem(item: ReserveMenuItem) {
    updateDraftItemsFrom((items) => {
      const nextItems = [...items];
      const index = nextItems.findIndex((cartItem) => cartItem.id === item.id);

      if (index >= 0) {
        nextItems[index] = {
          ...nextItems[index],
          quantity: Number(nextItems[index].quantity || 0) + 1,
        };
      } else {
        nextItems.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          imageUrl: item.imageUrl || "",
          description: item.description || "",
          itemType: item.itemType || "bento",
          selectedOptionLabel: "",
          selectedOptions: [],
          note: "",
        });
      }

      return nextItems;
    });
  }

  function decrementItem(item: ReserveMenuItem) {
    updateDraftItemsFrom((items) => {
      return items
        .map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: Math.max(0, Number(cartItem.quantity || 0) - 1),
              }
            : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0);
    });
  }

  function syncDraftBeforeNavigate() {
    const updated: ReservationDraft = {
      ...draft,
      items: Array.isArray(draft.items) ? draft.items : [],
      updatedAt: Date.now(),
    };

    writeDraft(updated);
  }

  function handleCartLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    syncDraftBeforeNavigate();

    if (cartCount <= 0) {
      event.preventDefault();
      alert("商品を1つ以上カートに追加してください。");
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{
        background:
          "linear-gradient(180deg, #f7f1e6 0%, #f5efe2 40%, #f3ecde 100%)",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <section
          className="rounded-[32px] border p-6 md:p-8"
          style={{
            borderColor: "#ead9bd",
            background: "rgba(255,255,255,0.58)",
            backdropFilter: "blur(4px)",
            boxShadow: "0 20px 60px rgba(93, 62, 33, 0.08)",
          }}
        >
          <div
            style={{
              color: "#8a6240",
              letterSpacing: "0.2em",
              fontSize: 15,
              marginBottom: 14,
              fontWeight: 700,
            }}
          >
            RESERVE
          </div>

          <h1
            style={{
              marginBottom: 14,
              fontSize: 34,
              lineHeight: 1.3,
              color: "#2f241d",
              fontWeight: 800,
            }}
          >
            メニューを選ぶ
          </h1>

          <p
            style={{
              fontSize: 17,
              marginBottom: 24,
              color: "#6f5b4b",
              lineHeight: 1.8,
            }}
          >
            ご希望の商品をカートに追加してください。
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {["1. メニュー", "2. カート", "3. 日時", "4. お客様情報"].map(
              (step, index) => (
                <div
                  key={step}
                  style={{
                    borderRadius: 999,
                    padding: "16px 12px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 16,
                    lineHeight: 1.4,
                    color: index === 0 ? "#fff" : "#7a6858",
                    background: index === 0 ? "#9a6739" : "#efe5d4",
                    boxShadow:
                      index === 0
                        ? "0 10px 24px rgba(154,103,57,0.2)"
                        : "none",
                  }}
                >
                  {step}
                </div>
              )
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontSize: 28,
                lineHeight: 1.4,
                color: "#2f241d",
                fontWeight: 800,
                margin: 0,
              }}
            >
              お弁当
            </h2>

            <Link
              href="/reserve/cart"
              onClick={handleCartLinkClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9999,
                background: cartCount > 0 ? "#9a6739" : "#c9b8a3",
                color: "#fff",
                padding: "16px 26px",
                fontWeight: 700,
                fontSize: 18,
                textDecoration: "none",
                boxShadow:
                  cartCount > 0
                    ? "0 10px 24px rgba(154,103,57,0.2)"
                    : "none",
              }}
            >
              カートを見る（{cartCount}）
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {BENTO_MENUS.map((item) => (
              <MenuCardView
                key={item.id}
                item={item}
                cartQty={itemQtyMap.get(item.id) || 0}
                onIncrement={incrementItem}
                onDecrement={decrementItem}
              />
            ))}
          </div>

          <div style={{ height: 28 }} />

          <h2
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "#2f241d",
              fontWeight: 800,
              margin: 0,
              marginBottom: 20,
            }}
          >
            追加メニュー
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {EXTRA_MENUS.map((item) => (
              <MenuCardView
                key={item.id}
                item={item}
                cartQty={itemQtyMap.get(item.id) || 0}
                onIncrement={incrementItem}
                onDecrement={decrementItem}
              />
            ))}
          </div>

          <div style={{ height: 28 }} />

          <h2
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "#2f241d",
              fontWeight: 800,
              margin: 0,
              marginBottom: 20,
            }}
          >
            ドリンク
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {DRINK_MENUS.map((item) => (
              <MenuCardView
                key={item.id}
                item={item}
                cartQty={itemQtyMap.get(item.id) || 0}
                onIncrement={incrementItem}
                onDecrement={decrementItem}
              />
            ))}
          </div>

          <div
            style={{
              position: "sticky",
              bottom: 16,
              marginTop: 28,
              zIndex: 20,
            }}
          >
            <div
              className="rounded-[28px] border bg-white/95 p-4 md:p-5"
              style={{
                borderColor: "#ead9bd",
                boxShadow: "0 18px 50px rgba(93, 62, 33, 0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      color: "#8a6240",
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    現在のカート
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#2f241d",
                    }}
                  >
                    {cartCount}点 ／ {formatPrice(cartTotal)}
                  </div>
                </div>

                <Link
                  href="/reserve/cart"
                  onClick={handleCartLinkClick}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9999,
                    background: cartCount > 0 ? "#9a6739" : "#c9b8a3",
                    color: "#fff",
                    padding: "18px 34px",
                    minWidth: 220,
                    fontWeight: 700,
                    fontSize: 18,
                    textDecoration: "none",
                    boxShadow:
                      cartCount > 0
                        ? "0 10px 24px rgba(154,103,57,0.2)"
                        : "none",
                  }}
                >
                  カートへ進む
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
