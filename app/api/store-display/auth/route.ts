import { NextRequest, NextResponse } from "next/server";
import {
  STORE_DISPLAY_COOKIE,
  signStoreDisplaySession,
  verifyStoreDisplayPin,
  isStoreDisplayConfigured,
} from "../../../../lib/storeDisplaySession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isStoreDisplayConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: "店舗表示が未設定です（STORE_DISPLAY_PIN 等）。",
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const pin = String(body?.pin || "").trim();
  if (!verifyStoreDisplayPin(pin)) {
    return NextResponse.json(
      { ok: false, message: "PINが違います" },
      { status: 401 },
    );
  }

  const token = signStoreDisplaySession();
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "セッションを作成できません" },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(STORE_DISPLAY_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
