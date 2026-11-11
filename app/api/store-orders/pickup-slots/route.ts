import { NextRequest, NextResponse } from "next/server";
import {
  advanceBookingStartYmd,
  getStoreSlotsForPickupDate,
  isAfterStoreOrderNextDayCutoff,
  isStoreOrderSameDayLiveWindow,
  listStoreAdvanceBookableDates,
  listStorePickupSlots,
} from "../../../../lib/storePickupSlots";
import { fetchSheetClosedDaysSet } from "../../../../lib/sheetClosedDays";
import { formatDateLabel, getTodayYmdJst } from "../../../../lib/bookingDates";
import { STORE_ORDER_BUSY_DISCLAIMER } from "../../../../lib/storeOrderCopy";
import {
  isStoreOrderBypassLastOrder,
  isStoreOrderTestMode,
} from "../../../../lib/storeOrderTestMode";
import { isStoreOrderDineInServer } from "../../../../lib/storeOrderDineIn";
import { getStoreDineInServiceStatus } from "../../../../lib/storeOrderDineInAccess";
import {
  STORE_ORDER_DINE_IN_DRINK_LAST_ORDER,
  STORE_ORDER_DINE_IN_FOOD_LAST_ORDER,
} from "../../../../lib/storeOrderConfig";
import { STORE_ORDER_LAST_ORDER_LINES } from "../../../../lib/storeOrderCopy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const today = getTodayYmdJst();
  const closed = await fetchSheetClosedDaysSet();
  const now = new Date();

  if (isStoreOrderDineInServer()) {
    const closedToday =
      closed.has(today) && !isStoreOrderTestMode();
    const access = getStoreDineInServiceStatus(now, closedToday);
    return NextResponse.json({
      ok: true,
      dineIn: true,
      pickupDate: today,
      orderingOpen: access.ok,
      closedToday: closedToday || !access.ok,
      foodLastOrder: STORE_ORDER_DINE_IN_FOOD_LAST_ORDER,
      drinkLastOrder: STORE_ORDER_DINE_IN_DRINK_LAST_ORDER,
      lastOrderLines: [...STORE_ORDER_LAST_ORDER_LINES],
      message: access.ok ? null : access.message,
      disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
      testMode: isStoreOrderTestMode(),
      bypassLastOrder: isStoreOrderBypassLastOrder(),
    });
  }

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

  const manageStart = isStoreOrderSameDayLiveWindow()
    ? today
    : advanceBookingStartYmd(today, new Date());
  const manageBookableDates = listStoreAdvanceBookableDates(
    manageStart,
    closed,
  );

  return NextResponse.json({
    ok: true,
    pickupDate,
    pickupDateLabel:
      pickupDate !== today ? formatDateLabel(pickupDate) : null,
    bookingMode: estimate.bookingMode,
    bookableDates: estimate.bookableDates,
    manageBookableDates: manageBookableDates,
    earliestReadyTime: estimate.earliestReadyTime,
    pickupTime: slots[0] ?? estimate.pickupTime,
    slots,
    closedToday: estimate.closedToday,
    disclaimer: STORE_ORDER_BUSY_DISCLAIMER,
    message: estimate.message,
  });
}
