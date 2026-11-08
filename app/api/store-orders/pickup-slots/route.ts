import { NextResponse } from "next/server";
import {
  isAfterStoreOrderNextDayCutoff,
  listStorePickupSlots,
} from "../../../../lib/storePickupSlots";
import { fetchSheetClosedDaysSet } from "../../../../lib/sheetClosedDays";
import { formatDateLabel, getTodayYmdJst } from "../../../../lib/bookingDates";
import { STORE_ORDER_BUSY_DISCLAIMER } from "../../../../lib/storeOrderCopy";
import { isStoreOrderTestMode } from "../../../../lib/storeOrderTestMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const today = getTodayYmdJst();
  const closed = await fetchSheetClosedDaysSet();
  const afterCutoff = isAfterStoreOrderNextDayCutoff();

  if (closed.has(today) && !isStoreOrderTestMode() && !afterCutoff) {
    return NextResponse.json({
      ok: true,
      pickupDate: today,
      bookingMode: "today",
      earliestReadyTime: null,
      pickupTime: null,
      slots: [],
      closedToday: true,
      disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
      message: "本日はお休みのため、モバイルオーダーを受け付けておりません。",
    });
  }

  const estimate = listStorePickupSlots(new Date(), today, closed);
  return NextResponse.json({
    ok: true,
    pickupDate: estimate.pickupDate,
    pickupDateLabel:
      estimate.pickupDate !== today
        ? formatDateLabel(estimate.pickupDate)
        : null,
    bookingMode: estimate.bookingMode,
    earliestReadyTime: estimate.earliestReadyTime,
    pickupTime: estimate.pickupTime,
    slots: estimate.slots,
    closedToday: estimate.closedToday,
    disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
    message: estimate.message,
  });
}
