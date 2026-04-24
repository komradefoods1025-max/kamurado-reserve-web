import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAVE_URL = process.env.RESERVATION_SAVE_URL || "";

export async function POST(req: NextRequest) {
  try {
    if (!SAVE_URL) {
      return NextResponse.json(
        {
          ok: false,
          error: "RESERVATION_SAVE_URL が未設定です",
        },
        { status: 500 }
      );
    }

    const reservation = await req.json();

    const upstream = await fetch(SAVE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "saveReservation",
        reservation,
      }),
      cache: "no-store",
    });

    const rawText = await upstream.text();

    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `GASへの送信でHTTPエラーが発生しました (${upstream.status})`,
          detail: rawText,
        },
        { status: 500 }
      );
    }

    if (data && data.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error: data.error || "GASが ok:false を返しました",
          detail: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reservationNo:
        data?.reservationNo ||
        data?.reservation_no ||
        reservation?.reservationNo ||
        null,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "予約送信中に不明なエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
