import { NextRequest, NextResponse } from "next/server";
import { getTodayYmdJst } from "../../../../lib/bookingDates";
import {
  isStoreDisplayQueueAvailable,
  markStoreDisplayItemKitchenDone,
} from "../../../../lib/storeDisplayQueue";
import { isStoreDisplayRequestAuthorized } from "../../../../lib/storeDisplaySession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isStoreDisplayRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "認証が必要です" }, { status: 401 });
  }

  if (!isStoreDisplayQueueAvailable()) {
    return NextResponse.json(
      { ok: false, message: "注文キューが未設定です" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const reservationNo = String(body?.reservationNo || "").trim();
  const itemIndex = Number(body?.itemIndex);
  const done = body?.done !== false;
  const date = String(body?.date || "").trim() || getTodayYmdJst();

  if (!reservationNo || !Number.isInteger(itemIndex) || itemIndex < 0) {
    return NextResponse.json(
      { ok: false, message: "パラメータが不正です" },
      { status: 400 },
    );
  }

  const updated = await markStoreDisplayItemKitchenDone(
    reservationNo,
    itemIndex,
    done,
    date,
  );
  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "注文または商品が見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, reservationNo, itemIndex, done });
}
