import {
  resolveStoreOrderTableId,
  storeTableLabel,
} from "./storeOrderTables";
import type { StoreDisplayOrder } from "./storeDisplayQueue";

export type StoreDisplayNotificationSupport =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export function storeDisplayNotificationSupport():
  StoreDisplayNotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/** 店舗表示でバックグラウンド通知を使うときの許可取得 */
export async function requestStoreDisplayNotificationPermission(): Promise<StoreDisplayNotificationSupport> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  try {
    const result = await Notification.requestPermission();
    return result === "default" ? "default" : result;
  } catch {
    return "denied";
  }
}

function orderTableLabel(order: StoreDisplayOrder): string {
  const tableId = resolveStoreOrderTableId(order);
  if (tableId) return storeTableLabel(tableId);
  const raw = String(order.seatLabel || order.tableId || "").trim();
  return raw || "店内";
}

export function showStoreDisplayNewOrderNotification(
  order: StoreDisplayOrder,
  mode: "kitchen" | "counter",
): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }

  const place = orderTableLabel(order);
  const qty = order.totalQty > 0 ? `${order.totalQty}点` : "";
  const title =
    mode === "kitchen" ? "新規注文（キッチン）" : "新規注文（カウンター）";
  const body = [place, qty].filter(Boolean).join(" · ");

  try {
    const notification = new Notification(title, {
      body,
      tag: `store-order-${order.reservationNo}`,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    window.setTimeout(() => notification.close(), 12_000);
  } catch {
    // ignore
  }
}