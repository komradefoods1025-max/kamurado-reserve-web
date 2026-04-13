"use client";

import Link from "next/link";
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

const BENTO_MENUS: ReserveMenuItem[] = [
  {
    id: "karaage_bento",
    name: "からあげ弁当",
    price: 700,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e59490e68f9ae38192.jpeg",
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
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/photo_2026-03-22_14-13-55.jpg",
    description: "ごはんが進む王道の味。やわらかいお肉と香りの良い生姜だれ。",
    itemType: "bento",
  },
  {
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 900,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/3.png",
    description: "甘酢とタルタルの相性が抜群。満足感のある一品です。",
    label: "おすすめ",
    itemType: "bento",
  },
];

const EXTRA_MENUS: ReserveMenuItem[] = [
  {
    id: "extra_karaage",
    name: "追加唐揚げ",
    price: 80,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/photo_2026-03-22_14-58-55.jpg",
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
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e6b0b4-1.jpg",
    description: "食事に合わせやすい、すっきり飲みやすいミネラルウォーター。",
    itemType: "drink",
  },
  {
    id: "drink_yakan_mugicha",
    name: "やかんの麦茶",
    price: 200,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/518rlhbonql.jpg",
    description: "香ばしくやさしい味わい。食事にも合わせやすい定番ドリンク。",
    itemType: "drink",
  },
  {
    id: "drink_cocacola",
    name: "コカ・コーラ",
    price: 200,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e382b3e383bce383a9-1.jpg",
    description: "しっかり炭酸の定番コーラ。揚げ物との相性も抜群です。",
    itemType: "drink",
  },
  {
    id: "drink_cocacola_zero",
    name: "コカ・コーラゼロ",
    price: 200,
    imageUrl:
      "https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/mono62457659-240314-02.jpg",
    description: "すっきり飲みやすいゼロ系コーラ。後味も軽やかです。",
    itemType: "drink",
  },
];

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
        minHeight: 420,
      }}
    >
      <div
        style={{
          height: 160,
          background:
            item.imageUrl && item.imageUrl.trim()
              ? "transparent"
              : "linear-gradient(135deg, rgba(110,75,42,0.08), rgba(184,139,67,0.14))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(189,167,142,0.25)",
          overflow: "hidden",
        }}
      >
        {item.imageUrl && item.imageUrl.trim() ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
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
                  padding: "7px 14px",
                }}
              >
                {item.label}
              </div>
            ) : null}

            <h3
              style={{
                fontSize: 22,
                lineHeight: 1.35,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {item.name}
            </h3>
          </div>

          <div
            style={{
              flexShrink: 0,
              color: "#b88b43",
              fontWeight: 700,
              fontSize: 18,
              whiteSpace: "nowrap",
            }}
          >
            ¥{item.price.toLocaleString("ja-JP")}
          </div>
        </div>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.9,
            minHeight: 88,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {item.description ?? ""}
        </p>

        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              color: "#6d6258",
              fontSize: 15,
              marginBottom: 12,
            }}
          >
            {cartQty > 0 ? `カート内 ${cartQty}点` : "カートに追加できます"}
          </div>

          {cartQty > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => onDecrement(item)}
                className="inline-flex items-center justify-center border"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  fontSize: 28,
                  background: "#fffdf9",
                }}
              >
                −
              </button>

              <div
                style={{
                  minWidth: 60,
                  textAlign: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#2d241c",
                }}
              >
                {cartQty}
              </div>

              <button
                type="button"
                onClick={() => onIncrement(item)}
                className="inline-flex items-center justify-center bg-amber-900 text-white"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  fontSize: 28,
                }}
              >
                ＋
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onIncrement(item)}
              className="inline-flex items-center justify-center bg-amber-900 text-white"
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 18,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              カートに追加
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function safeParseDraft(raw: string | null): ReservationDraft | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      pickupDate: parsed.pickupDate || "",
      pickupTime: parsed.pickupTime || "",
      customerName: parsed.customerName || "",
      phone: parsed.phone || "",
      note: parsed.note || "",
    };
  } catch {
    return null;
  }
}

function readDraft(): ReservationDraft {
  if (typeof window === "undefined") return { items: [] };

  for (const key of STORAGE_KEYS) {
    const found = safeParseDraft(window.localStorage.getItem(key));
    if (found) return found;
  }

  return { items: [] };
}

function writeDraft(draft: ReservationDraft) {
  if (typeof window === "undefined") return;
  const value = JSON.stringify(draft);
  STORAGE_KEYS.forEach((key) => {
    window.localStorage.setItem(key, value);
  });
}

export default function ReserveMenuPage() {
  const [draft, setDraft] = useState<ReservationDraft>({ items: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = readDraft();
    setDraft(current);
    setMounted(true);
  }, []);

  const cartCount = useMemo(() => {
    return draft.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [draft.items]);

  const itemQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    draft.items.forEach((item) => {
      map.set(item.id, Number(item.quantity || 0));
    });
    return map;
  }, [draft.items]);

  function incrementItem(item: ReserveMenuItem) {
    const nextItems = [...draft.items];
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

    const updated: ReservationDraft = {
      ...draft,
      items: nextItems,
    };

    setDraft(updated);
    writeDraft(updated);
  }

  function decrementItem(item: ReserveMenuItem) {
    const nextItems = draft.items
      .map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity: Math.max(0, Number(cartItem.quantity || 0) - 1),
            }
          : cartItem
      )
      .filter((cartItem) => cartItem.quantity > 0);

    const updated: ReservationDraft = {
      ...draft,
      items: nextItems,
    };

    setDraft(updated);
    writeDraft(updated);
  }

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div
            style={{
              color: "#8a6240",
              letterSpacing: "0.2em",
              fontSize: 15,
              marginBottom: 14,
            }}
          >
            RESERVE
          </div>

          <h1 style={{ marginBottom: 14 }}>メニューを選ぶ</h1>
          <p style={{ fontSize: 18, marginBottom: 20 }}>
            ご希望の商品をカートに追加してください。
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 22,
            }}
          >
            {["1. メニュー", "2. カート", "3. 日時", "4. お客様情報"].map((step, index) => (
              <div
                key={step}
                style={{
                  borderRadius: 999,
                  padding: "14px 12px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1.4,
                  background: index === 0 ? "#6f4a2b" : "rgba(89,70,48,0.08)",
                  color: index === 0 ? "#fff" : "#6d6258",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {step}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <h2>お弁当</h2>
            <Link
              href="/reserve/cart"
              className="inline-flex items-center justify-center bg-amber-900 text-white"
              style={{
                padding: "12px 18px",
                borderRadius: 18,
                minWidth: 170,
              }}
            >
              カートを見る {cartCount > 0 ? `(${cartCount})` : ""}
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              marginBottom: 28,
            }}
          >
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <h2>追加メニュー</h2>
            <div
              style={{
                color: "#6d6258",
                fontSize: 15,
              }}
            >
              もう少し食べたい時に
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              marginBottom: 28,
            }}
          >
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <h2>ドリンク</h2>
            <div
              style={{
                color: "#6d6258",
                fontSize: 15,
              }}
            >
              一緒にご注文いただけます
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
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
              bottom: 12,
              marginTop: 28,
              paddingTop: 8,
            }}
          >
            <div
              style={{
                borderRadius: 24,
                background: "rgba(255,253,249,0.94)",
                border: "1px solid rgba(189,167,142,0.4)",
                boxShadow: "0 12px 28px rgba(79,56,33,0.10)",
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#6d6258",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  現在のカート
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#2d241c",
                  }}
                >
                  {cartCount}点
                </div>
              </div>

              <Link
                href="/reserve/cart"
                className="inline-flex items-center justify-center bg-amber-900 text-white"
                style={{
                  padding: "14px 20px",
                  borderRadius: 18,
                  minWidth: 180,
                }}
              >
                カートへ進む
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
