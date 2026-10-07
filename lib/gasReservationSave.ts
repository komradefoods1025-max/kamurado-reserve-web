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

/** POST 失敗時は GAS の GET saveReservation にフォールバック（Web/LINE 共通パターン）。 */
export async function postSaveReservationToGas(
  saveUrl: string,
  payload: Record<string, unknown>,
): Promise<GasPostResult> {
  const postHttp = await postToGasWebApp(saveUrl, payload);

  if (!shouldRetrySaveWithGet(postHttp)) {
    return mapGasHttpToPostResult(postHttp);
  }

  const getUrl = buildSaveReservationGetUrl(saveUrl, payload);
  if (getUrl.length > MAX_GET_SAVE_URL_LENGTH) {
    console.warn(
      "[gasReservationSave] GET save URL too long; keeping POST result",
    );
    return mapGasHttpToPostResult(postHttp);
  }

  console.warn(
    "[gasReservationSave] POST save failed or returned HTML; retrying GET saveReservation",
  );
  const getHttp = await fetchGasWebAppGet(getUrl);
  return mapGasHttpToPostResult(getHttp);
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
