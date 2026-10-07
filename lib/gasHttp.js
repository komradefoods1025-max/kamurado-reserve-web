function isRedirectStatus(status) {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

function isGasHtmlErrorPage(text) {
  const raw = String(text || '');
  return (
    raw.includes('Page Not Found') ||
    raw.includes('unable to open the file') ||
    raw.includes('ページが見つかりません') ||
    raw.includes('現在、ファイルを開くことができません')
  );
}

async function readGasWebAppResponse(upstream) {
  let response = upstream;

  if (isRedirectStatus(upstream.status)) {
    const location = upstream.headers.get('location');
    if (location) {
      response = await fetch(location, {
        method: 'GET',
        cache: 'no-store'
      });
    }
  }

  const rawText = await response.text();

  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch (_parseErr) {
    data = null;
  }

  return { response, rawText, data };
}

async function fetchGasWebAppGet(url) {
  const upstream = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    cache: 'no-store'
  });
  const { response, rawText, data } = await readGasWebAppResponse(upstream);

  return {
    ok: response.ok && !isGasHtmlErrorPage(rawText),
    status: response.status,
    rawText,
    data
  };
}

async function postToGasWebApp(saveUrl, payload) {
  const upstream = await fetch(saveUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    redirect: 'manual',
    cache: 'no-store'
  });

  const { response, rawText, data } = await readGasWebAppResponse(upstream);

  return {
    ok: response.ok && !isGasHtmlErrorPage(rawText),
    status: response.status,
    rawText,
    data
  };
}

module.exports = {
  fetchGasWebAppGet,
  postToGasWebApp
};
