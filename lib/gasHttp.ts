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

function isRedirectStatus(status: number): boolean {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

async function readGasWebAppResponse(
  upstream: Response,
): Promise<{ response: Response; rawText: string; data: unknown }> {
  let response = upstream;

  if (isRedirectStatus(upstream.status)) {
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

  return { response, rawText, data };
}

export function isGasHtmlErrorPage(text: unknown): boolean {
  const raw = String(text || "");
  return (
    raw.includes("Page Not Found") ||
    raw.includes("unable to open the file") ||
    raw.includes("ページが見つかりません") ||
    raw.includes("現在、ファイルを開くことができません")
  );
}

export async function fetchGasWebAppGet(url: string): Promise<GasHttpResult> {
  const upstream = await fetch(url, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
  });

  const { response, rawText, data } = await readGasWebAppResponse(upstream);

  return {
    ok: response.ok && !isGasHtmlErrorPage(rawText),
    status: response.status,
    rawText,
    data,
  };
}

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

  const { response, rawText, data } = await readGasWebAppResponse(upstream);

  return {
    ok: response.ok && !isGasHtmlErrorPage(rawText),
    status: response.status,
    rawText,
    data,
  };
}
