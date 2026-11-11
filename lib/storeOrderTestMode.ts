const TRUTHY = new Set(["true", "1", "yes", "on"]);

function isTruthyEnv(value: string | undefined): boolean {
  return TRUTHY.has(String(value ?? "").trim().toLowerCase());
}

/** ローカル検証用。本番では必ず false（未設定） */
export function isStoreOrderTestMode(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_STORE_ORDER_TEST_MODE ??
    process.env.STORE_ORDER_TEST_MODE ??
    "false";
  return isTruthyEnv(raw);
}

/** 22:00 / 22:30 ラストオーダーを無視（テストモード or 専用フラグ） */
export function isStoreOrderBypassLastOrder(): boolean {
  if (isStoreOrderTestMode()) return true;
  return (
    isTruthyEnv(process.env.STORE_ORDER_BYPASS_LAST_ORDER) ||
    isTruthyEnv(process.env.NEXT_PUBLIC_STORE_ORDER_BYPASS_LAST_ORDER) ||
    isTruthyEnv(process.env.STORE_ORDER_IGNORE_LAST_ORDER)
  );
}
