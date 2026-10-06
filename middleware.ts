import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isWebReservationMaintenance } from "./lib/reservationMaintenance";

const BLOCKED_PATH =
  /^\/(menu|reserve\/(menu|schedule|cart|customer|datetime))(\/|$)/;

export function middleware(request: NextRequest) {
  if (!isWebReservationMaintenance()) {
    return NextResponse.next();
  }

  if (BLOCKED_PATH.test(request.nextUrl.pathname)) {
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
  ],
};
