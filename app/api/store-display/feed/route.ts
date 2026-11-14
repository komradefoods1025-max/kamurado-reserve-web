import { NextRequest, NextResponse } from "next/server";
import { getTodayYmdJst } from "../../../../lib/bookingDates";
import {
  isStoreDisplayQueueAvailable,
  listStoreDisplayOrders,
  storeDisplayQueueHintMessage,
} from "../../../../lib/storeDisplayQueue";
import { isStoreDisplayRequestAuthorized } from "../../../../lib/storeDisplaySession";
import {
  computeStoreTableRunningTotals,
  listStoreTableSettlementState,
} from "../../../../lib/storeTableSettlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStoreDisplayRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "認証が必要です" }, { status: 401 });
  }

  const ymd = req.nextUrl.searchParams.get("date")?.trim() || getTodayYmdJst();
  const orders = await listStoreDisplayOrders(ymd);
  const settlementState = await listStoreTableSettlementState(ymd);
  const tableTotals = computeStoreTableRunningTotals(orders, settlementState);
  const available = isStoreDisplayQueueAvailable();
  const hint = storeDisplayQueueHintMessage();

  return NextResponse.json({
    ok: true,
    configured: available,
    date: ymd,
    orders,
    settlements: settlementState.settledAt,
    settlementCleared: settlementState.clearedReservationNos,
    tableTotals,
    message: available ? hint || null : hint,
  });
}
