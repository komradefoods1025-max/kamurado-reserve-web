import { NextRequest, NextResponse } from "next/server";
import { getTodayYmdJst } from "../../../../lib/bookingDates";
import {
  airRegiCatalogStats,
  listAirRegiCatalogSlots,
} from "../../../../lib/storeAirRegiCodes";
import {
  airRegiRegisterLineStats,
  buildAirRegiRegisterLines,
} from "../../../../lib/storeAirRegiRegister";
import { listStoreDisplayOrders } from "../../../../lib/storeDisplayQueue";
import { isStoreDisplayRequestAuthorized } from "../../../../lib/storeDisplaySession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStoreDisplayRequestAuthorized(req)) {
    return NextResponse.json(
      { ok: false, message: "認証が必要です" },
      { status: 401 },
    );
  }

  const view = req.nextUrl.searchParams.get("view")?.trim() || "order";
  const ymd = req.nextUrl.searchParams.get("date")?.trim() || getTodayYmdJst();

  if (view === "catalog") {
    const slots = listAirRegiCatalogSlots();
    const stats = airRegiCatalogStats(slots);
    return NextResponse.json({ ok: true, view: "catalog", stats, slots });
  }

  const reservationNo =
    req.nextUrl.searchParams.get("reservationNo")?.trim() || "";
  if (!reservationNo) {
    return NextResponse.json(
      { ok: false, message: "reservationNo を指定してください" },
      { status: 400 },
    );
  }

  const orders = await listStoreDisplayOrders(ymd);
  const order = orders.find((o) => o.reservationNo === reservationNo);
  if (!order) {
    return NextResponse.json(
      { ok: false, message: "注文が見つかりません" },
      { status: 404 },
    );
  }

  const lines = buildAirRegiRegisterLines(order);
  const stats = airRegiRegisterLineStats(lines);

  return NextResponse.json({
    ok: true,
    view: "order",
    date: ymd,
    order,
    lines,
    stats,
  });
}