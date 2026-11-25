// Esta etapa usa exclusivamente o Sandbox e só solicita cotações.
const HOST = 'https://sandbox.melhorenvio.com.br';
const TOKEN_KEY = 'shipping:sandbox:tokens';
const STATE_PREFIX = 'shipping:sandbox:state:';
const OAUTH_COOKIE = 'frs_shipping_oauth';
const callbackCookie = (request, value, maxAge = 600) => `${OAUTH_COOKIE}=${value}; HttpOnly;${new URL(request.url).protocol === 'https:' ? ' Secure;' : ''} SameSite=Lax; Path=/api/admin/shipping/callback; Max-Age=${maxAge}`;
const oauthNonce = (request) => request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${OAUTH_COOKIE}=`))?.slice(OAUTH_COOKIE.length + 1) || '';

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const postalCode = (value) => String(value || '').replace(/\D/g, '');
const validPostalCode = (value) => /^\d{8}$/.test(value) && !/^(\d)\1{7}$/.test(value);

async function read(env, key) { const row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind(key).first(); return row ? JSON.parse(row.value) : null; }
async function save(env, key, value) { await env.DB.prepare("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')").bind(key, JSON.stringify(value)).run(); }
function config(env) {
  if (!env.MELHOR_ENVIO_CLIENT_ID || !env.MELHOR_ENVIO_CLIENT_SECRET || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.MELHOR_ENVIO_CONTACT_EMAIL || '')) throw fail('A conexão de testes do Melhor Envio ainda precisa ser configurada pela loja.', 503);
  return { client_id: env.MELHOR_ENVIO_CLIENT_ID, client_secret: env.MELHOR_ENVIO_CLIENT_SECRET };
}
const bytes64 = (bytes) => btoa(String.fromCharCode(...bytes));
const from64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
async function encryptionKey(env) { return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(config(env).client_secret)), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function storeTokens(env, tokens, expectedCipher) {
  if (!tokens?.access_token || !tokens.refresh_token || !Number.isFinite(Number(tokens.expires_in)) || Number(tokens.expires_in) <= 0) throw fail('O Melhor Envio não confirmou a conexão. Autorize novamente.', 502);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(env), new TextEncoder().encode(JSON.stringify(tokens)));
  const record = { iv: bytes64(iv), encrypted: bytes64(new Uint8Array(encrypted)), expiresAt: Date.now() + Number(tokens.expires_in) * 1000 };
  if (expectedCipher) {
    const result = await env.DB.prepare("UPDATE app_state SET value = ?, updated_at = datetime('now') WHERE key = ? AND json_extract(value, '$.encrypted') = ?").bind(JSON.stringify(record), TOKEN_KEY, expectedCipher).run();
    if (!result.meta.changes) throw fail('A conexão foi alterada ou desconectada. Tente novamente pelo painel.', 503);
  } else await save(env, TOKEN_KEY, record);
}
async function loadTokens(env) {
  const saved = await read(env, TOKEN_KEY);
  if (!saved) throw fail('A loja ainda não conectou o Melhor Envio Sandbox.', 503);
  try { return { ...JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(saved.iv) }, await encryptionKey(env), from64(saved.encrypted)))), expiresAt: saved.expiresAt, fingerprint: saved.encrypted }; }
  catch { throw fail('A conexão precisa ser autorizada novamente no painel da loja.', 503); }
}
async function provider(env, path, body, token = '') {
  try {
    const response = await fetch(`${HOST}${path}`, { method: 'POST', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': `FRS-Wear (${env.MELHOR_ENVIO_CONTACT_EMAIL})`, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    if ([401, 403].includes(response.status)) throw fail('A autorização do Melhor Envio Sandbox precisa ser renovada no admin.', 503);
    if (response.status === 429) throw fail('Limite de consultas atingido. Aguarde um pouco antes de tentar novamente.', 429);
    if (!response.ok) throw fail(response.status === 422 ? 'Confira os CEPs, pesos e medidas cadastrados para o frete.' : 'O Melhor Envio Sandbox está indisponível. Tente novamente.', 502);
    return await response.json();
  } catch (error) { if (error.status) throw error; throw fail('Não foi possível consultar o Melhor Envio Sandbox agora. Tente novamente.', 502); }
}
let refreshPromise;
async function accessToken(env) {
  const tokens = await loadTokens(env);
  if (tokens.expiresAt > Date.now() + 60000) return tokens.access_token;
  if (!refreshPromise) refreshPromise = (async () => {
    const renewed = await provider(env, '/oauth/token', { ...config(env), grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
    await storeTokens(env, renewed, tokens.fingerprint); return renewed.access_token;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
function measurement(value, fallback, label, maximum) {
  const number = Number(value === undefined || value === null || value === '' ? fallback : value);
  if (!Number.isFinite(number) || number <= 0 || number > maximum) throw fail(`Confira ${label} na configuração de frete.`);
  return number;
}
export function quotePayload(state, body) {
  const from = postalCode(state.store?.shippingOriginPostalCode), to = postalCode(body?.postalCode);
  if (!validPostalCode(from)) throw fail('A loja precisa cadastrar o CEP de origem dos testes.', 503);
  if (!validPostalCode(to)) throw fail('Digite um CEP de destino válido, com 8 números.');
  if (!Array.isArray(body?.items) || !body.items.length || body.items.length > 50) throw fail('Adicione produtos ao carrinho antes de calcular.');
  const grouped = new Map();
  let subtotalCents = 0, usesDefaultPackaging = false, totalQuantity = 0;
  for (const item of body.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) throw fail('Quantidade de produtos inválida.');
    grouped.set(item.id, (grouped.get(item.id) || 0) + item.quantity); totalQuantity += item.quantity;
  }
  if (totalQuantity > 100) throw fail('Para mais de 100 peças, consulte a loja para cotação.');
  const products = [...grouped].map(([id, quantity]) => {
    const product = state.products.find((row) => row.id === id && row.active !== false);
    if (!product || product.stock < quantity) throw fail('Um produto não está disponível no catálogo publicado. Revise o carrinho.', 409);
    const price = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(price) || price < 0) throw fail('A loja precisa revisar o preço de um produto.');
    subtotalCents += price * quantity;
    usesDefaultPackaging ||= ['shippingWeight', 'shippingWidth', 'shippingHeight', 'shippingLength'].some((key) => !product[key]);
    return { id, quantity, insurance_value: price / 100,
      width: measurement(product.shippingWidth, state.store.shippingDefaultWidth, 'a largura', 200),
      height: measurement(product.shippingHeight, state.store.shippingDefaultHeight, 'a altura', 200),
      length: measurement(product.shippingLength, state.store.shippingDefaultLength, 'o comprimento', 200),
      weight: measurement(product.shippingWeight, state.store.shippingDefaultWeight, 'o peso', 50) };
  });
  return { payload: { from: { postal_code: from }, to: { postal_code: to }, products, options: { receipt: false, own_hand: false } }, subtotalCents, usesDefaultPackaging };
}
export function quoteOptions(response, subtotalCents) {
  if (!Array.isArray(response)) throw fail('Resposta inválida do Melhor Envio Sandbox.', 502);
  return response.filter((row) => !row.error).flatMap((row) => {
    const rawPrice = row.custom_price ?? row.price;
    const priceCents = rawPrice === null || rawPrice === '' || typeof rawPrice === 'boolean' ? NaN : Math.round(Number(rawPrice) * 100);
    const rawDays = row.custom_delivery_time ?? row.delivery_time;
    const days = rawDays === null || rawDays === '' || typeof rawDays === 'boolean' ? NaN : Number(rawDays);
    if (!Number.isSafeInteger(priceCents) || priceCents < 0 || !Number.isFinite(days) || days < 0 || !row.id || !row.name || !row.company?.name) return [];
    return [{ id: String(row.id), service: String(row.name), company: String(row.company.name), priceCents, deliveryDays: days, estimatedTotalCents: subtotalCents + priceCents }];
  }).sort((a, b) => a.priceCents - b.priceCents);
}

export async function handleShipping(context, path, { reply, requireAdmin, getState, defaultCatalogState }) {
  const preview = path === 'admin/shipping/preview-quote';
  const admin = path.startsWith('admin/shipping/');
  if (!admin && !['shipping/status', 'shipping/quote'].includes(path)) return null;
  const { request, env } = context;
  let access;
  const isCallback = path === 'admin/shipping/callback' && request.method === 'GET';
  if (admin && !isCallback) {
    access = await requireAdmin(context); if (access.response) return access.response;
    if (access.session.access === 'demo' && !preview) return reply({ demo: true, connected: false, error: 'Conexões externas são configuradas somente pelo acesso completo do admin.' }, 403);
  }
  const url = new URL(request.url), callback = `${url.origin}/api/admin/shipping/callback`;
  const redirect = (status) => new Response(null, { status: 303, headers: { location: `/admin?view=shipping&shipping=${status}`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'set-cookie': callbackCookie(request, '', 0) } });
  try {
    if (path === 'admin/shipping/connect' && request.method === 'POST') {
      config(env);
      const nonce = crypto.randomUUID();
      await save(env, STATE_PREFIX + nonce, { email: access.session.email, expiresAt: Date.now() + 600000, callback });
      const target = new URL('/oauth/authorize', HOST);
      target.search = new URLSearchParams({ client_id: env.MELHOR_ENVIO_CLIENT_ID, redirect_uri: callback, response_type: 'code', scope: 'shipping-calculate', state: nonce }).toString();
      return reply({ url: target.href }, 200, { 'set-cookie': callbackCookie(request, nonce) });
    }
    if (path === 'admin/shipping/callback' && request.method === 'GET') {
      const nonce = url.searchParams.get('state');
      if (!nonce || !/^[a-f0-9-]{36}$/i.test(nonce) || oauthNonce(request) !== nonce) return redirect('invalid');
      const row = await env.DB.prepare('DELETE FROM app_state WHERE key = ? RETURNING value').bind(STATE_PREFIX + nonce).first();
      const state = row ? JSON.parse(row.value) : null;
      // O cookie Strict do admin não acompanha o retorno externo. O nonce
      // HttpOnly/Lax vincula o callback ao navegador autenticado que iniciou.
      const current = await requireAdmin(context);
      if (!state || !state.email || (current.session && (current.session.access === 'demo' || state.email !== current.session.email)) || state.expiresAt < Date.now() || state.callback !== callback || !url.searchParams.get('code') || url.searchParams.has('error')) return redirect('invalid');
      const tokens = await provider(env, '/oauth/token', { ...config(env), grant_type: 'authorization_code', redirect_uri: callback, code: url.searchParams.get('code') });
      await storeTokens(env, tokens); return redirect('connected');
    }
    if (path === 'admin/shipping/disconnect' && request.method === 'POST') {
      await env.DB.prepare('DELETE FROM app_state WHERE key = ?').bind(TOKEN_KEY).run(); return reply({ ok: true });
    }
    const state = await getState(env) || defaultCatalogState();
    if (['shipping/status', 'admin/shipping/status'].includes(path) && request.method === 'GET') {
      const missing = ['MELHOR_ENVIO_CLIENT_ID', 'MELHOR_ENVIO_CLIENT_SECRET', 'MELHOR_ENVIO_CONTACT_EMAIL'].filter((name) => !env[name]);
      if (env.MELHOR_ENVIO_CONTACT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.MELHOR_ENVIO_CONTACT_EMAIL)) missing.push('MELHOR_ENVIO_CONTACT_EMAIL (email válido)');
      const tokens = await read(env, TOKEN_KEY);
      return reply({ environment: 'sandbox', enabled: state.store.shippingSandboxEnabled === true, connected: Boolean(tokens), configured: !missing.length, ...(admin ? { missing, callback, expiresAt: tokens?.expiresAt || null } : {}) });
    }
    if ((path === 'shipping/quote' || preview) && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const quoteState = preview ? body?.state : state;
      if (preview && (!quoteState?.store || !Array.isArray(quoteState.products) || quoteState.products.length > 50)) throw fail('Revise os produtos da prévia antes de calcular.');
      if (quoteState.store.shippingSandboxEnabled !== true) throw fail('A simulação de frete ainda não foi habilitada pela loja.', 503);
      const quote = quotePayload(quoteState, body);
      config(env);
      const response = await provider(env, '/api/v2/me/shipment/calculate', quote.payload, await accessToken(env));
      const options = quoteOptions(response, quote.subtotalCents);
      return reply({ environment: 'sandbox', subtotalCents: quote.subtotalCents, usesDefaultPackaging: quote.usesDefaultPackaging, options, message: options.length ? 'Cotação de teste. Não é válida para cobrança ou postagem.' : 'Nenhum serviço disponível no Sandbox para estes CEPs e produtos.' });
    }
    return reply({ error: 'Método inválido.' }, 405);
  } catch (error) { if (path === 'admin/shipping/callback') return redirect('failed'); return reply({ error: error.status ? error.message : 'Não foi possível acessar o frete de teste. Confira a configuração no admin.' }, error.status || 503); }
}
