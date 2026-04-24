import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAVE_URL = process.env.RESERVATION_SAVE_URL || "";

type RawItem = {
  id?: string;
  name?: string;
  price?: number | string;
  quantity?: number | string;
  itemType?: string;
  menuKey?: string;
  menuName?: string;
  qty?: number | string;
  total?: number | string;
  selectedOptionLabel?: string;
  riceSize?: string;
};

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) return [];

  return (items as RawItem[]).map((item) => {
    const qty = toNumber(item.qty ?? item.quantity, 0);
    const price = toNumber(item.price, 0);

    return {
      itemType: item.itemType || "",
      menuKey: item.menuKey || item.id || "",
      menuName: item.menuName || item.name || "",
      riceSize: item.riceSize || item.selectedOptionLabel || "",
      qty,
      price,
      total: toNumber(item.total, qty * price),
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!SAVE_URL) {
      return NextResponse.json(
        {
          ok: false,
          message: "RESERVATION_SAVE_URL が未設定です",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const normalizedItems = normalizeItems(body?.items);

    const payload = {
      channel: body?.channel || "WEB",
      source: body?.source || "next-web-app",
      storeName: body?.storeName || "かむらど",

      reservationNo: body?.reservationNo || "",
      date:
        body?.date ||
        body?.pickupDate ||
        body?.reservation?.pickupDate ||
        "",
      time:
        body?.time ||
        body?.pickupTime ||
        body?.reservation?.pickupTime ||
        "",

      name: body?.name || body?.customer?.name || "",
      phone: body?.phone || body?.customer?.phone || "",
      note: body?.note || body?.customer?.note || "",

      items: normalizedItems,
      itemCount: normalizedItems.length,
      totalQty:
        body?.totalQty ??
        body?.totalQuantity ??
        normalizedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      total:
        body?.total ??
        body?.totalAmount ??
        normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0),

      submittedAt: body?.submittedAt || new Date().toISOString(),
      notifyMail: true,
      status: "受付済み",
    };

    const upstream = await fetch(SAVE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
          message: `GASへの送信でHTTPエラーが発生しました (${upstream.status})`,
          detail: rawText,
        },
        { status: 500 }
      );
    }

    if (data && data.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          message: data.error || "GASが ok:false を返しました",
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
        payload.reservationNo ||
        null,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "予約送信中に不明なエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
