import { NextResponse } from "next/server";
import { fetchSheetClosedDaysSet } from "../../../../lib/sheetClosedDays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const closedDays = await fetchSheetClosedDaysSet();
  const list = Array.from(closedDays).sort();

  return NextResponse.json(
    { ok: true, closedDays: list },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
}
