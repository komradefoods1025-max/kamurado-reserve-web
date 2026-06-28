"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MenuCard, { type ReserveMenuItem } from "../../../components/MenuCard";
import ReserveStepNav from "../../../components/ReserveStepNav";
import { menuImageUrl } from "../../../lib/menuImage";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
  itemType?: "bento" | "drink" | "extra";
  riceSize?: string;
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

const BENTO_MENUS: ReserveMenuItem[] = [
  {
    id: "karaage_bento",
    name: "からあげ弁当",
    price: 700,
    imageUrl: menuImageUrl("5.png"),
    description:
      "定番人気。外は香ばしく、中はジューシーに仕上げた定番のお弁当です。",
    label: "人気",
    itemType: "bento",
  },
  {
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 900,
    imageUrl: menuImageUrl("3.png"),
    description:
      "甘酢とタルタルの相性が抜群。満足感のある一品です。",
    label: "おすすめ",
    itemType: "bento",
  },
  {
    id: "shogayaki_bento",
    name: "生姜焼き弁当",
    price: 700,
    imageUrl: menuImageUrl("6.png"),
    description:
      "ごはんが進む王道の味。やわらかいお肉と香りの良い生姜だれ。",
    itemType: "bento",
  },
  {
    id: "original_hamburg_bento",
    name: "オリジナルハンバーグ弁当",
    price: 800,
    imageUrl: menuImageUrl("9.png"),
    description:
      "肉感と玉ねぎの食感を楽しめる、こだわりのハンバーグ弁当です。",
    itemType: "bento",
  },
  {
    id: "cheese_hamburg_bento",
    name: "チーズハンバーグ弁当",
    price: 850,
    imageUrl: menuImageUrl("4.png"),
    description:
      "濃厚チーズを合わせた、満足感たっぷりのハンバーグ弁当です。",
    itemType: "bento",
  },
  {
    id: "oroshi_ponzu_hamburg_bento",
    name: "おろしポン酢ハンバーグ弁当",
    price: 850,
    imageUrl: menuImageUrl("おろしポン酢ハンバーグ＿バラン.png"),
    description:
      "大根おろしとポン酢でさっぱり食べられるハンバーグ弁当です。",
    itemType: "bento",
  },
  {
    id: "demiglace_hamburg_bento",
    name: "デミグラスソースハンバーグ弁当",
    price: 850,
    imageUrl: menuImageUrl("1.png"),
    description:
      "コクのあるデミグラスソースで仕上げた王道ハンバーグ弁当です。",
    itemType: "bento",
  },
  {
    id: "chicken_katsu_bento",
    name: "チキンカツ弁当",
    price: 750,
    imageUrl: menuImageUrl("チキンカツ弁当-1.png"),
    description:
      "サクッと揚げたチキンカツを楽しめる、食べ応えのあるお弁当です。",
    itemType: "bento",
  },
  {
    id: "chicken_katsu_tartar_bento",
    name: "チキンカツ弁当 タルタルソースがけ",
    price: 800,
    imageUrl: menuImageUrl("7.png"),
    description:
      "サクサクのチキンカツにタルタルソースを合わせた満足系のお弁当です。",
    itemType: "bento",
  },
  {
    id: "chicken_katsu_oroshi_ponzu_bento",
    name: "チキンカツおろしポン酢弁当",
    price: 750,
    imageUrl: menuImageUrl("チキンカツおろしポン酢＿バラン.png"),
    description:
      "サクッと揚げたチキンカツを、おろしポン酢でさっぱり楽しめるお弁当です。",
    itemType: "bento",
  },
];

const EXTRA_MENUS: ReserveMenuItem[] = [
  {
    id: "extra_karaage",
    name: "追加唐揚げ",
    price: 80,
    imageUrl: menuImageUrl("40da5886-71ac-424d-b021-d2a8cc2295c3.png"),
    description: "もう1個食べたい時に。1個から追加できます。",
    itemType: "extra",
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
        riceSize: item.itemType === "extra" ? undefined : "普通",
        selectedOptionLabel: item.itemType === "extra" ? "" : "普通",
        selectedOptions: item.itemType === "extra" ? [] : ["普通"],
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
      <div className="mx-auto w-full max-w-[920px]">
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

          <ReserveStepNav activeStep={1} />

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
              <MenuCard
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
                  {cartCount}点 ／ ¥{cartTotal.toLocaleString("ja-JP")}
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
