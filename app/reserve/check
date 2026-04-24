"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type ReservationItem = {
  itemType?: string;
  menuKey?: string;
  menuName?: string;
  name?: string;
  qty?: number | string;
  quantity?: number | string;
  price?: number | string;
  total?: number | string;
  riceSize?: string;
  selectedOptionLabel?: string;
};

type ReservationData = {
  reservationNo?: string;
  reservation_no?: string;
  receptionNo?: string;
  受付番号?: string;

  name?: string;
  customerName?: string;
  customer_name?: string;

  phone?: string;

  date?: string;
  pickupDate?: string;
  pickup_date?: string;

  time?: string;
  pickupTime?: string;
  pickup_time?: string;

  status?: string;

  total?: number | string;
  totalAmount?: number | string;
  total_amount?: number | string;

  totalQty?: number | string;
  totalQuantity?: number | string;
  total_quantity?: number | string;

  items?: ReservationItem[] | string;
  itemsJson?: string;
  items_json?: string;

  note?: string;
};

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatPrice(value: unknown) {
  const n = Number(value || 0);
  return `¥${n.toLocaleString("ja-JP")}`;
}

function getText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function getNumber(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function formatDate(value: string) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text.replaceAll("-", "/");
  }

  return text;
}

function parseItems(value: ReservationData | null): ReservationItem[] {
  if (!value) return [];

  const rawItems = value.items;

  if (Array.isArray(rawItems)) {
    return rawItems;
  }

  if (typeof rawItems === "string" && rawItems.trim()) {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const itemsJson = value.itemsJson || value.items_json;
  if (typeof itemsJson === "string" && itemsJson.trim()) {
    try {
      const parsed = JSON.parse(itemsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getReservationNo(reservation: ReservationData | null) {
  if (!reservation) return "";

  return getText(
    reservation.reservationNo,
    reservation.reservation_no,
    reservation.receptionNo,
    reservation.受付番号
  );
}

function getReservationName(reservation: ReservationData | null) {
  if (!reservation) return "";

  return getText(
    reservation.name,
    reservation.customerName,
    reservation.customer_name
  );
}

function getReservationDate(reservation: ReservationData | null) {
  if (!reservation) return "";

  return formatDate(
    getText(
      reservation.date,
      reservation.pickupDate,
      reservation.pickup_date
    )
  );
}

function getReservationTime(reservation: ReservationData | null) {
  if (!reservation) return "";

  return getText(
    reservation.time,
    reservation.pickupTime,
    reservation.pickup_time
  );
}

function getReservationStatus(reservation: ReservationData | null) {
  if (!reservation) return "";

  return getText(reservation.status) || "受付済み";
}

function isCanceledStatus(status: string) {
  return status.includes("キャンセル") || status.toLowerCase() === "cancelled";
}

export default function ReserveCheckPage() {
  const [phone, setPhone] = useState("");
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState("");

  const items = useMemo(() => parseItems(reservation), [reservation]);

  const reservationNo = useMemo(
    () => getReservationNo(reservation),
    [reservation]
  );

  const name = useMemo(() => getReservationName(reservation), [reservation]);
  const pickupDate = useMemo(
    () => getReservationDate(reservation),
    [reservation]
  );
  const pickupTime = useMemo(
    () => getReservationTime(reservation),
    [reservation]
  );
  const status = useMemo(
    () => getReservationStatus(reservation),
    [reservation]
  );

  const totalAmount = useMemo(() => {
    if (!reservation) return 0;

    const directTotal = getNumber(
      reservation.total,
      reservation.totalAmount,
      reservation.total_amount
    );

    if (directTotal > 0) return directTotal;

    return items.reduce((sum, item) => {
      const qty = getNumber(item.qty, item.quantity);
      const price = getNumber(item.price);
      const total = getNumber(item.total);

      return sum + (total > 0 ? total : qty * price);
    }, 0);
  }, [reservation, items]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPhone = normalizePhone(phone);

    setMessage("");
    setReservation(null);
    setSearched(false);

    if (!normalizedPhone) {
      setMessage("電話番号を入力してください。");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getLatestReservation",
          phone: normalizedPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "予約確認に失敗しました。");
      }

      if (!data?.found || !data?.reservation) {
        setSearched(true);
        setMessage("該当する予約が見つかりませんでした。");
        return;
      }

      setReservation(data.reservation);
      setSearched(true);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "予約確認中にエラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!reservationNo) {
      setMessage("受付番号が見つからないためキャンセルできません。");
      return;
    }

    const ok = window.confirm(
      "この予約をキャンセルしますか？\nキャンセル後は元に戻せません。"
    );

    if (!ok) return;

    setCanceling(true);
    setMessage("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancelReservation",
          reservationNo,
          phone: normalizePhone(phone),
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "キャンセルに失敗しました。");
      }

      setReservation((prev) =>
        prev
          ? {
              ...prev,
              status: "キャンセル",
            }
          : prev
      );

      setMessage("ご予約をキャンセルしました。");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "キャンセル処理中にエラーが発生しました。"
      );
    } finally {
      setCanceling(false);
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-6 text-stone-800"
      style={{
        background: "linear-gradient(180deg, #f5ede2 0%, #efe3d1 100%)",
      }}
    >
      <div className="mx-auto max-w-4xl">
        <section
          className="rounded-[32px] border p-6 sm:p-8"
          style={{
            borderColor: "#e2cfaf",
            background:
              "linear-gradient(135deg, rgba(252,247,238,0.98), rgba(244,235,221,0.96))",
            boxShadow: "0 20px 60px rgba(90, 63, 34, 0.10)",
          }}
        >
          <div className="mb-6">
            <p
              style={{
                color: "#8a6240",
                letterSpacing: "0.18em",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              RESERVATION CHECK
            </p>

            <h1
              className="text-[34px] font-bold leading-tight sm:text-[46px]"
              style={{ color: "#221a14" }}
            >
              予約確認・キャンセル
            </h1>

            <p
              className="mt-4 text-[16px] leading-[1.9] sm:text-[17px]"
              style={{ color: "#6d6258" }}
            >
              ご予約時に入力した電話番号を入力してください。
              最新の未キャンセル予約を確認できます。
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="rounded-[26px] border bg-white p-5 sm:p-6"
            style={{
              borderColor: "#ead7b7",
              boxShadow: "0 8px 24px rgba(88, 63, 39, 0.05)",
            }}
          >
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-bold text-stone-700"
            >
              電話番号
            </label>

            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="例）09012345678"
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-[18px] outline-none focus:border-amber-800"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-4 inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] px-6 py-4 text-center text-[18px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #8b5d34, #a06d3f)",
                boxShadow: "0 12px 24px rgba(139, 93, 52, 0.20)",
              }}
            >
              {loading ? "確認しています…" : "予約を確認する"}
            </button>
          </form>

          {message ? (
            <div
              className="mt-5 rounded-[24px] border p-4 text-[15px] font-bold"
              style={{
                borderColor: message.includes("キャンセルしました")
                  ? "#b7d7b0"
                  : "#ead7b7",
                background: message.includes("キャンセルしました")
                  ? "#eff9ed"
                  : "#fffaf2",
                color: message.includes("キャンセルしました")
                  ? "#356b32"
                  : "#7a5637",
              }}
            >
              {message}
            </div>
          ) : null}

          {searched && reservation ? (
            <section
              className="mt-6 rounded-[28px] border bg-white p-5 sm:p-6"
              style={{
                borderColor: "#dfc5a0",
                boxShadow: "0 10px 28px rgba(88, 63, 39, 0.07)",
              }}
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    style={{
                      color: "#8a6240",
                      letterSpacing: "0.14em",
                      fontSize: 13,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    YOUR RESERVATION
                  </p>
                  <h2
                    className="text-[28px] font-bold"
                    style={{ color: "#2a211b" }}
                  >
                    ご予約内容
                  </h2>
                </div>

                <div
                  className="inline-flex rounded-full px-4 py-2 text-sm font-bold"
                  style={{
                    background: isCanceledStatus(status) ? "#f5dddd" : "#f1dfc5",
                    color: isCanceledStatus(status) ? "#9a2f2f" : "#7d5938",
                  }}
                >
                  {status}
                </div>
              </div>

              <div className="grid gap-3 text-[16px] sm:grid-cols-2">
                <div className="rounded-2xl bg-stone-50 p-4">
                  <div className="text-sm text-stone-500">受付番号</div>
                  <div className="mt-1 font-bold text-stone-800">
                    {reservationNo || "未設定"}
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50 p-4">
                  <div className="text-sm text-stone-500">お名前</div>
                  <div className="mt-1 font-bold text-stone-800">
                    {name || "未設定"}
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50 p-4">
                  <div className="text-sm text-stone-500">受取日</div>
                  <div className="mt-1 font-bold text-stone-800">
                    {pickupDate || "未設定"}
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50 p-4">
                  <div className="text-sm text-stone-500">受取時間</div>
                  <div className="mt-1 font-bold text-stone-800">
                    {pickupTime || "未設定"}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                <h3 className="mb-3 text-base font-bold text-stone-800">
                  ご注文内容
                </h3>

                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((item, index) => {
                      const itemName = getText(item.menuName, item.name);
                      const qty = getNumber(item.qty, item.quantity);
                      const riceSize = getText(
                        item.riceSize,
                        item.selectedOptionLabel
                      );
                      const price = getNumber(item.price);
                      const total = getNumber(item.total, qty * price);

                      return (
                        <div
                          key={`${itemName}-${index}`}
                          className="flex items-start justify-between gap-4 border-b border-amber-100 pb-3 last:border-b-0 last:pb-0"
                        >
                          <div>
                            <div className="font-bold text-stone-800">
                              {itemName || "商品名未設定"}
                            </div>
                            <div className="mt-1 text-sm text-stone-600">
                              数量：{qty || 0}
                              {riceSize ? ` ／ ${riceSize}` : ""}
                            </div>
                          </div>

                          <div className="whitespace-nowrap font-bold text-stone-800">
                            {formatPrice(total)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-stone-600">
                    注文内容を取得できませんでした。
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-amber-200 pt-4">
                  <span className="font-bold text-stone-700">合計</span>
                  <span className="text-[22px] font-bold text-stone-900">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Link
                  href="/"
                  className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-700"
                >
                  TOPへ戻る
                </Link>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={
                    canceling || isCanceledStatus(status) || !reservationNo
                  }
                  className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "#9a2f2f",
                  }}
                >
                  {canceling
                    ? "キャンセル中…"
                    : isCanceledStatus(status)
                    ? "キャンセル済み"
                    : "この予約をキャンセルする"}
                </button>
              </div>
            </section>
          ) : null}

          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-700"
            >
              TOPへ戻る
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
