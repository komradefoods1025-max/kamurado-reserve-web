
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatCartItemLabel } from "../../../lib/reservationDraft";
import {
  playPremiumSound,
  RESERVATION_THANKS_DISPLAY_DELAY_MS,
  unlockPremiumAudio,
} from "../../../lib/premiumSounds";
import ReserveStepNav from "../../../components/ReserveStepNav";
import reserveStyles from "../../../components/reserve.module.css";
import styles from "./page.module.css";

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
  stack?: string;
  detail?: unknown;
  gasStatus?: number;
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

function formatReservationSubmitError(
  data: SubmitResponse,
  rawText: string,
  status: number,
) {
  const lines = [
    data.error,
    data.message,
    data.stack,
  ].filter((line): line is string => Boolean(line && String(line).trim()));

  if (lines.length > 0) {
    return Array.from(new Set(lines)).join("\n");
  }

  if (rawText.trim()) {
    return rawText.trim();
  }

  return `予約送信に失敗しました (HTTP ${status})`;
}

async function submitReservation(payload: Record<string, unknown>) {
  console.log("[reserve/customer] reservation payload", payload);

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
    console.error("[reserve/customer] reservation submit failed", {
      status: res.status,
      responseText: rawText,
      data,
    });

    throw new Error(formatReservationSubmitError(data, rawText, res.status));
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
      void unlockPremiumAudio();

      const result = await submitReservation(payload);

      const reservationNo =
        result.reservationNo || result.reservation_no || result.id || "";

      clearReservationStorage();
      void playPremiumSound("reservationThanks");
      window.setTimeout(() => {
        setCompleted({
          reservationNo,
        });
      }, RESERVATION_THANKS_DISPLAY_DELAY_MS);
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
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.stateCard}>
            <p className={styles.subtitle}>お客様情報を読み込み中です…</p>
          </div>
        </div>
      </main>
    );
  }

  if (completed) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={`${styles.stateCard} ${styles.stateCardSuccess}`}>
            <p className={styles.eyebrow}>COMPLETE</p>
            <h1 className={reserveStyles.reserveTitle}>ご予約を受け付けました</h1>

            <div className={styles.successBody}>
              <p>ありがとうございます。ご予約内容を送信しました。</p>
              {completed.reservationNo ? (
                <p className={styles.summaryTotal}>
                  予約番号：{completed.reservationNo}
                </p>
              ) : null}
            </div>

            <div className={styles.successActions}>
              <Link href="/" className={styles.successBtn}>
                トップへ戻る
              </Link>

              <button
                type="button"
                onClick={() => router.push("/menu")}
                className={styles.successBtnSecondary}
              >
                もう一度予約する
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!draft.items || draft.items.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.stateCard}>
            <h1 className={reserveStyles.reserveTitle}>お客様情報の入力</h1>
            <p className={styles.subtitle}>
              先にメニューと受取日時を選択してください。
            </p>

            <div className={styles.emptyAction}>
              <Link href="/menu" className={styles.emptyBtn}>
                メニュー選択へ戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>RESERVE</p>
          <h1 className={reserveStyles.reserveTitle}>お客様情報の入力</h1>
          <p className={styles.subtitle}>
            内容をご確認のうえ、ご予約を確定してください。
          </p>
        </div>

        <ReserveStepNav activeStep={4} />

        <div className={styles.layout}>
          <form onSubmit={handleSubmit} className={styles.formCard}>
            <h2 className={styles.cardTitle}>ご入力情報</h2>

            <div className={styles.formFields}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="customer-name">
                  お名前
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：山田 太郎"
                  className={styles.input}
                />
                {errors.name ? (
                  <p className={styles.fieldError}>{errors.name}</p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="customer-phone">
                  電話番号
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="例：09012345678"
                  className={styles.input}
                />
                <p className={styles.fieldHint}>
                  ハイフンなしでも入力できます。
                </p>
                {errors.phone ? (
                  <p className={styles.fieldError}>{errors.phone}</p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="customer-note">
                  備考（任意）
                </label>
                <textarea
                  id="customer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="ご要望があればご記入ください"
                  className={styles.textarea}
                />
              </div>
            </div>

            {submitError ? (
              <div className={styles.submitError}>{submitError}</div>
            ) : null}

            <div className={styles.actionRow}>
              <Link
                href="/reserve/schedule"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
              >
                受取日時を変更する
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              >
                {submitting ? "送信中…" : "この内容で予約する"}
              </button>
            </div>
          </form>

          <aside className={styles.sidebar}>
            <section className={styles.infoCard}>
              <h2 className={styles.cardTitle}>受取情報</h2>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span>受取日</span>
                  <span className={styles.infoValue}>
                    {formatDateLabel(draft.pickupDate)}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span>受取時間</span>
                  <span className={styles.infoValue}>{draft.pickupTime}</span>
                </div>
              </div>
            </section>

            <section className={styles.orderCard}>
              <h2 className={styles.cardTitle}>ご注文内容</h2>

              <div className={styles.orderList}>
                {draft.items.map((item) => (
                  <div key={item.id} className={styles.orderItem}>
                    <div className={styles.orderItemRow}>
                      <div className={styles.orderItemMain}>
                        <p className={styles.orderItemName}>
                          {formatCartItemLabel(item)}
                        </p>

                        <p className={styles.orderItemMeta}>
                          ¥{money.format(item.price)} × {item.quantity}
                        </p>
                      </div>

                      <p className={styles.orderItemPrice}>
                        ¥{money.format(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.orderSummary}>
                <div className={styles.summaryRow}>
                  <span>商品数</span>
                  <span>{totals.totalQuantity}点</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
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
