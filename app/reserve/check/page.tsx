"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type MenuItemType = "bento" | "drink" | "extra";

type ReservationItem = {
  id?: string;
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
  selectedOptions?: string[];
  note?: string;
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

type MenuCatalogItem = {
  id: string;
  name: string;
  price: number;
  itemType: MenuItemType;
  label?: string;
};

type EditableOrderItem = {
  id: string;
  itemType: MenuItemType;
  menuKey: string;
  menuName: string;
  name: string;
  qty: number;
  quantity: number;
  price: number;
  total: number;
  riceSize: string;
  selectedOptionLabel: string;
  selectedOptions: string[];
  note: string;
};

const RICE_SIZE_OPTIONS = ["小盛り", "普通", "大盛り"];

const BENTO_MENUS: MenuCatalogItem[] = [
  {
    id: "karaage_bento",
    name: "からあげ弁当",
    price: 700,
    itemType: "bento",
    label: "人気",
  },
  {
    id: "shogayaki_bento",
    name: "生姜焼き弁当",
    price: 700,
    itemType: "bento",
  },
  {
    id: "nanban_bento",
    name: "チキン南蛮弁当",
    price: 900,
    itemType: "bento",
    label: "おすすめ",
  },
];

const EXTRA_MENUS: MenuCatalogItem[] = [
  {
    id: "extra_karaage",
    name: "追加からあげ",
    price: 80,
    itemType: "extra",
  },
];

const DRINK_MENUS: MenuCatalogItem[] = [
  {
    id: "drink_irohasu",
    name: "いろはす",
    price: 150,
    itemType: "drink",
  },
  {
    id: "drink_yakan_mugicha",
    name: "やかんの麦茶",
    price: 200,
    itemType: "drink",
  },
  {
    id: "drink_cocacola_zero",
    name: "コカ・コーラゼロ",
    price: 200,
    itemType: "drink",
  },
];

const MENU_CATALOG: MenuCatalogItem[] = [
  ...BENTO_MENUS,
  ...EXTRA_MENUS,
  ...DRINK_MENUS,
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateToYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function generateDates(count: number) {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < count; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(formatDateToYmd(date));
  }

  return dates;
}

function generateTimeSlots() {
  const slots: string[] = [];

  const startHour = 11;
  const startMinute = 30;
  const endHour = 14;
  const endMinute = 30;
  const intervalMinutes = 10;

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  for (
    let totalMinutes = startTotalMinutes;
    totalMinutes <= endTotalMinutes;
    totalMinutes += intervalMinutes
  ) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    slots.push(`${pad2(hour)}:${pad2(minute)}`);
  }

  return slots;
}

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

function toYmdDateValue(value: string) {
  const text = String(value || "").trim();
  if (!text) return "";

  const normalized = text.replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) return text;

  return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(
    match[3]
  ).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const text = String(value || "").trim();
  if (!text) return "";

  const ymd = toYmdDateValue(text);

  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return ymd.replaceAll("-", "/");
  }

  return text;
}

function formatDateLabel(ymd: string) {
  const text = toYmdDateValue(ymd);
  if (!text) return "";

  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return formatDate(text);

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
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
    getText(reservation.date, reservation.pickupDate, reservation.pickup_date)
  );
}

function getReservationDateYmd(reservation: ReservationData | null) {
  if (!reservation) return "";

  return toYmdDateValue(
    getText(reservation.date, reservation.pickupDate, reservation.pickup_date)
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

function normalizeMenuType(value: unknown, name: string): MenuItemType {
  if (value === "bento" || value === "drink" || value === "extra") {
    return value;
  }

  if (name.includes("弁当")) return "bento";
  if (name.includes("からあげ") || name.includes("唐揚げ")) return "extra";
  if (
    name.includes("いろはす") ||
    name.includes("麦茶") ||
    name.includes("コーラ") ||
    name.includes("ドリンク")
  ) {
    return "drink";
  }

  return "bento";
}

function findCatalogItem(menuKey: string, menuName: string) {
  const key = String(menuKey || "").trim();
  const name = String(menuName || "").trim();

  return MENU_CATALOG.find((item) => {
    return item.id === key || item.name === name || item.name === key;
  });
}

function isBentoItem(item: { itemType?: string; menuName?: string; name?: string }) {
  const name = getText(item.menuName, item.name);
  return item.itemType === "bento" || name.includes("弁当");
}

function normalizeEditableItems(items: ReservationItem[]): EditableOrderItem[] {
  return items.map((item, index) => {
    const itemName = getText(item.menuName, item.name, item.id, `商品${index + 1}`);
    const itemKey = getText(item.menuKey, item.id, itemName);
    const catalog = findCatalogItem(itemKey, itemName);

    const qty = Math.max(1, getNumber(item.qty, item.quantity) || 1);
    const rawTotal = getNumber(item.total);
    const rawPrice = getNumber(item.price);
    const price =
      rawPrice ||
      catalog?.price ||
      (rawTotal > 0 && qty > 0 ? Math.round(rawTotal / qty) : 0);

    const itemType = normalizeMenuType(item.itemType || catalog?.itemType, itemName);
    const riceSize = getText(item.riceSize, item.selectedOptionLabel);
    const normalizedRiceSize = itemType === "bento" ? riceSize || "普通" : "";

    return {
      id: catalog?.id || itemKey || `custom_${index + 1}`,
      itemType,
      menuKey: catalog?.id || itemKey || `custom_${index + 1}`,
      menuName: catalog?.name || itemName,
      name: catalog?.name || itemName,
      qty,
      quantity: qty,
      price,
      total: qty * price,
      riceSize: normalizedRiceSize,
      selectedOptionLabel: normalizedRiceSize,
      selectedOptions: normalizedRiceSize ? [normalizedRiceSize] : [],
      note: getText(item.note),
    };
  });
}

function buildSubmitItems(items: EditableOrderItem[]): ReservationItem[] {
  return items
    .filter((item) => Number(item.qty || 0) > 0)
    .map((item) => {
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const total = qty * price;
      const riceSize = isBentoItem(item) ? item.riceSize || "普通" : "";

      return {
        id: item.menuKey,
        itemType: item.itemType,
        menuKey: item.menuKey,
        menuName: item.menuName,
        name: item.menuName,
        qty,
        quantity: qty,
        price,
        total,
        riceSize,
        selectedOptionLabel: riceSize,
        selectedOptions: riceSize ? [riceSize] : [],
        note: item.note || "",
      };
    });
}

export default function ReserveCheckPage() {
  const [phone, setPhone] = useState("");
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editItems, setEditItems] = useState<EditableOrderItem[]>([]);

  const availableDates = useMemo(() => generateDates(31), []);
  const availableTimes = useMemo(() => generateTimeSlots(), []);

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
  const pickupDateYmd = useMemo(
    () => getReservationDateYmd(reservation),
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

  const totalQty = useMemo(() => {
    if (!reservation) return 0;

    const directQty = getNumber(
      reservation.totalQty,
      reservation.totalQuantity,
      reservation.total_quantity
    );

    if (directQty > 0) return directQty;

    return items.reduce((sum, item) => {
      return sum + getNumber(item.qty, item.quantity);
    }, 0);
  }, [reservation, items]);

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

  const editTotalQty = useMemo(() => {
    return editItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [editItems]);

  const editTotalAmount = useMemo(() => {
    return editItems.reduce((sum, item) => {
      return sum + Number(item.qty || 0) * Number(item.price || 0);
    }, 0);
  }, [editItems]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPhone = normalizePhone(phone);

    setMessage("");
    setReservation(null);
    setSearched(false);
    setEditMode(false);
    setEditDate("");
    setEditTime("");
    setEditItems([]);

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

  function handleStartEdit() {
    if (!reservation) return;

    setEditDate(pickupDateYmd || availableDates[0] || "");
    setEditTime(pickupTime || "");
    setEditItems(normalizeEditableItems(items));
    setEditMode(true);
    setMessage("");
  }

  function handleCancelEdit() {
    setEditMode(false);
    setEditDate("");
    setEditTime("");
    setEditItems([]);
    setMessage("");
  }

  function handleAddMenuItem(menu: MenuCatalogItem) {
    setEditItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.menuKey === menu.id);

      if (existingIndex >= 0) {
        return prev.map((item, index) => {
          if (index !== existingIndex) return item;

          const nextQty = Number(item.qty || 0) + 1;

          return {
            ...item,
            qty: nextQty,
            quantity: nextQty,
            total: nextQty * Number(item.price || 0),
          };
        });
      }

      const riceSize = menu.itemType === "bento" ? "普通" : "";

      return [
        ...prev,
        {
          id: menu.id,
          itemType: menu.itemType,
          menuKey: menu.id,
          menuName: menu.name,
          name: menu.name,
          qty: 1,
          quantity: 1,
          price: menu.price,
          total: menu.price,
          riceSize,
          selectedOptionLabel: riceSize,
          selectedOptions: riceSize ? [riceSize] : [],
          note: "",
        },
      ];
    });
  }

  function handleChangeEditQty(index: number, nextQty: number) {
    setEditItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const qty = Math.max(1, Number(nextQty || 1));

        return {
          ...item,
          qty,
          quantity: qty,
          total: qty * Number(item.price || 0),
        };
      })
    );
  }

  function handleRemoveEditItem(index: number) {
    setEditItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleChangeRiceSize(index: number, riceSize: string) {
    setEditItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,
          riceSize,
          selectedOptionLabel: riceSize,
          selectedOptions: riceSize ? [riceSize] : [],
        };
      })
    );
  }

  async function handleUpdateReservation() {
    if (!reservation) return;

    if (!reservationNo) {
      setMessage("受付番号が見つからないため変更できません。");
      return;
    }

    if (!editDate || !editTime) {
      setMessage("変更後の受取日と受取時間を選択してください。");
      return;
    }

    const submitItems = buildSubmitItems(editItems);
    const updateTotalQty = submitItems.reduce((sum, item) => {
      return sum + getNumber(item.qty, item.quantity);
    }, 0);
    const updateTotalAmount = submitItems.reduce((sum, item) => {
      const qty = getNumber(item.qty, item.quantity);
      const price = getNumber(item.price);
      const itemTotal = getNumber(item.total);

      return sum + (itemTotal > 0 ? itemTotal : qty * price);
    }, 0);

    if (!submitItems.length || updateTotalQty <= 0) {
      setMessage("変更後の商品を1つ以上選択してください。");
      return;
    }

    const ok = window.confirm(
      "この内容で予約を変更しますか？\n変更後はお店に通知されます。"
    );

    if (!ok) return;

    setUpdating(true);
    setMessage("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateReservation",
          reservationNo,
          date: editDate,
          time: editTime,
          name,
          phone: normalizePhone(phone || reservation.phone || ""),
          note: reservation.note || "",
          items: submitItems,
          totalQty: updateTotalQty,
          total: updateTotalAmount,
          status: "変更済み",
          notifyMail: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "予約変更に失敗しました。");
      }

      setReservation((prev) =>
        prev
          ? {
              ...prev,
              date: editDate,
              pickupDate: editDate,
              time: editTime,
              pickupTime: editTime,
              items: submitItems,
              totalQty: updateTotalQty,
              totalQuantity: updateTotalQty,
              total: updateTotalAmount,
              totalAmount: updateTotalAmount,
              status: "変更済み",
            }
          : prev
      );

      setEditMode(false);
      setEditDate("");
      setEditTime("");
      setEditItems([]);
      setMessage("ご予約内容を変更しました。");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "予約変更中にエラーが発生しました。"
      );
    } finally {
      setUpdating(false);
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

      setEditMode(false);
      setEditDate("");
      setEditTime("");
      setEditItems([]);
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
              予約確認・変更・キャンセル
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
                borderColor:
                  message.includes("キャンセルしました") ||
                  message.includes("変更しました")
                    ? "#b7d7b0"
                    : "#ead7b7",
                background:
                  message.includes("キャンセルしました") ||
                  message.includes("変更しました")
                    ? "#eff9ed"
                    : "#fffaf2",
                color:
                  message.includes("キャンセルしました") ||
                  message.includes("変更しました")
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

              {!isCanceledStatus(status) && editMode ? (
                <section
                  className="mt-5 rounded-[26px] border bg-white p-5"
                  style={{
                    borderColor: "#dfc5a0",
                    boxShadow: "0 8px 22px rgba(88, 63, 39, 0.05)",
                  }}
                >
                  <h3 className="text-xl font-bold text-stone-800">
                    予約内容を変更
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    受取日時・商品・数量を変更できます。
                    変更後の内容でお店に通知されます。
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 text-sm font-bold text-stone-700">
                      受取日
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {availableDates.map((date) => {
                        const active = editDate === date;

                        return (
                          <button
                            key={date}
                            type="button"
                            onClick={() => setEditDate(date)}
                            disabled={updating}
                            className={[
                              "rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                              active
                                ? "border-amber-800 bg-amber-900 text-white"
                                : "border-stone-200 bg-stone-50 hover:bg-stone-100",
                            ].join(" ")}
                          >
                            <div className="text-sm font-medium">
                              {formatDateLabel(date)}
                            </div>
                            <div
                              className={[
                                "mt-1 text-xs",
                                active ? "text-amber-100" : "text-stone-500",
                              ].join(" ")}
                            >
                              {date}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 text-sm font-bold text-stone-700">
                      受取時間
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {availableTimes.map((time) => {
                        const active = editTime === time;

                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setEditTime(time)}
                            disabled={updating}
                            className={[
                              "rounded-2xl border px-4 py-3 text-center text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                              active
                                ? "border-amber-800 bg-amber-900 text-white"
                                : "border-stone-200 bg-stone-50 hover:bg-stone-100",
                            ].join(" ")}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 rounded-[24px] bg-amber-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-base font-bold text-stone-800">
                        変更後の商品
                      </h4>

                      <div className="text-sm font-bold text-stone-700">
                        合計 {formatPrice(editTotalAmount)}
                      </div>
                    </div>

                    {editItems.length > 0 ? (
                      <div className="space-y-3">
                        {editItems.map((item, index) => {
                          const subtotal =
                            Number(item.qty || 0) * Number(item.price || 0);

                          return (
                            <div
                              key={`${item.menuKey}-${index}`}
                              className="rounded-2xl border border-amber-100 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="font-bold text-stone-800">
                                    {item.menuName}
                                  </div>
                                  <div className="mt-1 text-sm text-stone-600">
                                    {formatPrice(item.price)} × {item.qty}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="font-bold text-stone-900">
                                    {formatPrice(subtotal)}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditItem(index)}
                                    disabled={updating}
                                    className="mt-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="inline-flex items-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleChangeEditQty(index, item.qty - 1)
                                    }
                                    disabled={updating || item.qty <= 1}
                                    className="h-11 w-12 text-lg font-bold disabled:opacity-40"
                                  >
                                    −
                                  </button>

                                  <div className="w-12 text-center text-base font-bold">
                                    {item.qty}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleChangeEditQty(index, item.qty + 1)
                                    }
                                    disabled={updating}
                                    className="h-11 w-12 text-lg font-bold disabled:opacity-40"
                                  >
                                    ＋
                                  </button>
                                </div>

                                {isBentoItem(item) ? (
                                  <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                                    ご飯
                                    <select
                                      value={item.riceSize || "普通"}
                                      onChange={(event) =>
                                        handleChangeRiceSize(
                                          index,
                                          event.target.value
                                        )
                                      }
                                      disabled={updating}
                                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none"
                                    >
                                      {RICE_SIZE_OPTIONS.map((size) => (
                                        <option key={size} value={size}>
                                          {size}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-stone-600">
                        商品が選択されていません。下のメニューから追加してください。
                      </p>
                    )}

                    <div className="mt-5 border-t border-amber-200 pt-4">
                      <h4 className="mb-3 text-sm font-bold text-stone-700">
                        商品を追加
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {MENU_CATALOG.map((menu) => (
                          <button
                            key={menu.id}
                            type="button"
                            onClick={() => handleAddMenuItem(menu)}
                            disabled={updating}
                            className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-stone-800">
                                  {menu.name}
                                </div>
                                <div className="mt-1 text-xs text-stone-500">
                                  {menu.itemType === "bento"
                                    ? "お弁当"
                                    : menu.itemType === "drink"
                                    ? "ドリンク"
                                    : "追加商品"}
                                  {menu.label ? ` ／ ${menu.label}` : ""}
                                </div>
                              </div>

                              <div className="whitespace-nowrap font-bold text-stone-900">
                                {formatPrice(menu.price)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-amber-200 pt-4">
                      <span className="font-bold text-stone-700">
                        変更後の合計
                      </span>
                      <span className="text-[22px] font-bold text-stone-900">
                        {formatPrice(editTotalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={updating}
                      className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-700 disabled:opacity-50"
                    >
                      変更をやめる
                    </button>

                    <button
                      type="button"
                      onClick={handleUpdateReservation}
                      disabled={
                        updating ||
                        !editDate ||
                        !editTime ||
                        editTotalQty <= 0
                      }
                      className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "#8b5d34",
                      }}
                    >
                      {updating ? "変更中…" : "この内容で変更する"}
                    </button>
                  </div>
                </section>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Link
                  href="/"
                  className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-700"
                >
                  TOPへ戻る
                </Link>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    disabled={
                      updating ||
                      canceling ||
                      isCanceledStatus(status) ||
                      editMode ||
                      !reservationNo
                    }
                    className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background: "#8b5d34",
                    }}
                  >
                    予約を変更する
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={
                      canceling ||
                      updating ||
                      isCanceledStatus(status) ||
                      !reservationNo
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
