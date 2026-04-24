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

function normalizePhone(value: unknown) {
  return String(value || "").replace(/[^\d]/g, "");
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

async function postToGas(payload: unknown) {
  if (!SAVE_URL) {
    return {
      ok: false,
      status: 500,
      rawText: "",
      data: {
        ok: false,
        message: "RESERVATION_SAVE_URL が未設定です",
      },
    };
  }

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

  return {
    ok: upstream.ok,
    status: upstream.status,
    rawText,
    data,
  };
}

async function handleGetLatestReservation(body: any) {
  const phone = normalizePhone(
    body?.phone || body?.customerPhone || body?.tel || body?.telephone
  );

  if (!phone) {
    return NextResponse.json(
      {
        ok: false,
        message: "電話番号を入力してください",
      },
      { status: 400 }
    );
  }

  const gasResult = await postToGas({
    action: "getLatestReservation",
    channel: "WEB",
    source: "next-web-app",
    phone,
    lookupPhone: phone,
  });

  if (!gasResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `GASへの送信でHTTPエラーが発生しました (${gasResult.status})`,
        detail: gasResult.rawText,
      },
      { status: 500 }
    );
  }

  const data = gasResult.data;

  if (data && data.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: data.error || data.message || "予約確認に失敗しました",
        detail: data,
      },
      { status: 500 }
    );
  }

  const reservation =
    data?.reservation ||
    data?.latestReservation ||
    data?.data?.reservation ||
    data?.data?.latestReservation ||
    data?.row ||
    data?.data ||
    data?.result ||
    null;

  const found =
    data?.found === true ||
    Boolean(reservation && typeof reservation === "object");

  return NextResponse.json({
    ok: true,
    found,
    reservation,
    data,
  });
}

async function handleUpdateReservation(body: any) {
  const sourceReservation = body?.reservation || {};
  const sourceCustomer = body?.customer || sourceReservation?.customer || {};

  const reservationNo = String(
    body?.reservationNo ||
      body?.reservation_no ||
      sourceReservation?.reservationNo ||
      sourceReservation?.reservation_no ||
      ""
  ).trim();

  const date =
    body?.date ||
    body?.pickupDate ||
    sourceReservation?.date ||
    sourceReservation?.pickupDate ||
    "";

  const time =
    body?.time ||
    body?.pickupTime ||
    sourceReservation?.time ||
    sourceReservation?.pickupTime ||
    "";

  const name =
    body?.name ||
    sourceCustomer?.name ||
    sourceReservation?.name ||
    sourceReservation?.customerName ||
    "";

  const phone =
    normalizePhone(body?.phone) ||
    normalizePhone(sourceCustomer?.phone) ||
    normalizePhone(sourceReservation?.phone) ||
    "";

  const items = normalizeItems(body?.items || sourceReservation?.items || []);

  if (!reservationNo) {
    return NextResponse.json(
      {
        ok: false,
        message: "受付番号が見つかりません",
      },
      { status: 400 }
    );
  }

  if (!date || !time) {
    return NextResponse.json(
      {
        ok: false,
        message: "変更後の受取日と受取時間を選択してください",
      },
      { status: 400 }
    );
  }

  if (!name || !phone) {
    return NextResponse.json(
      {
        ok: false,
        message: "予約者情報が不足しています",
      },
      { status: 400 }
    );
  }

  if (!items.length) {
    return NextResponse.json(
      {
        ok: false,
        message: "注文内容が取得できないため変更できません",
      },
      { status: 400 }
    );
  }

  const totalQty =
    body?.totalQty ??
    body?.totalQuantity ??
    sourceReservation?.totalQty ??
    sourceReservation?.totalQuantity ??
    items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const total =
    body?.total ??
    body?.totalAmount ??
    sourceReservation?.total ??
    sourceReservation?.totalAmount ??
    items.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const gasResult = await postToGas({
    action: "updateReservation",
    channel: "WEB",
    source: "next-web-app",
    reservationNo,
    date,
    time,
    name,
    phone,
    note: body?.note || sourceReservation?.note || "",
    items,
    itemCount: items.length,
    totalQty,
    total,
    status: "変更済み",
    notifyMail: true,
    updatedAt: new Date().toISOString(),
  });

  if (!gasResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `GASへの送信でHTTPエラーが発生しました (${gasResult.status})`,
        detail: gasResult.rawText,
      },
      { status: 500 }
    );
  }

  const data = gasResult.data;

  if (data && data.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: data.error || data.message || "予約変更に失敗しました",
        detail: data,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    reservationNo,
    data,
  });
}

async function handleCancelReservation(body: any) {
  const phone = normalizePhone(body?.phone || body?.customerPhone || "");
  const reservationNo = String(
    body?.reservationNo ||
      body?.reservation_no ||
      body?.receptionNo ||
      body?.受付番号 ||
      ""
  ).trim();

  if (!reservationNo) {
    return NextResponse.json(
      {
        ok: false,
        message: "受付番号が見つかりません",
      },
      { status: 400 }
    );
  }

  const gasResult = await postToGas({
    action: "cancelReservation",
    channel: "WEB",
    source: "next-web-app",
    reservationNo,
    reservation_no: reservationNo,
    phone,
    status: "キャンセル",
    notifyMail: true,
    canceledAt: new Date().toISOString(),
  });

  if (!gasResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `GASへの送信でHTTPエラーが発生しました (${gasResult.status})`,
        detail: gasResult.rawText,
      },
      { status: 500 }
    );
  }

  const data = gasResult.data;

  if (data && data.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: data.error || data.message || "キャンセル処理に失敗しました",
        detail: data,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    reservationNo,
    data,
  });
}

async function handleCreateReservation(body: any) {
  const sourceReservation = body?.reservation || {};
  const sourceCustomer = body?.customer || sourceReservation?.customer || {};

  const normalizedItems = normalizeItems(
    body?.items || sourceReservation?.items || []
  );

  const payload = {
    channel: body?.channel || "WEB",
    source: body?.source || "next-web-app",
    storeName: body?.storeName || "かむらど",

    reservationNo: body?.reservationNo || sourceReservation?.reservationNo || "",
    date:
      body?.date ||
      body?.pickupDate ||
      sourceReservation?.pickupDate ||
      sourceReservation?.date ||
      "",
    time:
      body?.time ||
      body?.pickupTime ||
      sourceReservation?.pickupTime ||
      sourceReservation?.time ||
      "",

    name:
      body?.name ||
      sourceCustomer?.name ||
      sourceReservation?.customerName ||
      sourceReservation?.name ||
      "",
    phone:
      normalizePhone(body?.phone) ||
      normalizePhone(sourceCustomer?.phone) ||
      normalizePhone(sourceReservation?.phone) ||
      "",
    note:
      body?.note ||
      sourceCustomer?.note ||
      sourceReservation?.note ||
      "",

    items: normalizedItems,
    itemCount: normalizedItems.length,
    totalQty:
      body?.totalQty ??
      body?.totalQuantity ??
      sourceReservation?.totalQty ??
      sourceReservation?.totalQuantity ??
      normalizedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    total:
      body?.total ??
      body?.totalAmount ??
      sourceReservation?.total ??
      sourceReservation?.totalAmount ??
      normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0),

    submittedAt: body?.submittedAt || new Date().toISOString(),
    notifyMail: true,
    status: "受付済み",
  };

  const gasResult = await postToGas(payload);

  if (!gasResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `GASへの送信でHTTPエラーが発生しました (${gasResult.status})`,
        detail: gasResult.rawText,
      },
      { status: 500 }
    );
  }

  const data = gasResult.data;

  if (data && data.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: data.error || data.message || "GASが ok:false を返しました",
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || "").trim();

    if (action === "getLatestReservation" || action === "checkReservation") {
      return handleGetLatestReservation(body);
    }

    if (action === "updateReservation") {
      return handleUpdateReservation(body);
    }

    if (action === "cancelReservation") {
      return handleCancelReservation(body);
    }

    return handleCreateReservation(body);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "予約処理中に不明なエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
