"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const STORAGE_KEYS = [
  "kamurado-reserve-draft",
  "kamurado-reservation-draft",
  "reservationDraft",
  "webReservationDraft",
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

function getItemTypeLabel(itemType?: string) {
  if (itemType === "drink") return "ドリンク";
  if (itemType === "extra") return "追加メニュー";
  return "お弁当";
}

export default function ReserveCartPage() {
  const [draft, setDraft] = useState<ReservationDraft>({ items: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = readDraft();
    setDraft(current);
    setMounted(true);
  }, []);

  const totalQuantity = useMemo(() => {
    return draft.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [draft.items]);

  const totalAmount = useMemo(() => {
    return draft.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [draft.items]);

  function updateQuantity(itemId: string, nextQuantity: number) {
    const nextItems = draft.items
      .map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(0, Number(nextQuantity || 0)) }
          : item
      )
      .filter((item) => item.quantity > 0);

    const updated: ReservationDraft = {
      ...draft,
      items: nextItems,
    };

    setDraft(updated);
    writeDraft(updated);
  }

  function increment(itemId: string) {
    const target = draft.items.find((item) => item.id === itemId);
    if (!target) return;
    updateQuantity(itemId, Number(target.quantity || 0) + 1);
  }

  function decrement(itemId: string) {
    const target = draft.items.find((item) => item.id === itemId);
    if (!target) return;
    updateQuantity(itemId, Number(target.quantity || 0) - 1);
  }

  function removeItem(itemId: string) {
    const updated: ReservationDraft = {
      ...draft,
      items: draft.items.filter((item) => item.id !== itemId),
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

          <h1 style={{ marginBottom: 14 }}>ご注文内容の確認</h1>
          <p style={{ fontSize: 18, marginBottom: 20 }}>
            内容をご確認のうえ、受取日時の選択へ進んでください。
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
                  background: index === 1 ? "#6f4a2b" : "rgba(89,70,48,0.08)",
                  color: index === 1 ? "#fff" : "#6d6258",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {step}
              </div>
            ))}
          </div>

          {draft.items.length === 0 ? (
            <div
              className="rounded-3xl border border-stone-200 bg-white p-8"
              style={{ textAlign: "center" }}
            >
              <h2 style={{ marginBottom: 12 }}>カートは空です</h2>
              <p style={{ marginBottom: 20 }}>
                まだ商品が入っていません。メニュー画面から商品を追加してください。
              </p>

              <Link
                href="/reserve/menu"
                className="inline-flex items-center justify-center bg-amber-900 text-white"
                style={{
                  padding: "14px 22px",
                  borderRadius: 18,
                }}
              >
                メニューに戻る
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 18, marginBottom: 24 }}>
                {draft.items.map((item) => {
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);

                  return (
                    <article
                      key={item.id}
                      className="rounded-3xl border border-stone-200 bg-white p-6"
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 14,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 999,
                              padding: "6px 12px",
                              background: "rgba(89,70,48,0.08)",
                              color: "#6d6258",
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 10,
                            }}
                          >
                            {getItemTypeLabel(item.itemType)}
                          </div>

                          <h2
                            style={{
                              fontSize: 28,
                              lineHeight: 1.35,
                              marginBottom: 10,
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                            }}
                          >
                            {item.name}
                          </h2>

                          <div
                            style={{
                              color: "#6d6258",
                              fontSize: 17,
                              lineHeight: 1.8,
                            }}
                          >
                            ¥{Number(item.price || 0).toLocaleString("ja-JP")} / 1点
                          </div>
                        </div>

                        <div
                          style={{
                            flexShrink: 0,
                            color: "#8a6240",
                            fontWeight: 700,
                            fontSize: 18,
                            whiteSpace: "nowrap",
                          }}
                        >
                          小計 ¥{lineTotal.toLocaleString("ja-JP")}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          marginBottom: 12,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => decrement(item.id)}
                          className="inline-flex items-center justify-center border"
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 16,
                            fontSize: 24,
                            background: "#fffdf9",
                          }}
                          aria-label={`${item.name}を1つ減らす`}
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
                          {item.quantity}
                        </div>

                        <button
                          type="button"
                          onClick={() => increment(item.id)}
                          className="inline-flex items-center justify-center border"
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 16,
                            fontSize: 24,
                            background: "#fffdf9",
                          }}
                          aria-label={`${item.name}を1つ増やす`}
                        >
                          ＋
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="inline-flex items-center justify-center border"
                          style={{
                            marginLeft: "auto",
                            padding: "12px 18px",
                            borderRadius: 16,
                            background: "#fffdf9",
                          }}
                        >
                          この商品を削除
                        </button>
                      </div>

                      {item.description ? (
                        <p style={{ fontSize: 15 }}>{item.description}</p>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div
                className="rounded-3xl border border-stone-200 bg-white p-6"
                style={{ marginBottom: 20 }}
              >
                <h2 style={{ marginBottom: 14 }}>ご注文の合計</h2>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    color: "#4e4338",
                    fontSize: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span>商品数</span>
                    <strong>{totalQuantity}点</strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span>合計金額</span>
                    <strong style={{ fontSize: 24, color: "#2d241c" }}>
                      ¥{totalAmount.toLocaleString("ja-JP")}
                    </strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                <Link
                  href="/reserve/menu"
                  className="inline-flex items-center justify-center border"
                  style={{
                    padding: "14px 20px",
                    borderRadius: 18,
                    background: "#fffdf9",
                  }}
                >
                  メニューに戻る
                </Link>

                <Link
                  href="/reserve/schedule"
                  className="inline-flex items-center justify-center bg-amber-900 text-white"
                  style={{
                    padding: "14px 20px",
                    borderRadius: 18,
                    minWidth: 190,
                  }}
                >
                  受取日時を選ぶ
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
