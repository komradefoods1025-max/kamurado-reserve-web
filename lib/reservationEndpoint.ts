function normalizeGasExecUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return trimmed.split("?")[0]?.split("#")[0]?.trim() || trimmed;
  }
}

/** サーバー API 用: 非公開の RESERVATION_SAVE_URL を優先（古い NEXT_PUBLIC より信頼） */
export function getReservationSaveUrl() {
  const endpoint =
    process.env.RESERVATION_SAVE_URL ??
    process.env.NEXT_PUBLIC_RESERVATION_SAVE_URL ??
    process.env.NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT ??
    "";

  return normalizeGasExecUrl(endpoint);
}

export function getReservationSaveUrlCandidates(): string[] {
  const raw = [
    process.env.RESERVATION_SAVE_URL,
    process.env.NEXT_PUBLIC_RESERVATION_SAVE_URL,
    process.env.NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT,
  ];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of raw) {
    const normalized = normalizeGasExecUrl(String(value || ""));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

export function getReservationSaveFallbackUrl() {
  return (
    process.env.RESERVATION_SAVE_FALLBACK_URL?.trim() ||
    process.env.NEXT_PUBLIC_RESERVATION_SAVE_FALLBACK_URL?.trim() ||
    ""
  );
}

export function missingReservationSaveUrlMessage() {
  return "NEXT_PUBLIC_RESERVATION_SAVE_URL または RESERVATION_SAVE_URL が未設定です";
}

export function getReservationSaveUrlDebugInfo() {
  const candidates = getReservationSaveUrlCandidates();
  return {
    hasNextPublicReservationSaveUrl: Boolean(
      process.env.NEXT_PUBLIC_RESERVATION_SAVE_URL,
    ),
    hasReservationSaveUrl: Boolean(process.env.RESERVATION_SAVE_URL),
    hasNextPublicWebReservationEndpoint: Boolean(
      process.env.NEXT_PUBLIC_WEB_RESERVATION_ENDPOINT,
    ),
    configured: Boolean(getReservationSaveUrl()),
    activeSaveUrl: getReservationSaveUrl(),
    candidateCount: candidates.length,
    multipleCandidatesConfigured: candidates.length > 1,
  };
}
