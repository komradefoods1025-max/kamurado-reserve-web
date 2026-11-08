import { NextResponse } from "next/server";
import { listStorePickupSlots } from "../../../../lib/storePickupSlots";
import { fetchSheetClosedDaysSet } from "../../../../lib/sheetClosedDays";
import { getTodayYmdJst } from "../../../../lib/bookingDates";
import { STORE_ORDER_BUSY_DISCLAIMER } from "../../../../lib/storeOrderCopy";
import { isStoreOrderTestMode } from "../../../../lib/storeOrderTestMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const today = getTodayYmdJst();
  const closed = await fetchSheetClosedDaysSet();
  if (closed.has(today) && !isStoreOrderTestMode()) {
    return NextResponse.json({
      ok: true,
      pickupDate: today,
      pickupTime: null,
      closedToday: true,
      disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
      message: "本日はお休みのため、モバイルオーダーを受け付けておりません。",
    });
  }

  const estimate = listStorePickupSlots();
  return NextResponse.json({
    ok: true,
    pickupDate: estimate.pickupDate,
    pickupTime: estimate.pickupTime,
    slots: estimate.slots,
    closedToday: estimate.closedToday,
    disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
    message: estimate.message,
  });
}
