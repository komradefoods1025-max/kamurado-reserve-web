import { NextRequest, NextResponse } from "next/server";
import { getTodayYmdJst } from "../../../../lib/bookingDates";
import {
  isStoreDisplayQueueAvailable,
  listStoreDisplayOrders,
  type StoreDisplayOrder,
} from "../../../../lib/storeDisplayQueue";
import {
  buildUnsettledTableOrderSummary,
  computeStoreTableRunningTotals,
  isStoreOrderInUnsettledTableTotal,
  listStoreTableSettlementState,
} from "../../../../lib/storeTableSettlement";
import {
  normalizeStoreTableId,
  resolveStoreOrderTableId,
  storeTableLabel,
} from "../../../../lib/storeOrderTables";
import { buildStoreReorderLinesFromHistory } from "../../../../lib/storeOrderReorder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatHistoryItem(item: StoreDisplayOrder["items"][number]) {
  const name = String(item.menuName || item.name || "").trim();
  const dressing = String(item.dressing || "").trim();
  const label = dressing ? `${name}（${dressing}）` : name;
  const qty = Math.max(0, Number(item.qty ?? item.quantity ?? 0));
  const lineTotal = Number(item.total);
  const price = Number(item.price);
  const subtotal =
    Number.isFinite(lineTotal) && lineTotal > 0
      ? lineTotal
      : Number.isFinite(price) && qty > 0
        ? price * qty
        : 0;
  return {
    label,
    qty,
    subtotal,
    menuKey: String(item.menuKey || "").trim(),
    dressing: dressing,
  };
}

export async function GET(req: NextRequest) {
  const tableId = normalizeStoreTableId(req.nextUrl.searchParams.get("table"));
  if (!tableId) {
    return NextResponse.json(
      { ok: false, message: "卓番が指定されていません" },
      { status: 400 },
    );
  }

  if (!isStoreDisplayQueueAvailable()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      tableId,
      seatLabel: storeTableLabel(tableId),
      history: [],
      billLines: [],
      billTotal: 0,
      reorderItems: [],
    });
  }

  const ymd = getTodayYmdJst();
  const orders = await listStoreDisplayOrders(ymd);
  const settlementState = await listStoreTableSettlementState(ymd);
  const tableTotals = computeStoreTableRunningTotals(orders, settlementState);

  const tableOrders = orders
    .filter(
      (o) =>
        o.fulfillment === "dine_in" &&
        resolveStoreOrderTableId(o) === tableId,
    )
    .sort(
      (a, b) =>
        (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0),
    );

  const unsettledTableOrders = tableOrders.filter((order) =>
    isStoreOrderInUnsettledTableTotal(order, tableId, settlementState),
  );

  const history = unsettledTableOrders.map((order) => ({
    reservationNo: order.reservationNo,
    submittedAt: order.submittedAt,
    status: order.status,
    total: Number(order.total) || 0,
    items: order.items.map(formatHistoryItem).filter((i) => i.label && i.qty > 0),
  }));

  const billLines = buildUnsettledTableOrderSummary(
    orders,
    tableId,
    settlementState,
  );
  const billTotal = tableTotals[tableId]?.total ?? 0;
  const reorderItems = buildStoreReorderLinesFromHistory(
    unsettledTableOrders.map((order) => ({
      submittedAt: order.submittedAt,
      items: order.items.map(formatHistoryItem),
    })),
  );

  return NextResponse.json({
    ok: true,
    configured: true,
    tableId,
    seatLabel: storeTableLabel(tableId),
    date: ymd,
    history,
    billLines,
    billTotal,
    reorderItems,
  });
}