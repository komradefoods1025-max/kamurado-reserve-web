import {
  fetchGasWebAppGet,
  isGasHtmlErrorPage,
  postToGasWebApp,
  type GasHttpResult,
} from "./gasHttp";

export function isGasDateBookingError(text: unknown): boolean {
  return String(text || "").includes("date is not available for booking");
}

export type GasPostResult = {
  ok: boolean;
  status: number;
  rawText: string;
  data: any;
};

function mapGasHttpToPostResult(gasHttp: GasHttpResult): GasPostResult {
  return {
    ok: gasHttp.ok,
    status: gasHttp.status,
    rawText: gasHttp.rawText,
    data: gasHttp.data,
  };
}

function shouldRetrySaveWithGet(gasHttp: GasHttpResult): boolean {
  if (isGasHtmlErrorPage(gasHttp.rawText)) return true;

  const data =
    gasHttp.data && typeof gasHttp.data === "object"
      ? (gasHttp.data as Record<string, unknown>)
      : null;

  if (data?.ok === true) return false;
  if (!data && gasHttp.rawText.trim()) return true;
  if (!gasHttp.ok && !data) return true;

  return false;
}

export function buildSaveReservationGetUrl(
  baseUrl: string,
  payload: Record<string, unknown>,
): string {
  const url = new URL(baseUrl);
  const items = Array.isArray(payload.items) ? payload.items : [];

  url.searchParams.set("action", "saveReservation");
  url.searchParams.set(
    "reservationNo",
    String(payload.reservationNo || "").trim(),
  );
  url.searchParams.set("date", String(payload.date || ""));
  url.searchParams.set("time", String(payload.time || ""));
  url.searchParams.set("name", String(payload.name || ""));
  url.searchParams.set("phone", String(payload.phone || ""));
  url.searchParams.set("status", String(payload.status || "受付済み"));
  url.searchParams.set("itemCount", String(payload.itemCount ?? items.length));
  url.searchParams.set("totalQty", String(payload.totalQty ?? ""));
  url.searchParams.set("total", String(payload.total ?? ""));
  url.searchParams.set("itemsJson", JSON.stringify(items));
  url.searchParams.set("notifyMail", payload.notifyMail ? "yes" : "yes");
  url.searchParams.set("notifyType", "new");

  const note = String(payload.note || "").trim();
  if (note) url.searchParams.set("note", note);

  return url.toString();
}

const MAX_GET_SAVE_URL_LENGTH = 7500;

export function createWebReservationNo(): string {
  const now = new Date();
  const jst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(/[^\d]/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `WEB-${jst}-${rand}`;
}

function gasSaveSucceeded(result: GasPostResult): boolean {
  const data =
    result.data && typeof result.data === "object"
      ? (result.data as Record<string, unknown>)
      : null;
  return Boolean(result.ok && data?.ok !== false);
}

function extractGasSaveError(result: GasPostResult): string {
  const data =
    result.data && typeof result.data === "object"
      ? (result.data as Record<string, unknown>)
      : null;
  return String(data?.error || data?.message || result.rawText || "");
}

async function saveReservationViaGet(
  saveUrl: string,
  payload: Record<string, unknown>,
): Promise<GasPostResult | null> {
  const getUrl = buildSaveReservationGetUrl(saveUrl, payload);
  if (getUrl.length > MAX_GET_SAVE_URL_LENGTH) {
    return null;
  }
  const getHttp = await fetchGasWebAppGet(getUrl);
  return mapGasHttpToPostResult(getHttp);
}

/**
 * Web 新規予約: 診断で安定していた GET saveReservation を優先し、失敗時のみ POST。
 */
export async function saveReservationToGas(
  saveUrl: string,
  payload: Record<string, unknown>,
): Promise<GasPostResult> {
  const withNo = {
    ...payload,
    reservationNo:
      String(payload.reservationNo || "").trim() || createWebReservationNo(),
  };

  const getResult = await saveReservationViaGet(saveUrl, withNo);
  if (getResult && gasSaveSucceeded(getResult)) {
    return getResult;
  }

  const postHttp = await postToGasWebApp(saveUrl, withNo);
  const postResult = mapGasHttpToPostResult(postHttp);
  if (gasSaveSucceeded(postResult)) {
    return postResult;
  }

  if (shouldRetrySaveWithGet(postHttp)) {
    const getRetry = await saveReservationViaGet(saveUrl, withNo);
    if (getRetry) {
      return getRetry;
    }
  }

  return getResult || postResult;
}

/** @deprecated use saveReservationToGas */
export async function postSaveReservationToGas(
  saveUrl: string,
  payload: Record<string, unknown>,
): Promise<GasPostResult> {
  return saveReservationToGas(saveUrl, payload);
}

export function sanitizeGasErrorForUser(text: unknown): string {
  const raw = String(text || "").trim();
  if (!raw) return "予約の保存に失敗しました。";
  if (isGasHtmlErrorPage(raw) || raw.includes("<!DOCTYPE html")) {
    return (
      "予約の保存サーバー（Google Apps Script）に接続できませんでした。\n" +
      "しばらくしてから再度お試しください。お急ぎの場合は TEL 048-441-5517 までお電話ください。"
    );
  }
  return raw;
}
