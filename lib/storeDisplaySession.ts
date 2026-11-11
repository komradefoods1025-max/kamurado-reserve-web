import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const STORE_DISPLAY_COOKIE = "kamurado_store_display";

function displaySessionSecret(): string {
  return (
    process.env.STORE_DISPLAY_SESSION_SECRET ||
    process.env.STORE_DISPLAY_PIN ||
    ""
  );
}

export function getStoreDisplayPin(): string {
  return String(process.env.STORE_DISPLAY_PIN || "").trim();
}

export function isStoreDisplayConfigured(): boolean {
  return Boolean(getStoreDisplayPin() && displaySessionSecret());
}

export function signStoreDisplaySession(): string | null {
  const pin = getStoreDisplayPin();
  const secret = displaySessionSecret();
  if (!pin || !secret) return null;
  return createHmac("sha256", secret).update("store-display-v1").digest("hex");
}

export function verifyStoreDisplayPin(pin: string): boolean {
  const expected = getStoreDisplayPin();
  if (!expected) return false;
  const a = Buffer.from(pin.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isStoreDisplayRequestAuthorized(req: NextRequest): boolean {
  const token = signStoreDisplaySession();
  if (!token) return false;
  const cookie = req.cookies.get(STORE_DISPLAY_COOKIE)?.value || "";
  if (!cookie) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
