import { head, list, put } from "@vercel/blob";
import type { StoreDisplayOrder } from "./storeDisplayQueue";

function blobToken(): string | null {
  const t = String(process.env.BLOB_READ_WRITE_TOKEN || "").trim();
  return t || null;
}

export function isStoreDisplayBlobQueueEnabled(): boolean {
  return Boolean(blobToken());
}

function blobPath(ymd: string, reservationNo: string): string {
  const safeNo = reservationNo.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `store-display/${ymd}/${safeNo}.json`;
}

export async function blobEnqueueStoreDisplayOrder(
  order: StoreDisplayOrder,
): Promise<boolean> {
  const token = blobToken();
  if (!token) return false;
  const ymd = order.pickupDate || new Date().toISOString().slice(0, 10);
  try {
    await put(blobPath(ymd, order.reservationNo), JSON.stringify(order), {
      access: "public",
      addRandomSuffix: false,
      token,
      contentType: "application/json; charset=utf-8",
    });
    return true;
  } catch (err) {
    console.error("[storeDisplayBlobQueue] enqueue", err);
    return false;
  }
}

export async function blobListStoreDisplayOrders(
  ymd: string,
): Promise<StoreDisplayOrder[]> {
  const token = blobToken();
  if (!token) return [];
  try {
    const { blobs } = await list({
      prefix: `store-display/${ymd}/`,
      token,
    });
    const orders: StoreDisplayOrder[] = [];
    for (const entry of blobs) {
      try {
        const res = await fetch(entry.url, { cache: "no-store" });
        if (!res.ok) continue;
        orders.push((await res.json()) as StoreDisplayOrder);
      } catch {
        /* skip */
      }
    }
    return orders;
  } catch (err) {
    console.error("[storeDisplayBlobQueue] list", err);
    return [];
  }
}

export async function blobApplyStoreDisplayOrderUpdate(
  reservationNo: string,
  ymd: string,
  apply: (order: StoreDisplayOrder) => boolean,
): Promise<boolean> {
  const token = blobToken();
  if (!token) return false;
  const pathname = blobPath(ymd, reservationNo);
  try {
    const meta = await head(pathname, { token });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return false;
    const order = (await res.json()) as StoreDisplayOrder;
    const clone: StoreDisplayOrder = {
      ...order,
      items: order.items.map((item) => ({ ...item })),
    };
    if (!apply(clone)) return false;
    await put(pathname, JSON.stringify(clone), {
      access: "public",
      addRandomSuffix: false,
      token,
      contentType: "application/json; charset=utf-8",
    });
    return true;
  } catch (err) {
    console.error("[storeDisplayBlobQueue] update", err);
    return false;
  }
}

export async function blobUpdateStoreDisplayOrderStatus(
  reservationNo: string,
  status: StoreDisplayOrder["status"],
  ymd: string,
): Promise<boolean> {
  return blobApplyStoreDisplayOrderUpdate(reservationNo, ymd, (order) => {
    order.status = status;
    return true;
  });
}
