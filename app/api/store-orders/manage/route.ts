import { NextRequest, NextResponse } from "next/server";
import {
  getReservationSaveUrlCandidates,
  missingReservationSaveUrlMessage,
} from "../../../../lib/reservationEndpoint";
import {
  gasSaveSucceeded,
  saveReservationToGas,
  sanitizeGasErrorForUser,
} from "../../../../lib/gasReservationSave";
import { postToGasWebApp } from "../../../../lib/gasHttp";
import { fetchSheetClosedDaysSet } from "../../../../lib/sheetClosedDays";
import {
  isStoreOrderReservationNo,
  validateStorePickupDateTime,
} from "../../../../lib/storeOrderManage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(value: unknown) {
  return String(value || "").replace(/[^\d]/g, "");
}

function parseItems(raw: unknown) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function gasPost(payload: Record<string, unknown>) {
  const urls = getReservationSaveUrlCandidates();
  if (!urls.length) {
    return { ok: false as const, message: missingReservationSaveUrlMessage() };
  }
  let result = await saveReservationToGas(urls[0], payload);
  for (let i = 1; i < urls.length && !gasSaveSucceeded(result); i++) {
    result = await saveReservationToGas(urls[i], payload);
  }
  if (!gasSaveSucceeded(result)) {
    const data = result.data as Record<string, unknown> | null;
    return {
      ok: false as const,
      message: sanitizeGasErrorForUser(
        (data?.error && String(data.error)) ||
          (data?.message && String(data.message)) ||
          "通信に失敗しました",
      ),
    };
  }
  return { ok: true as const, data: result.data };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || "lookup");

    if (action === "lookup") {
      const phone = normalizePhone(body?.phone);
      if (phone.length < 10) {
        return NextResponse.json(
          { ok: false, message: "電話番号を入力してください" },
          { status: 400 },
        );
      }

      const urls = getReservationSaveUrlCandidates();
      if (!urls.length) {
        return NextResponse.json(
          { ok: false, message: missingReservationSaveUrlMessage() },
          { status: 500 },
        );
      }

      const gasHttp = await postToGasWebApp(urls[0], {
        action: "getLatestReservation",
        phone,
        lookupPhone: phone,
        channel: "STORE_MOBILE",
        source: "store-mobile-check",
      });

      const data = gasHttp.data as Record<string, unknown> | null;
      const reservation =
        (data?.reservation as Record<string, unknown>) ||
        (data?.latestReservation as Record<string, unknown>) ||
        null;

      const reservationNo = String(
        reservation?.reservationNo || reservation?.reservation_no || "",
      ).trim();

      if (
        !reservation ||
        !isStoreOrderReservationNo(reservationNo) ||
        String(reservation?.status || "").includes("キャンセル")
      ) {
        return NextResponse.json({
          ok: true,
          found: false,
          message: "店内オーダーのご予約が見つかりませんでした。",
        });
      }

      return NextResponse.json({
        ok: true,
        found: true,
        reservation,
      });
    }

    if (action === "update") {
      const phone = normalizePhone(body?.phone);
      const reservationNo = String(body?.reservationNo || "").trim();
      const pickupDate = String(body?.pickupDate || body?.date || "").trim();
      const pickupTime = String(body?.pickupTime || body?.time || "").trim();
      const name = String(body?.name || "").trim();
      const items = parseItems(body?.items);

      if (!isStoreOrderReservationNo(reservationNo)) {
        return NextResponse.json(
          { ok: false, message: "受付番号が無効です" },
          { status: 400 },
        );
      }

      const closed = await fetchSheetClosedDaysSet();
      if (!validateStorePickupDateTime(pickupDate, pickupTime, closed)) {
        return NextResponse.json(
          { ok: false, message: "お受け取り日時を選び直してください" },
          { status: 400 },
        );
      }

      const totalQty = items.reduce(
        (s, i) => s + Math.max(0, Number((i as { qty?: number }).qty ?? 0)),
        0,
      );
      const total = items.reduce(
        (s, i) => s + Math.max(0, Number((i as { total?: number }).total ?? 0)),
        0,
      );

      const result = await gasPost({
        action: "updateReservation",
        channel: "STORE_MOBILE",
        source: "store-mobile-check",
        reservationNo,
        date: pickupDate,
        time: pickupTime,
        name,
        phone,
        items,
        itemCount: items.length,
        totalQty,
        total,
        status: "変更済み",
        notifyMail: true,
        updatedAt: new Date().toISOString(),
      });

      if (!result.ok) {
        return NextResponse.json(
          { ok: false, message: result.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, reservationNo });
    }

    if (action === "cancel") {
      const phone = normalizePhone(body?.phone);
      const reservationNo = String(body?.reservationNo || "").trim();

      if (!isStoreOrderReservationNo(reservationNo)) {
        return NextResponse.json(
          { ok: false, message: "受付番号が無効です" },
          { status: 400 },
        );
      }

      const result = await gasPost({
        action: "cancelReservation",
        channel: "STORE_MOBILE",
        source: "store-mobile-check",
        reservationNo,
        phone,
        status: "キャンセル",
        notifyMail: true,
        canceledAt: new Date().toISOString(),
      });

      if (!result.ok) {
        return NextResponse.json(
          { ok: false, message: result.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, reservationNo });
    }

    return NextResponse.json(
      { ok: false, message: "不正なリクエストです" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[store-orders/manage]", err);
    return NextResponse.json(
      { ok: false, message: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
