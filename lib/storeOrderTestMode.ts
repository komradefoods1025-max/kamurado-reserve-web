const TRUTHY = new Set(["true", "1", "yes", "on"]);

/** ローカル検証用。本番では必ず false（未設定） */
export function isStoreOrderTestMode(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_STORE_ORDER_TEST_MODE ??
    process.env.STORE_ORDER_TEST_MODE ??
    "false";
  return TRUTHY.has(String(raw).trim().toLowerCase());
}
