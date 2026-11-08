import { NextRequest, NextResponse } from "next/server";
import {
  getReservationSaveUrlCandidates,
  missingReservationSaveUrlMessage,
} from "../../../lib/reservationEndpoint";
import {
  gasSaveSucceeded,
  saveReservationToGas,
  sanitizeGasErrorForUser,
} from "../../../lib/gasReservationSave";
import { createStoreOrderReservationNo } from "../../../lib/storeReservationNo";
import { computeStoreReadyEstimate } from "../../../lib/storePickupSlots";
import { getTodayYmdJst } from "../../../lib/bookingDates";
import { fetchSheetClosedDaysSet } from "../../../lib/sheetClosedDays";
import {
  isStoreOrderDisabled,
  isStoreOrderMaintenance,
  STORE_ORDER_MAINTENANCE_LINES,
} from "../../../lib/storeOrderMaintenance";
import { isStoreOrderTestMode } from "../../../lib/storeOrderTestMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawItem = {
  id?: string;
  menuKey?: string;
  name?: string;
  menuName?: string;
  price?: number | string | null;
  quantity?: number | string;
  qty?: number | string;
};

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/[^\d]/g, "");
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) return [];

  return (items as RawItem[]).map((item) => {
    const qty = Math.max(1, toNumber(item.qty ?? item.quantity, 1));
    const rawPrice = item.price;
    const price =
      rawPrice === null || rawPrice === undefined || rawPrice === ""
        ? 0
        : toNumber(rawPrice, 0);

    return {
      itemType: "store",
      menuKey: item.menuKey || item.id || "",
      menuName: item.menuName || item.name || "",
      riceSize: "",
      qty,
      price,
      total: price * qty,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    if (isStoreOrderDisabled() || isStoreOrderMaintenance()) {
      return NextResponse.json(
        {
          ok: false,
          message: STORE_ORDER_MAINTENANCE_LINES.join("\n"),
        },
        { status: 503 },
      );
    }

    const body = await req.json();

    const name = String(body?.name || body?.customerName || "").trim();
    const phone = normalizePhone(body?.phone);
    const items = normalizeItems(body?.items);

    if (!items.length) {
      return NextResponse.json(
        { ok: false, message: "商品を1つ以上選んでください" },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "お名前を入力してください" },
        { status: 400 },
      );
    }

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { ok: false, message: "電話番号を正しく入力してください" },
        { status: 400 },
      );
    }

    const today = getTodayYmdJst();
    const closed = await fetchSheetClosedDaysSet();
    if (closed.has(today) && !isStoreOrderTestMode()) {
      return NextResponse.json(
        { ok: false, message: "本日はお休みのためご注文いただけません" },
        { status: 400 },
      );
    }

    const ready = computeStoreReadyEstimate();
    if (ready.closedToday || !ready.pickupTime) {
      return NextResponse.json(
        {
          ok: false,
          message:
            ready.message ||
            "現在、ご注文をお受けできる時間帯がありません。",
        },
        { status: 400 },
      );
    }

    const pickupDate = ready.pickupDate;
    const pickupTime = ready.pickupTime;

    const reservationNo =
      String(body?.reservationNo || "").trim() ||
      createStoreOrderReservationNo();

    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.total, 0);

    const noteParts = [
      "店内モバイルオーダー",
      "店頭支払い",
      body?.note ? String(body.note).trim() : "",
    ].filter(Boolean);

    const payload: Record<string, unknown> = {
      action: "saveReservation",
      channel: "STORE_MOBILE",
      source: "store-mobile-order",
      storeName: "かむらど",
      reservationNo,
      date: pickupDate,
      time: pickupTime,
      name,
      phone,
      note: noteParts.join(" / "),
      items,
      itemCount: items.length,
      totalQty,
      total,
      submittedAt: new Date().toISOString(),
      notifyMail: true,
      status: "受付済み",
    };

    const saveUrlCandidates = getReservationSaveUrlCandidates();
    if (!saveUrlCandidates.length) {
      return NextResponse.json(
        { ok: false, message: missingReservationSaveUrlMessage() },
        { status: 500 },
      );
    }

    let gasResult = await saveReservationToGas(saveUrlCandidates[0], payload);
    for (let i = 1; i < saveUrlCandidates.length && !gasSaveSucceeded(gasResult); i++) {
      gasResult = await saveReservationToGas(saveUrlCandidates[i], payload);
    }

    if (!gasSaveSucceeded(gasResult)) {
      const data = gasResult.data as Record<string, unknown> | null;
      const gasError = sanitizeGasErrorForUser(
        (data?.error && String(data.error)) ||
          (data?.message && String(data.message)) ||
          gasResult.rawText ||
          "注文の送信に失敗しました",
      );
      return NextResponse.json(
        { ok: false, message: gasError, detail: data ?? null },
        { status: 500 },
      );
    }

    const data = gasResult.data as Record<string, unknown> | null;

    return NextResponse.json({
      ok: true,
      reservationNo:
        (data?.reservationNo && String(data.reservationNo)) ||
        (data?.reservation_no && String(data.reservation_no)) ||
        reservationNo,
      data,
    });
  } catch (err) {
    console.error("[store-orders/create]", err);
    return NextResponse.json(
      { ok: false, message: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
