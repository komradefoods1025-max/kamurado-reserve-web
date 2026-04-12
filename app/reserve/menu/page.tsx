"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MenuCard, { type MenuItem } from "../../../components/MenuCard";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
  itemType?: "bento" | "drink";
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

const STORAGE_KEYS = [
  "kamurado-reserve-draft",
  "kamurado-reservation-draft",
  "reservationDraft",
  "webReservationDraft",
];

const BENTO_MENUS: MenuItem[] = [
  {
    id: "karaage_bento",
    name: "唐揚げ弁当",
    price: 780,
    description: "定番人気。ジューシーな唐揚げをしっかり楽しめるお弁当です。",
    label: "人気",
    itemType: "bento",
  },
  {
    id: "shogayaki_bento",
    name: "生姜焼き弁当",
    price: 820,
    description: "ごはんが進む王道の味。やわらかいお肉と香りの良い生姜だれ。",
    itemType: "bento",
  },
  {
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 850,
    description: "甘酢とタルタルの相性が抜群。満足感のある一品です。",
    label: "おすすめ",
    itemType: "bento",
  },
  // 日替わり弁当は非表示にするため、あえて入れていません
];

const DRINK_MENUS: MenuItem[] = [
  {
    id: "drink_irohasu",
    name: "いろはす",
    price: 150,
    description: "食事に合わせやすい、すっきり飲みやすいミネラルウォーター。",
    itemType: "drink",
  },
  {
    id: "drink_yakan_mugicha",
    name: "やかんの麦茶",
    price: 200,
    description: "香ばしくやさしい味わい。食事にも合わせやすい定番ドリンク。",
    itemType: "drink",
  },
  {
    id: "drink_cocacola",
    name: "コカ・コーラ",
    price: 200,
    description: "しっかり炭酸の定番コーラ。揚げ物との相性も抜群です。",
    itemType: "drink",
  },
  {
    id: "drink_cocacola_zero",
    name: "コカ・コーラゼロ",
    price: 200,
    description: "すっきり飲みやすいゼロ系コーラ。後味も軽やかです。",
    itemType: "drink",
  },
];

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

  function handleAdd(item: MenuItem) {
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
        description: item.description,
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
            {[
              "1. メニュー",
              "2. カート",
              "3. 日時",
              "4. お客様情報",
            ].map((step, index) => (
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
              <MenuCard
                key={item.id}
                item={item}
                cartQty={itemQtyMap.get(item.id) || 0}
                onAdd={handleAdd}
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
              <MenuCard
  key={item.id}
  item={item}
  cartQty={getQuantity(item.id)}
  onAdd={handleAdd}
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
