import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isWebReservationMaintenance } from "./lib/reservationMaintenance";
import { isStoreOrderMaintenance } from "./lib/storeOrderMaintenance";

const BLOCKED_PATH =
  /^\/(menu|reserve\/(menu|schedule|cart|customer|datetime))(\/|$)/;

const STORE_ORDER_BLOCKED = /^\/order(\/|$)/;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    isStoreOrderMaintenance() &&
    STORE_ORDER_BLOCKED.test(pathname) &&
    pathname !== "/order/maintenance"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/order/maintenance";
    return NextResponse.rewrite(url);
  }

  if (!isWebReservationMaintenance()) {
    return NextResponse.next();
  }

  if (BLOCKED_PATH.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/reserve/maintenance";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/menu",
    "/menu/:path*",
    "/reserve/menu",
    "/reserve/menu/:path*",
    "/reserve/schedule",
    "/reserve/schedule/:path*",
    "/reserve/cart",
    "/reserve/cart/:path*",
    "/reserve/customer",
    "/reserve/customer/:path*",
    "/reserve/datetime",
    "/reserve/datetime/:path*",
    "/order",
    "/order/:path*",
  ],
};
