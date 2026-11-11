const TRUTHY = new Set(["true", "1", "yes", "on"]);

function isTruthyEnv(value: string | undefined): boolean {
  return TRUTHY.has(String(value ?? "").trim().toLowerCase());
}

/** ローカル検証用。本番では必ず false（未設定） */
export function isStoreOrderTestMode(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const raw =
    process.env.NEXT_PUBLIC_STORE_ORDER_TEST_MODE ??
    process.env.STORE_ORDER_TEST_MODE ??
    "false";
  return isTruthyEnv(raw);
}

/** 本番で 22:00 / 22:30 を厳守するときだけ true（未設定＝テスト期間は LO 無効） */
export function isStoreOrderEnforceLastOrder(): boolean {
  return (
    isTruthyEnv(process.env.STORE_ORDER_ENFORCE_LAST_ORDER) ||
    isTruthyEnv(process.env.NEXT_PUBLIC_STORE_ORDER_ENFORCE_LAST_ORDER)
  );
}

/** 22:00 / 22:30 ラストオーダーを無視するか */
export function isStoreOrderBypassLastOrder(): boolean {
  if (isStoreOrderEnforceLastOrder()) return false;
  if (isStoreOrderTestMode()) return true;
  if (
    isTruthyEnv(process.env.STORE_ORDER_BYPASS_LAST_ORDER) ||
    isTruthyEnv(process.env.NEXT_PUBLIC_STORE_ORDER_BYPASS_LAST_ORDER) ||
    isTruthyEnv(process.env.STORE_ORDER_IGNORE_LAST_ORDER)
  ) {
    return true;
  }
  /** 既定: 店内オーダーは LO 制限なし（表示ラベルのみ）。本番厳守は ENFORCE を true に */
  return true;
}
