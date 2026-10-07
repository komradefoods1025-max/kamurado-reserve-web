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

  let response = upstream;

  if (
    upstream.status === 301 ||
    upstream.status === 302 ||
    upstream.status === 303 ||
    upstream.status === 307 ||
    upstream.status === 308
  ) {
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

  return {
    ok: response.ok,
    status: response.status,
    rawText,
    data
  };
}

module.exports = {
  postToGasWebApp
};
