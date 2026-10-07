/**
 * Google Apps Script Web アプリへの POST。
 * 302 → script.googleusercontent.com への GET で JSON を受け取る（標準の fetch 追従だけでは失敗しうる）。
 */
export type GasHttpResult = {
  ok: boolean;
  status: number;
  rawText: string;
  data: unknown;
};

export async function postToGasWebApp(
  saveUrl: string,
  payload: unknown,
): Promise<GasHttpResult> {
  const upstream = await fetch(saveUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    redirect: "manual",
    cache: "no-store",
  });

  let response = upstream;

  if (
    upstream.status === 301 ||
    upstream.status === 302 ||
    upstream.status === 303 ||
    upstream.status === 307 ||
    upstream.status === 308
  ) {
    const location = upstream.headers.get("location");
    if (location) {
      response = await fetch(location, {
        method: "GET",
        cache: "no-store",
      });
    }
  }

  const rawText = await response.text();

  let data: unknown = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    rawText,
    data,
  };
}
