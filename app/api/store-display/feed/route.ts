import { NextRequest, NextResponse } from "next/server";
import { getTodayYmdJst } from "../../../../lib/bookingDates";
import {
  isStoreDisplayQueueEnabled,
  listStoreDisplayOrders,
} from "../../../../lib/storeDisplayQueue";
import { isStoreDisplayRequestAuthorized } from "../../../../lib/storeDisplaySession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStoreDisplayRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "認証が必要です" }, { status: 401 });
  }

  if (!isStoreDisplayQueueEnabled()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      orders: [],
      message:
        "注文キュー未設定（UPSTASH_REDIS_REST_URL / TOKEN）— GAS保存のみ動作中",
    });
  }

  const ymd = req.nextUrl.searchParams.get("date")?.trim() || getTodayYmdJst();
  const orders = await listStoreDisplayOrders(ymd);

  return NextResponse.json({
    ok: true,
    configured: true,
    date: ymd,
    orders,
  });
}
