const COOKIE = 'frs_admin_session';
const SESSION_SECONDS = 60 * 60 * 8;

const reply = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const encode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const isLocal = (request) => ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);

function adminConfig(request, env) {
  const local = isLocal(request);
  return {
    email: env.ADMIN_EMAIL || (local ? 'admin@frswear.local' : ''),
    password: env.ADMIN_PASSWORD || (local ? 'frs1234' : ''),
    secret: env.ADMIN_SESSION_SECRET || (local ? 'frs-wear-local-demo-secret-not-for-production' : ''),
    demo: local && !env.ADMIN_EMAIL,
  };
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return encode(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function cookieValue(request, name) {
  const match = request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return match?.slice(name.length + 1) || '';
}

async function authenticated(request, env) {
  const config = adminConfig(request, env);
  if (!config.email || !config.secret) return false;
  const [expiresText, signature = ''] = cookieValue(request, COOKIE).split('.');
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !signature) return false;
  return signature === await sign(`${expires}:${config.email}`, config.secret);
}

function sessionHeader(request, token, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? ' Secure;' : '';
  return `${COOKIE}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

async function requireAdmin(context) {
  return await authenticated(context.request, context.env) ? null : reply({ error: 'Sessão administrativa inválida.' }, 401);
}

async function getState(env) {
  const row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind('catalog').first();
  return row?.value ? JSON.parse(row.value) : null;
}

async function saveState(env, state) {
  await env.DB.prepare(`INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
    .bind('catalog', JSON.stringify(state)).run();
}

async function sendBrevoEmail(env, { to, subject, htmlContent, tags }) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !to?.length) return;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: env.BREVO_SENDER_NAME || 'FRS-Wear', email: env.BREVO_SENDER_EMAIL },
      to,
      subject,
      htmlContent,
      tags,
    }),
  });
  if (!response.ok) throw new Error(`Brevo respondeu ${response.status}`);
}

async function sendOrderEmails(env, order) {
  const items = order.items.map((item) => `<li>${item.quantity}× ${escapeHtml(item.name)} — ${escapeHtml(item.size)} / ${escapeHtml(item.color)}</li>`).join('');
  const total = (order.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const payment = { retirada: 'Retirada na loja', pix: 'Pix', cartao: 'Cartão' }[order.payment_method] || order.payment_method;
  const html = `<h1>Pedido recebido</h1><p>Pedido <strong>${escapeHtml(order.id)}</strong></p><ul>${items}</ul><p>Pagamento: <strong>${escapeHtml(payment)}</strong></p><p>Total: <strong>${total}</strong></p>`;
  const jobs = [sendBrevoEmail(env, {
    to: [{ email: order.customer.email, name: order.customer.name }],
    subject: `Recebemos seu pedido — ${env.BREVO_SENDER_NAME || 'FRS-Wear'}`,
    htmlContent: html,
    tags: ['pedido-cliente'],
  })];
  if (env.STORE_NOTIFICATION_EMAIL) jobs.push(sendBrevoEmail(env, {
    to: [{ email: env.STORE_NOTIFICATION_EMAIL, name: env.BREVO_SENDER_NAME || 'FRS-Wear' }],
    subject: `Novo pedido ${order.id}`,
    htmlContent: html,
    tags: ['novo-pedido'],
  }));
  await Promise.all(jobs);
}

async function handleAuth(context, path) {
  const { request, env } = context;
  if (path === 'auth/session' && request.method === 'GET') {
    return await authenticated(request, env) ? reply({ authenticated: true, demo: adminConfig(request, env).demo }) : reply({ authenticated: false }, 401);
  }
  if (path === 'auth/login' && request.method === 'POST') {
    const config = adminConfig(request, env);
    if (!config.email || !config.password || !config.secret) return reply({ error: 'Credenciais do painel ainda não configuradas no Cloudflare.' }, 503);
    const body = await request.json().catch(() => ({}));
    if (body.email !== config.email || body.password !== config.password) return reply({ error: 'E-mail ou senha incorretos.' }, 401);
    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const token = `${expires}.${await sign(`${expires}:${config.email}`, config.secret)}`;
    return reply({ ok: true, demo: config.demo }, 200, { 'set-cookie': sessionHeader(request, token) });
  }
  if (path === 'auth/logout' && request.method === 'POST') {
    return reply({ ok: true }, 200, { 'set-cookie': sessionHeader(request, '', 0) });
  }
  return null;
}

async function handleAdmin(context, path) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const { request, env } = context;
  if (path === 'admin/data' && request.method === 'GET') {
    const state = await getState(env);
    return reply({ initialized: Boolean(state), ...(state || {}) });
  }
  if (path === 'admin/data' && request.method === 'PUT') {
    const state = await request.json().catch(() => null);
    if (!state?.store || !Array.isArray(state.products) || state.products.length > 500) return reply({ error: 'Catálogo inválido.' }, 400);
    await saveState(env, { store: state.store, products: state.products, activity: (state.activity || []).slice(0, 50) });
    return reply({ ok: true, updatedAt: new Date().toISOString() });
  }
  if (path === 'admin/upload' && request.method === 'POST') {
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File) || !['image/webp', 'image/png', 'image/jpeg'].includes(image.type) || image.size > 2_500_000) return reply({ error: 'Imagem inválida ou maior que 2,5 MB.' }, 400);
    const extension = image.type === 'image/png' ? 'png' : image.type === 'image/jpeg' ? 'jpg' : 'webp';
    const key = `images/${crypto.randomUUID()}.${extension}`;
    await env.UPLOADS.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
    return reply({ ok: true, url: `${new URL(request.url).origin}/api/files/${key}` }, 201);
  }
  if (path === 'admin/orders' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all();
    const orders = result.results.map((row) => ({ ...row, customer: JSON.parse(row.customer), address: JSON.parse(row.address), items: JSON.parse(row.items) }));
    return reply({ orders });
  }
  return null;
}

async function createOrder(context) {
  const { request, env } = context;
  const state = await getState(env);
  if (!state) return reply({ error: 'Catálogo ainda não configurado.' }, 503);
  const body = await request.json().catch(() => ({}));
  const customer = body.customer || {};
  const requestedItems = Array.isArray(body.items) ? body.items : [];
  if (!customer.name?.trim() || !/^\S+@\S+\.\S+$/.test(customer.email || '') || !customer.phone?.trim() || !requestedItems.length) return reply({ error: 'Preencha nome, e-mail, WhatsApp e os itens do pedido.' }, 400);
  let subtotalCents = 0;
  const items = [];
  for (const requested of requestedItems) {
    const product = state.products.find((item) => item.id === requested.id && item.active !== false);
    const quantity = Math.max(1, Math.floor(Number(requested.quantity) || 1));
    if (!product || product.stock < quantity) return reply({ error: `Estoque insuficiente para ${product?.name || requested.id}.` }, 409);
    product.stock -= quantity;
    const priceCents = Math.round(Number(product.price) * 100);
    subtotalCents += priceCents * quantity;
    items.push({ id: product.id, name: product.name, price_cents: priceCents, quantity, size: requested.size || 'Único', color: requested.color || 'Única' });
  }
  const paymentMethod = ['retirada', 'pix', 'cartao'].includes(body.paymentMethod) ? body.paymentMethod : 'retirada';
  const order = {
    id: crypto.randomUUID(), customer, address: body.address || {}, items,
    subtotal_cents: subtotalCents, shipping_cents: 0, total_cents: subtotalCents,
    payment_method: paymentMethod, status: 'received', payment_status: paymentMethod === 'retirada' ? 'pay_on_pickup' : 'pending', shipping_status: 'pending',
    created_at: new Date().toISOString(),
  };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO orders (id, status, payment_status, shipping_status, customer, address, items, subtotal_cents, shipping_cents, total_cents, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(order.id, order.status, order.payment_status, order.shipping_status, JSON.stringify(order.customer), JSON.stringify(order.address), JSON.stringify(order.items), order.subtotal_cents, order.shipping_cents, order.total_cents, order.payment_method, order.created_at),
    env.DB.prepare(`UPDATE app_state SET value = ?, updated_at = datetime('now') WHERE key = ?`).bind(JSON.stringify(state), 'catalog'),
  ]);
  context.waitUntil(sendOrderEmails(env, order).catch((error) => console.error('Falha Brevo:', error)));
  return reply({ order: { id: order.id, status: order.status, payment_status: order.payment_status, payment_method: order.payment_method, total_cents: order.total_cents } }, 201);
}

export async function onRequest(context) {
  try {
    const rawPath = context.params.path;
    const path = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '');
    const auth = await handleAuth(context, path);
    if (auth) return auth;

    if (path.startsWith('files/') && context.request.method === 'GET') {
      const object = await context.env.UPLOADS.get(path.slice(6));
      if (!object) return new Response('Arquivo não encontrado.', { status: 404 });
      const headers = new Headers({ 'cache-control': 'public, max-age=31536000, immutable', etag: object.httpEtag });
      object.writeHttpMetadata(headers);
      return new Response(object.body, { headers });
    }
    if (path === 'catalog' && context.request.method === 'GET') {
      const state = await getState(context.env);
      return reply({ initialized: Boolean(state), store: state?.store || null, products: (state?.products || []).filter((product) => product.active !== false) });
    }
    if (path.startsWith('admin/')) {
      const admin = await handleAdmin(context, path);
      if (admin) return admin;
    }
    if (path === 'orders' && context.request.method === 'POST') return createOrder(context);
    if (path === 'health' && context.request.method === 'GET') return reply({ ok: true, database: 'cloudflare-d1', files: 'cloudflare-r2', email: context.env.BREVO_API_KEY ? 'brevo' : 'disabled' });
    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (error) {
    console.error(error);
    return reply({ error: 'Erro interno do servidor.' }, 500);
  }
}
