import { NextRequest, NextResponse } from "next/server";
import {
  isStoreDisplayQueueEnabled,
  updateStoreDisplayOrderStatus,
  type StoreDisplayOrder,
} from "../../../../lib/storeDisplayQueue";
import { isStoreDisplayRequestAuthorized } from "../../../../lib/storeDisplaySession";
import { getTodayYmdJst } from "../../../../lib/bookingDates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: StoreDisplayOrder["status"][] = [
  "受付済み",
  "調理中",
  "完成",
  "提供済み",
];

export async function POST(req: NextRequest) {
  if (!isStoreDisplayRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "認証が必要です" }, { status: 401 });
  }

  if (!isStoreDisplayQueueEnabled()) {
    return NextResponse.json(
      { ok: false, message: "注文キューが未設定です" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const reservationNo = String(body?.reservationNo || "").trim();
  const status = String(body?.status || "").trim() as StoreDisplayOrder["status"];
  const date = String(body?.date || "").trim() || getTodayYmdJst();

  if (!reservationNo || !ALLOWED.includes(status)) {
    return NextResponse.json(
      { ok: false, message: "パラメータが不正です" },
      { status: 400 },
    );
  }

  const updated = await updateStoreDisplayOrderStatus(reservationNo, status, date);
  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "注文が見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, reservationNo, status });
}
