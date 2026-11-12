import { NextRequest, NextResponse } from "next/server";
import { getTodayYmdJst } from "../../../../lib/bookingDates";
import {
  computeStoreTableRunningTotals,
  isStoreTableSettlementStorageAvailable,
  listStoreTableSettlements,
  recordStoreTableSettlement,
} from "../../../../lib/storeTableSettlement";
import {
  isStoreDisplayQueueAvailable,
  listStoreDisplayOrders,
} from "../../../../lib/storeDisplayQueue";
import { isStoreDisplayRequestAuthorized } from "../../../../lib/storeDisplaySession";
import { normalizeStoreTableId } from "../../../../lib/storeOrderTables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isStoreDisplayRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "認証が必要です" }, { status: 401 });
  }

  if (
    !isStoreDisplayQueueAvailable() ||
    !isStoreTableSettlementStorageAvailable()
  ) {
    return NextResponse.json(
      { ok: false, message: "注文キューが未設定です" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const tableId = normalizeStoreTableId(body?.tableId);
  const date = String(body?.date || "").trim() || getTodayYmdJst();

  if (!tableId) {
    return NextResponse.json(
      { ok: false, message: "卓番が不正です" },
      { status: 400 },
    );
  }

  const result = await recordStoreTableSettlement(tableId, date);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: "清算の記録に失敗しました" },
      { status: 500 },
    );
  }

  const settlements = await listStoreTableSettlements(date);
  const orders = await listStoreDisplayOrders(date);
  const tableTotals = computeStoreTableRunningTotals(orders, settlements);

  return NextResponse.json({
    ok: true,
    tableId,
    settledAt: result.settledAt,
    tableTotals,
    settlements,
  });
}
