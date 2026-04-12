
import { NextRequest, NextResponse } from "next/server";

const GAS_ENDPOINT =
  process.env.NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT ||
  process.env.NEXT_PUBLIC_RESERVATION_SAVE_URL ||
  "";

export async function POST(request: NextRequest) {
  try {
    if (!GAS_ENDPOINT) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "送信先URLが未設定です。NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT を確認してください。",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const response = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();

    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { ok: response.ok, message: text };
    }

    return NextResponse.json(data, {
      status: response.ok ? 200 : 500,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "予約送信に失敗しました。";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}
