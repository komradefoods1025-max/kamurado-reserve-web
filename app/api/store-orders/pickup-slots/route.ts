import { NextRequest, NextResponse } from "next/server";
import {
  getStoreSlotsForPickupDate,
  isAfterStoreOrderNextDayCutoff,
  isStoreOrderSameDayLiveWindow,
  listStorePickupSlots,
} from "../../../../lib/storePickupSlots";
import { fetchSheetClosedDaysSet } from "../../../../lib/sheetClosedDays";
import { formatDateLabel, getTodayYmdJst } from "../../../../lib/bookingDates";
import { STORE_ORDER_BUSY_DISCLAIMER } from "../../../../lib/storeOrderCopy";
import { isStoreOrderTestMode } from "../../../../lib/storeOrderTestMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const today = getTodayYmdJst();
  const closed = await fetchSheetClosedDaysSet();
  const afterCutoff = isAfterStoreOrderNextDayCutoff();

  if (
    closed.has(today) &&
    !isStoreOrderTestMode() &&
    !afterCutoff &&
    isStoreOrderSameDayLiveWindow()
  ) {
    return NextResponse.json({
      ok: true,
      pickupDate: today,
      bookingMode: "today",
      bookableDates: [],
      earliestReadyTime: null,
      pickupTime: null,
      slots: [],
      closedToday: true,
      disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
      message: "本日はお休みのため、モバイルオーダーを受け付けておりません。",
    });
  }

  const estimate = listStorePickupSlots(new Date(), today, closed);
  const requestedDate = req.nextUrl.searchParams.get("date")?.trim();
  let pickupDate = estimate.pickupDate;
  if (
    estimate.bookingMode === "advance" &&
    requestedDate &&
    estimate.bookableDates.some((d) => d.ymd === requestedDate)
  ) {
    pickupDate = requestedDate;
  }

  const slots =
    estimate.bookingMode === "advance" && pickupDate
      ? getStoreSlotsForPickupDate(pickupDate, today)
      : estimate.slots;

  return NextResponse.json({
    ok: true,
    pickupDate,
    pickupDateLabel:
      pickupDate !== today ? formatDateLabel(pickupDate) : null,
    bookingMode: estimate.bookingMode,
    bookableDates: estimate.bookableDates,
    earliestReadyTime: estimate.earliestReadyTime,
    pickupTime: slots[0] ?? estimate.pickupTime,
    slots,
    closedToday: estimate.closedToday,
    disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
    message: estimate.message,
  });
}
