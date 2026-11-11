import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isWebReservationMaintenance } from "./lib/reservationMaintenance";
import { isStoreOrderMaintenance } from "./lib/storeOrderMaintenance";
import { STORE_ORDER_TABLE_SESSION_KEY } from "./lib/storeOrderTableSession";
import { normalizeStoreTableId } from "./lib/storeOrderTables";

const BLOCKED_PATH =
  /^\/(menu|reserve\/(menu|schedule|cart|customer|datetime))(\/|$)/;

const STORE_ORDER_BLOCKED = /^\/order(\/|$)/;

const TABLE_QR_PATH = /^\/order\/t\/([^/]+)\/?$/;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const tableQr = pathname.match(TABLE_QR_PATH);
  if (tableQr && !isStoreOrderMaintenance()) {
    const tableId = normalizeStoreTableId(tableQr[1]);
    if (tableId) {
      const url = request.nextUrl.clone();
      url.pathname = "/order/menu";
      url.searchParams.set("table", tableId);
      const res = NextResponse.redirect(url, 307);
      res.cookies.set(STORE_ORDER_TABLE_SESSION_KEY, tableId, {
        path: "/",
        maxAge: 60 * 60 * 12,
        sameSite: "lax",
        secure: url.protocol === "https:",
      });
      return res;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/order";
    return NextResponse.redirect(url);
  }

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
