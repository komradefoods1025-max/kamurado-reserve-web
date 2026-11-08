import { getTodayYmdJst } from "./bookingDates";
import {
  advanceBookingStartYmd,
  getStoreSlotsForPickupDate,
  isStoreOrderSameDayLiveWindow,
  listStoreAdvanceBookableDates,
  listStorePickupSlots,
} from "./storePickupSlots";

export function isStoreOrderReservationNo(no: string): boolean {
  return String(no || "")
    .trim()
    .toUpperCase()
    .startsWith("STO-");
}

export function validateStorePickupDateTime(
  pickupDate: string,
  pickupTime: string,
  closedDates?: Set<string>,
  now = new Date(),
): boolean {
  const today = getTodayYmdJst(now);
  if (!pickupDate || !pickupTime || pickupDate < today) return false;
  if (closedDates?.has(pickupDate)) return false;

  const slots = getStoreSlotsForPickupDate(pickupDate, today);
  if (!slots.includes(pickupTime)) return false;

  const plan = listStorePickupSlots(now, today, closedDates);
  if (plan.bookingMode === "today" && pickupDate === today) {
    return plan.slots.includes(pickupTime);
  }

  const manageStart = isStoreOrderSameDayLiveWindow(now)
    ? today
    : advanceBookingStartYmd(today, now);
  const manageDates = listStoreAdvanceBookableDates(manageStart, closedDates);
  return manageDates.some((d) => d.ymd === pickupDate);
}
