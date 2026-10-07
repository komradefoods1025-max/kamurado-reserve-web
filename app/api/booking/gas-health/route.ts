import { NextResponse } from "next/server";
import { fetchGasWebAppGet } from "../../../../lib/gasHttp";
import {
  getReservationSaveFallbackUrl,
  getReservationSaveUrl,
  getReservationSaveUrlDebugInfo,
} from "../../../../lib/reservationEndpoint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskExecUrl(url: string): string {
  const match = url.match(/\/macros\/s\/([^/]+)\/exec/);
  if (!match) return url ? "(set, non-standard format)" : "(not set)";
  const id = match[1];
  if (id.length <= 12) return `/macros/s/${id}/exec`;
  return `/macros/s/${id.slice(0, 6)}…${id.slice(-6)}/exec`;
}

export async function GET() {
  const saveUrl = getReservationSaveUrl();
  const fallbackUrl = getReservationSaveFallbackUrl();

  if (!saveUrl) {
    return NextResponse.json({
      ok: false,
      message: "RESERVATION_SAVE_URL is not configured",
      debug: getReservationSaveUrlDebugInfo(),
    });
  }

  const probeUrl = new URL(saveUrl);
  probeUrl.searchParams.set("action", "getBookingSheetStatus");

  const gas = await fetchGasWebAppGet(probeUrl.toString());
  const data =
    gas.data && typeof gas.data === "object"
      ? (gas.data as Record<string, unknown>)
      : null;

  return NextResponse.json({
    ok: Boolean(gas.ok && data?.ok),
    saveUrl: maskExecUrl(saveUrl),
    fallbackUrl: fallbackUrl ? maskExecUrl(fallbackUrl) : null,
    bookingRulesCodeVersion: data?.bookingRulesCodeVersion ?? null,
    spreadsheetId: data?.spreadsheetId ?? null,
    spreadsheetUrl: data?.spreadsheetUrl ?? null,
    reservationsSheetName: data?.reservationsSheetName ?? null,
    reservationsDataRowCount: data?.reservationsDataRowCount ?? null,
    gasReachable: gas.ok && !gas.rawText.includes("<!DOCTYPE html"),
    debug: getReservationSaveUrlDebugInfo(),
  });
}
