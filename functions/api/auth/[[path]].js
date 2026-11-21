const COOKIE_NAME = 'frs_admin_session';
const DEMO_EMAIL = 'admin@frswear.local';
const DEMO_PASSWORD = 'frs1234';
const DEMO_SECRET = 'frs-wear-demo-secret-change-before-production';
const SESSION_SECONDS = 60 * 60 * 8;

const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function base64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function getCookie(request) {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] || '';
}

async function createToken(email, secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${expires}:${email}`;
  return `${expires}.${await sign(payload, secret)}`;
}

async function validSession(request, email, secret) {
  const [expiresText, signature = ''] = getCookie(request).split('.');
  const expires = Number(expiresText);
  if (!expires || expires <= Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = await sign(`${expires}:${email}`, secret);
  return safeEqual(signature, expected);
}

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname.replace('/api/auth/', '').replace(/\/$/, '');
  const email = env.ADMIN_EMAIL || DEMO_EMAIL;
  const password = env.ADMIN_PASSWORD || DEMO_PASSWORD;
  const secret = env.ADMIN_SESSION_SECRET || DEMO_SECRET;
  const demo = !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET;

  if (path === 'session' && request.method === 'GET') {
    const authenticated = await validSession(request, email, secret);
    return json({ authenticated, demo }, authenticated ? 200 : 401);
  }

  if (path === 'login' && request.method === 'POST') {
    let credentials;
    try { credentials = await request.json(); }
    catch { return json({ error: 'Dados de acesso inválidos.' }, 400); }
    if (!safeEqual(String(credentials.email || ''), email) || !safeEqual(String(credentials.password || ''), password)) {
      return json({ error: 'E-mail ou senha incorretos.' }, 401);
    }
    const token = await createToken(email, secret);
    return json({ ok: true, demo }, 200, {
      'Set-Cookie': `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`,
    });
  }

  if (path === 'logout' && request.method === 'POST') {
    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
    });
  }

  return json({ error: 'Rota não encontrada.' }, 404);
}
