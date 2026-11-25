import { STORE as DEFAULT_STORE } from '../../src/data/config.js';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../../src/data/products.js';
import { variantProductName } from '../../src/lib/product-variant.js';
import { normalizePixKey, isValidPixKey } from '../../src/lib/pix-key.js';
import { isPickupOrder, pickupUpdate, orderStatusLabel } from '../../src/lib/order-pickup.js';
import { handleReviews } from '../reviews.js';
import { handleNotifications } from '../notifications.js';
import { handleAdminArchives, archiveCondition } from '../admin-archives.js';
import { PRIVACY_VERSION } from '../../src/lib/privacy-policy.js';
import { handlePrivacy } from '../privacy.js';
import { handleShipping } from '../shipping.js';

const COOKIE = 'frs_admin_session';
const CUSTOMER_COOKIE = 'frs_customer_session';
const SESSION_SECONDS = 60 * 60 * 8;
const CUSTOMER_SESSION_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_HASH_ITERATIONS = 100_000; // Limite suportado pelo WebCrypto do Cloudflare Workers.

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
    owner: {
      email: env.ADMIN_EMAIL || (local ? 'admin@frswear.local' : ''),
      password: env.ADMIN_PASSWORD || (local ? 'frs1234' : ''),
    },
    client: {
      email: env.CLIENT_ADMIN_EMAIL || '',
      password: env.CLIENT_ADMIN_PASSWORD || '',
    },
    demo: { email: 'demo@frswear.com.br', password: 'DemoFRS2026!' },
    secret: env.ADMIN_SESSION_SECRET || (local ? 'frs-wear-local-demo-secret-not-for-production' : ''),
    demoSecret: env.DEMO_SESSION_SECRET || 'frs-wear-public-demo-session-v1',
  };
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return encode(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

async function hash(value) {
  return encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hashPassword(password, salt, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${password}:${secret}`), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PASSWORD_HASH_ITERATIONS }, key, 256);
  return encode(bits);
}

function cookieValue(request, name) {
  const match = request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return match?.slice(name.length + 1) || '';
}

async function getAdminSession(request, env) {
  const config = adminConfig(request, env);
  const parts = cookieValue(request, COOKIE).split('.');
  const expiresText = parts[0];
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000)) return null;

  // Compatibilidade com sessões administrativas criadas antes dos níveis de acesso.
  if (parts.length === 2 && config.owner.email && config.secret) {
    return parts[1] === await sign(`${expires}:${config.owner.email}`, config.secret) ? { access: 'owner', email: config.owner.email } : null;
  }

  const [,, signature = ''] = parts;
  const access = parts[1];
  const account = config[access];
  if (!['owner', 'client', 'demo'].includes(access) || !account?.email || !signature) return null;
  const secret = access === 'demo' ? config.demoSecret : config.secret;
  if (!secret) return null;
  return signature === await sign(`${expires}:${access}:${account.email}`, secret) ? { access, email: account.email } : null;
}

async function createAdminSession(request, env, access) {
  const config = adminConfig(request, env);
  const account = config[access];
  const secret = access === 'demo' ? config.demoSecret : config.secret;
  if (!secret || !account?.email) return null;
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${expires}.${access}.${await sign(`${expires}:${access}:${account.email}`, secret)}`;
}

function sessionHeader(request, token, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? ' Secure;' : '';
  return `${COOKIE}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

function customerSessionHeader(request, token, maxAge = CUSTOMER_SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? ' Secure;' : '';
  return `${CUSTOMER_COOKIE}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

async function requireAdmin(context) {
  const session = await getAdminSession(context.request, context.env);
  return session ? { session } : { response: reply({ error: 'Sessão administrativa inválida.' }, 401) };
}

async function getCustomer(context) {
  const token = cookieValue(context.request, CUSTOMER_COOKIE);
  if (!token) return null;
  const tokenHash = await hash(token);
  const session = await context.env.DB.prepare(`SELECT s.email, s.expires_at, c.name, c.phone FROM customer_sessions s
    INNER JOIN customers c ON c.email = s.email AND c.verified = 1 WHERE s.token_hash = ?`).bind(tokenHash).first();
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;
  return { email: session.email, name: session.name, phone: session.phone };
}

async function createCustomerSession(context, email) {
  const token = encode(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const expires = new Date(now.getTime() + CUSTOMER_SESSION_SECONDS * 1000);
  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM customer_sessions WHERE email = ? OR expires_at <= ?').bind(email, now.toISOString()),
    context.env.DB.prepare('INSERT INTO customer_sessions (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(await hash(token), email, expires.toISOString(), now.toISOString()),
  ]);
  return customerSessionHeader(context.request, token);
}

async function requireCustomer(context) {
  const customer = await getCustomer(context);
  return customer ? { customer } : { response: reply({ error: 'Entre na sua conta para continuar.' }, 401) };
}

async function getState(env) {
  const row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind('catalog').first();
  if (!row?.value) return null;
  const state = JSON.parse(row.value);
  if (state.store) state.store.pixKey = normalizePixKey(state.store.pixKey);
  return state;
}

async function saveState(env, state) {
  if (state.store) state.store.pixKey = normalizePixKey(state.store.pixKey);
  await env.DB.prepare(`INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
    .bind('catalog', JSON.stringify(state)).run();
}

function defaultCatalogState() {
  return {
    store: JSON.parse(JSON.stringify(DEFAULT_STORE)),
    products: JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)),
    activity: [],
    catalogVersion: 3,
  };
}

function parseOrder(row) {
  return { ...row, customer: JSON.parse(row.customer), address: JSON.parse(row.address), items: JSON.parse(row.items) };
}

async function sendBrevoEmail(env, { to, subject, htmlContent, textContent, tags }) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) throw new Error('Configuração da Brevo incompleta no Cloudflare.');
  if (!to?.length) throw new Error('Destinatário do e-mail não informado.');
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: env.BREVO_SENDER_NAME || 'FRS-Wear', email: env.BREVO_SENDER_EMAIL },
      to,
      subject,
      htmlContent,
      textContent,
      replyTo: { name: env.BREVO_SENDER_NAME || 'FRS-Wear', email: env.BREVO_SENDER_EMAIL },
      tags,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Brevo respondeu ${response.status}: ${data.message || data.code || 'falha no envio'}`);
  if (!data.messageId && !data.messageIds?.length) throw new Error('A Brevo não confirmou o recebimento da mensagem.');
  return data;
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

async function sendCustomerCode(env, email, code) {
  const html = `<h1>Confirme seu cadastro</h1><p>Use o código abaixo para confirmar seu e-mail e ativar sua conta FRS-Wear:</p><p style="font-size:32px;letter-spacing:8px"><strong>${code}</strong></p><p>Ele expira em 10 minutos. Se você não criou esta conta, ignore este e-mail.</p>`;
  return sendBrevoEmail(env, {
    to: [{ email }],
    subject: `Confirme seu cadastro — ${env.BREVO_SENDER_NAME || 'FRS-Wear'}`,
    htmlContent: html,
    textContent: `Seu código de confirmação FRS-Wear é ${code}. Ele expira em 10 minutos.`,
    tags: ['login-cliente'],
  });
}

async function createDeliveryToken(email, secret) {
  const expires = Math.floor(Date.now() / 1000) + 10 * 60;
  return `${expires}.${await sign(`${email}:${expires}:brevo-delivery`, secret)}`;
}

async function validateDeliveryToken(email, token, secret) {
  const [expiresText, signature = ''] = String(token || '').split('.');
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !signature) return false;
  return signature === await sign(`${email}:${expires}:brevo-delivery`, secret);
}

async function getBrevoDeliveryEvent(env, email) {
  if (!env.BREVO_API_KEY) throw new Error('A chave da Brevo não está configurada.');
  const url = new URL('https://api.brevo.com/v3/smtp/statistics/events');
  url.searchParams.set('email', email);
  url.searchParams.set('days', '1');
  url.searchParams.set('limit', '20');
  url.searchParams.set('sort', 'desc');
  const response = await fetch(url, { headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Não foi possível consultar a entrega na Brevo (${response.status}).`);
  const event = (data.events || []).find((item) => item.tag === 'login-cliente' || item.tags?.includes?.('login-cliente')) || data.events?.[0];
  return event ? { event: event.event, reason: event.reason || '', date: event.date || '' } : { event: 'pending', reason: '', date: '' };
}

async function handleCustomerAuth(context, path) {
  const { request, env } = context;
  if (path === 'customer/session' && request.method === 'GET') {
    const customer = await getCustomer(context);
    return customer ? reply({ authenticated: true, customer }) : reply({ authenticated: false }, 401);
  }
  if (path === 'customer/logout' && request.method === 'POST') {
    const token = cookieValue(request, CUSTOMER_COOKIE);
    if (token) await env.DB.prepare('DELETE FROM customer_sessions WHERE token_hash = ?').bind(await hash(token)).run();
    return reply({ ok: true }, 200, { 'set-cookie': customerSessionHeader(request, '', 0) });
  }
  if (path === 'customer/register' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/[^0-9+]/g, '');
    const password = String(body.password || '');
    if (body.privacyAcknowledged !== true || body.privacyVersion !== PRIVACY_VERSION) return reply({ error: 'Leia a Política de Privacidade e confirme que está ciente antes de criar sua conta.' }, 400);
    if (name.length < 3) return reply({ error: 'Digite seu nome completo.' }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return reply({ error: 'Digite um e-mail válido.' }, 400);
    if (phone.replace(/\D/g, '').length < 10) return reply({ error: 'Digite um telefone válido.' }, 400);
    if (password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return reply({ error: 'A senha deve ter pelo menos 8 caracteres, com letras e números.' }, 400);
    const local = isLocal(request);
    const customer = await env.DB.prepare('SELECT verified FROM customers WHERE email = ?').bind(email).first();
    if (customer?.verified) return reply({ error: 'Já existe uma conta com este e-mail. Use a opção Entrar.' }, 409);
    const secret = env.CUSTOMER_AUTH_SECRET || env.ADMIN_SESSION_SECRET || (local ? 'frs-wear-local-customer-secret' : '');
    if (!secret) return reply({ error: 'Cadastro de clientes ainda não configurado.' }, 503);
    const salt = encode(crypto.getRandomValues(new Uint8Array(18)));
    const passwordHash = await hashPassword(password, salt, secret);
    const code = local && !env.BREVO_API_KEY ? '123456' : String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60_000);
    const codeHash = await sign(`${email}:${code}`, secret);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO customers (email, name, phone, password_hash, password_salt, verified, postal_code, street, address_number, complement, neighborhood, city, state, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone, password_hash = excluded.password_hash, password_salt = excluded.password_salt,
        postal_code = excluded.postal_code, street = excluded.street, address_number = excluded.address_number, complement = excluded.complement,
        neighborhood = excluded.neighborhood, city = excluded.city, state = excluded.state, updated_at = excluded.updated_at WHERE customers.verified = 0`)
        .bind(email, name, phone, passwordHash, salt, String(body.postal_code || '').trim(), String(body.street || '').trim(), String(body.address_number || '').trim(), String(body.complement || '').trim(), String(body.neighborhood || '').trim(), String(body.city || '').trim(), String(body.state || '').trim().toUpperCase().slice(0, 2), now.toISOString(), now.toISOString()),
      env.DB.prepare(`INSERT INTO customer_login_codes (email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`)
        .bind(email, codeHash, expires.toISOString(), now.toISOString()),
    ]);
    await env.DB.prepare('UPDATE customers SET privacy_version = ?, privacy_acknowledged_at = ? WHERE email = ? AND verified = 0').bind(PRIVACY_VERSION, now.toISOString(), email).run();
    if (!local || env.BREVO_API_KEY) {
      try { await sendCustomerCode(env, email, code); }
      catch (error) {
        console.error('Falha ao enviar código:', error);
        await env.DB.batch([env.DB.prepare('DELETE FROM customer_login_codes WHERE email = ?').bind(email), env.DB.prepare('DELETE FROM customers WHERE email = ? AND verified = 0').bind(email)]);
        return reply({ error: 'Não foi possível enviar o código agora. Tente novamente.' }, 502);
      }
    }
    return reply({
      ok: true,
      expiresIn: 600,
      deliveryToken: await createDeliveryToken(email, secret),
      ...(local && !env.BREVO_API_KEY ? { devCode: code } : {}),
    });
  }
  if (path === 'customer/resend-code' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return reply({ error: 'Digite um e-mail válido.' }, 400);
    const local = isLocal(request);
    const secret = env.CUSTOMER_AUTH_SECRET || env.ADMIN_SESSION_SECRET || (local ? 'frs-wear-local-customer-secret' : '');
    if (!secret) return reply({ error: 'Cadastro de clientes ainda não configurado.' }, 503);
    const customer = await env.DB.prepare('SELECT verified FROM customers WHERE email = ?').bind(email).first();
    if (!customer || customer.verified) return reply({ error: 'Cadastro pendente não encontrado. Volte e preencha o cadastro novamente.' }, 404);
    const previous = await env.DB.prepare('SELECT created_at FROM customer_login_codes WHERE email = ?').bind(email).first();
    if (previous && Date.now() - new Date(previous.created_at).getTime() < 30_000) return reply({ error: 'Aguarde 30 segundos antes de pedir outro código.' }, 429);

    const code = local && !env.BREVO_API_KEY ? '123456' : String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60_000);
    await env.DB.prepare(`INSERT INTO customer_login_codes (email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)
      ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`)
      .bind(email, await sign(`${email}:${code}`, secret), expires.toISOString(), now.toISOString()).run();
    if (!local || env.BREVO_API_KEY) {
      try { await sendCustomerCode(env, email, code); }
      catch (error) {
        console.error('Falha ao reenviar código:', error);
        await env.DB.prepare('DELETE FROM customer_login_codes WHERE email = ?').bind(email).run();
        return reply({ error: 'A Brevo não conseguiu reenviar o código. Tente novamente em alguns minutos.' }, 502);
      }
    }
    return reply({ ok: true, expiresIn: 600, deliveryToken: await createDeliveryToken(email, secret), ...(local && !env.BREVO_API_KEY ? { devCode: code } : {}) });
  }
  if (path === 'customer/code-status' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const secret = env.CUSTOMER_AUTH_SECRET || env.ADMIN_SESSION_SECRET || (isLocal(request) ? 'frs-wear-local-customer-secret' : '');
    if (!secret || !await validateDeliveryToken(email, body.deliveryToken, secret)) return reply({ error: 'Consulta de entrega expirada. Solicite um novo código.' }, 401);
    if (isLocal(request) && !env.BREVO_API_KEY) return reply({ event: 'delivered', reason: 'Ambiente local' });
    try { return reply(await getBrevoDeliveryEvent(env, email)); }
    catch (error) {
      console.error('Falha ao consultar entrega Brevo:', error);
      return reply({ error: error.message }, 502);
    }
  }
  if (path === 'customer/login' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const customer = await env.DB.prepare('SELECT email, name, phone, password_hash, password_salt, verified FROM customers WHERE email = ?').bind(email).first();
    const local = isLocal(request);
    const secret = env.CUSTOMER_AUTH_SECRET || env.ADMIN_SESSION_SECRET || (local ? 'frs-wear-local-customer-secret' : '');
    if (!customer || !customer.verified || !secret || customer.password_hash !== await hashPassword(password, customer.password_salt, secret)) return reply({ error: 'E-mail ou senha incorretos.' }, 401);
    return reply({ ok: true, customer: { email: customer.email, name: customer.name, phone: customer.phone } }, 200, { 'set-cookie': await createCustomerSession(context, email) });
  }
  if (path === 'customer/verify-code' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').replace(/\D/g, '');
    const record = await env.DB.prepare(`SELECT l.*, c.name, c.phone FROM customer_login_codes l INNER JOIN customers c ON c.email = l.email AND c.verified = 0 WHERE l.email = ?`).bind(email).first();
    const local = isLocal(request);
    const secret = env.CUSTOMER_AUTH_SECRET || env.ADMIN_SESSION_SECRET || (local ? 'frs-wear-local-customer-secret' : '');
    const valid = record && record.attempts < 5 && new Date(record.expires_at).getTime() > Date.now() && code.length === 6 && record.code_hash === await sign(`${email}:${code}`, secret);
    if (!valid) {
      if (record) await env.DB.prepare('UPDATE customer_login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
      return reply({ error: 'Código inválido ou expirado.' }, 401);
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM customer_login_codes WHERE email = ?').bind(email),
      env.DB.prepare('UPDATE customers SET verified = 1, updated_at = ? WHERE email = ?').bind(new Date().toISOString(), email),
    ]);
    return reply({ ok: true, customer: { email, name: record.name, phone: record.phone } }, 200, { 'set-cookie': await createCustomerSession(context, email) });
  }
  return null;
}

async function handleAuth(context, path) {
  const { request, env } = context;
  if (path === 'auth/session' && request.method === 'GET') {
    const session = await getAdminSession(request, env);
    return session ? reply({ authenticated: true, access: session.access, demo: session.access === 'demo' }) : reply({ authenticated: false }, 401);
  }
  if (path === 'auth/login' && request.method === 'POST') {
    const config = adminConfig(request, env);
    const body = await request.json().catch(() => ({}));
    const access = ['owner', 'client', 'demo'].find((type) => config[type].email && body.email === config[type].email && body.password === config[type].password);
    if (!access) return reply({ error: 'E-mail ou senha incorretos.' }, 401);
    const token = await createAdminSession(request, env, access);
    if (!token) return reply({ error: 'A chave da sessão administrativa ainda não foi configurada no Cloudflare.' }, 503);
    return reply({ ok: true, access, demo: access === 'demo' }, 200, { 'set-cookie': sessionHeader(request, token) });
  }
  if (path === 'auth/logout' && request.method === 'POST') {
    return reply({ ok: true }, 200, { 'set-cookie': sessionHeader(request, '', 0) });
  }
  return null;
}

async function handleAdmin(context, path) {
  const access = await requireAdmin(context);
  if (access.response) return access.response;
  if (access.session.access === 'demo') return reply({ error: 'No modo demonstração, os dados ficam somente no navegador.' }, 403);
  const { request, env } = context;
  if (path === 'admin/data' && request.method === 'GET') {
    const state = await getState(env);
    return reply({ initialized: Boolean(state), ...(state || {}) });
  }
  if (path === 'admin/data' && request.method === 'PUT') {
    const state = await request.json().catch(() => null);
    if (!state?.store || !Array.isArray(state.products) || state.products.length > 500) return reply({ error: 'Catálogo inválido.' }, 400);
    if (normalizePixKey(state.store.pixKey) && !isValidPixKey(state.store.pixKey)) return reply({ error: 'Chave Pix inválida. Use uma chave aleatória, e-mail, CPF/CNPJ ou celular com +55.' }, 400);
    await saveState(env, { store: state.store, products: state.products, activity: (state.activity || []).slice(0, 50), catalogVersion: Math.max(0, Number(state.catalogVersion) || 0) });
    return reply({ ok: true, updatedAt: new Date().toISOString() });
  }
  if (path === 'admin/upload' && request.method === 'POST') {
    if (!env.UPLOADS) return reply({ error: 'O armazenamento de imagens não está configurado. Configure o bucket R2 com o vínculo UPLOADS no Cloudflare ou use uma URL de imagem.' }, 503);
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File) || !['image/webp', 'image/png', 'image/jpeg'].includes(image.type) || image.size > 2_500_000) return reply({ error: 'Imagem inválida ou maior que 2,5 MB.' }, 400);
    const extension = image.type === 'image/png' ? 'png' : image.type === 'image/jpeg' ? 'jpg' : 'webp';
    const key = `images/${crypto.randomUUID()}.${extension}`;
    await env.UPLOADS.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
    return reply({ ok: true, url: `${new URL(request.url).origin}/api/files/${key}` }, 201);
  }
  if (path === 'admin/orders' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT * FROM orders WHERE ${archiveCondition(new URL(request.url).searchParams.get('archive'))} ORDER BY created_at DESC LIMIT 100`).all();
    const orders = result.results.map(parseOrder);
    return reply({ orders });
  }
  const orderMatch = path.match(/^admin\/orders\/([^/]+)$/);
  if (orderMatch && request.method === 'PATCH') {
    let body = await request.json().catch(() => ({}));
    const current = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderMatch[1]).first();
    if (!current) return reply({ error: 'Pedido não encontrado.' }, 404);
    try { body = pickupUpdate(current, body); } catch (error) { return reply({ error: error.message }, 400); }
    if (isPickupOrder(current) && body.status === 'completed' && body.payment_status !== 'paid') return reply({ error: 'Confirme o pagamento antes de marcar o pedido como retirado.' }, 400);
    const allowedStatus = ['received', 'preparing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled'];
    const allowedPayment = ['pending', 'paid', 'pay_on_pickup', 'refunded'];
    const allowedShipping = ['pending', 'preparing', 'shipped', 'delivered', 'awaiting_pickup', 'ready_for_pickup', 'picked_up', 'cancelled'];
    if (!allowedStatus.includes(body.status) || !allowedPayment.includes(body.payment_status) || !allowedShipping.includes(body.shipping_status)) return reply({ error: 'Status do pedido inválido.' }, 400);
    const result = await env.DB.prepare(`UPDATE orders SET status = ?, payment_status = ?, shipping_status = ?, tracking_code = ?, shipping_provider = ?, shipping_service = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(body.status, body.payment_status, body.shipping_status, String(body.tracking_code || '').trim() || null, String(body.shipping_provider || '').trim() || null, String(body.shipping_service || '').trim() || null, orderMatch[1]).run();
    if (!result.meta.changes) return reply({ error: 'Pedido não encontrado.' }, 404);
    if (current.status !== body.status || current.payment_status !== body.payment_status) {
      const customer = JSON.parse(current.customer);
      const paid = body.payment_status === 'paid' && current.payment_status !== 'paid' && body.status !== 'cancelled';
      const url = new URL('/conta', request.url);
      if (paid) url.searchParams.set('reviewOrder', orderMatch[1]);
      const message = paid ? 'Pagamento confirmado. Conte como foi sua compra: clique abaixo para avaliar os produtos.' : `O status do seu pedido foi atualizado para ${orderStatusLabel({ ...current, ...body })}.`;
      context.waitUntil(sendBrevoEmail(env, { to: [{ email: customer.email, name: customer.name }], subject: paid ? 'Pagamento confirmado — avalie sua compra' : 'Seu pedido foi atualizado', htmlContent: `<p>${escapeHtml(message)}</p><p><a href="${escapeHtml(url.href)}">${paid ? 'Avaliar minha compra' : 'Acompanhar pedido'}</a></p>`, textContent: `${message}\n${url.href}`, tags: ['order-update'] }).catch((error) => console.error('Falha Brevo:', error)));
    }
    return reply({ ok: true });
  }
  return null;
}

async function handleCustomerArea(context, path) {
  const access = await requireCustomer(context);
  if (access.response) return access.response;
  const email = access.customer.email;
  if (path === 'customer/profile' && context.request.method === 'GET') {
    const profile = await context.env.DB.prepare(`SELECT email, name, phone, postal_code, street, address_number, complement, neighborhood, city, state, created_at FROM customers WHERE email = ? AND verified = 1`).bind(email).first();
    return profile ? reply({ profile }) : reply({ error: 'Cadastro não encontrado.' }, 404);
  }
  if (path === 'customer/profile' && context.request.method === 'PATCH') {
    const body = await context.request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/[^0-9+]/g, '');
    if (name.length < 3 || phone.replace(/\D/g, '').length < 10) return reply({ error: 'Confira seu nome e telefone.' }, 400);
    await context.env.DB.prepare(`UPDATE customers SET name = ?, phone = ?, postal_code = ?, street = ?, address_number = ?, complement = ?, neighborhood = ?, city = ?, state = ?, updated_at = ? WHERE email = ?`)
      .bind(name, phone, String(body.postal_code || '').trim(), String(body.street || '').trim(), String(body.address_number || '').trim(), String(body.complement || '').trim(), String(body.neighborhood || '').trim(), String(body.city || '').trim(), String(body.state || '').trim().toUpperCase().slice(0, 2), new Date().toISOString(), email).run();
    return reply({ ok: true });
  }
  if (path === 'customer/orders' && context.request.method === 'GET') {
    const result = await context.env.DB.prepare(`SELECT * FROM orders WHERE lower(customer_email) = ? OR lower(json_extract(customer, '$.email')) = ? ORDER BY created_at DESC LIMIT 100`)
      .bind(email, email).all();
    return reply({ orders: result.results.map(parseOrder) });
  }
  const match = path.match(/^customer\/orders\/([^/]+)$/);
  if (match && context.request.method === 'GET') {
    const row = await context.env.DB.prepare(`SELECT * FROM orders WHERE id = ? AND (lower(customer_email) = ? OR lower(json_extract(customer, '$.email')) = ?)`)
      .bind(match[1], email, email).first();
    return row ? reply({ order: parseOrder(row) }) : reply({ error: 'Pedido não encontrado.' }, 404);
  }
  return null;
}

async function createOrder(context) {
  const { request, env } = context;
  const state = await getState(env) || defaultCatalogState();
  const body = await request.json().catch(() => ({}));
  const customer = body.customer || {};
  const requestedItems = Array.isArray(body.items) ? body.items : [];
  if (!customer.name?.trim() || !/^\S+@\S+\.\S+$/.test(customer.email || '') || !customer.phone?.trim() || !requestedItems.length) return reply({ error: 'Preencha nome, e-mail, WhatsApp e os itens do pedido.' }, 400);
  const paymentMethod = ['retirada', 'pix', 'cartao'].includes(body.paymentMethod) ? body.paymentMethod : 'retirada';
  const configuredPixKey = normalizePixKey(state.store?.pixKey);
  if (paymentMethod === 'pix' && !isValidPixKey(configuredPixKey)) return reply({ error: 'O Pix ainda não foi configurado pela loja com uma chave válida.' }, 400);
  let subtotalCents = 0;
  const items = [];
  for (const requested of requestedItems) {
    const product = state.products.find((item) => item.id === requested.id && item.active !== false);
    const quantity = Math.max(1, Math.floor(Number(requested.quantity) || 1));
    if (!product || product.stock < quantity) return reply({ error: `Estoque insuficiente para ${product?.name || requested.id}.` }, 409);
    product.stock -= quantity;
    const priceCents = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(priceCents) || priceCents < 0) return reply({ error: 'Preço inválido no catálogo. Entre em contato com a loja.' }, 400);
    if (!Number.isSafeInteger(requested.unitPriceCents)) return reply({ error: 'Atualize a página para conferir os preços antes de finalizar a compra.' }, 409);
    if (requested.unitPriceCents !== priceCents) return reply({ error: 'O preço de um produto foi atualizado. Nenhum pedido foi criado. Clique novamente em finalizar para conferir os novos valores.' }, 409);
    subtotalCents += priceCents * quantity;
    const variant = product.colors?.find((color) => color.name === requested.color);
    items.push({ id: product.id, name: variantProductName(product, variant), price_cents: priceCents, quantity, size: requested.size || 'Único', color: requested.color || 'Única' });
  }
  const order = {
    id: crypto.randomUUID(), customer, address: body.address || {}, items,
    subtotal_cents: subtotalCents, shipping_cents: 0, total_cents: subtotalCents,
    payment_method: paymentMethod, status: 'received', payment_status: paymentMethod === 'retirada' ? 'pay_on_pickup' : 'pending', shipping_status: paymentMethod === 'retirada' ? 'awaiting_pickup' : 'pending',
    created_at: new Date().toISOString(),
  };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO orders (id, status, payment_status, shipping_status, customer, customer_email, address, items, subtotal_cents, shipping_cents, total_cents, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(order.id, order.status, order.payment_status, order.shipping_status, JSON.stringify(order.customer), String(order.customer.email).toLowerCase(), JSON.stringify(order.address), JSON.stringify(order.items), order.subtotal_cents, order.shipping_cents, order.total_cents, order.payment_method, order.created_at),
    env.DB.prepare(`INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).bind('catalog', JSON.stringify(state)),
  ]);
  context.waitUntil(sendOrderEmails(env, order).catch((error) => console.error('Falha Brevo:', error)));
  return reply({ order: { id: order.id, status: order.status, payment_status: order.payment_status, payment_method: order.payment_method, total_cents: order.total_cents,
    ...(paymentMethod === 'pix' ? { pix: { key: configuredPixKey, name: state.store.name, city: state.store.pixCity } } : {}),
  } }, 201);
}

export async function onRequest(context) {
  try {
    const rawPath = context.params.path;
    const path = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '');
    const auth = await handleAuth(context, path);
    if (auth) return auth;
    const customerAuth = await handleCustomerAuth(context, path);
    if (customerAuth) return customerAuth;
    const shipping = await handleShipping(context, path, { reply, requireAdmin, getState, defaultCatalogState });
    if (shipping) return shipping;
    const privacy = await handlePrivacy(context, path, { reply, requireCustomer });
    if (privacy) return privacy;
    const archives = await handleAdminArchives(context, path, { reply, requireAdmin });
    if (archives) return archives;
    const notifications = await handleNotifications(context, path, { reply, requireCustomer, requireAdmin });
    if (notifications) return notifications;
    const reviews = await handleReviews(context, path, { reply, requireCustomer, requireAdmin, sendBrevoEmail });
    if (reviews) return reviews;

    if (path.startsWith('files/') && context.request.method === 'GET') {
      const object = await context.env.UPLOADS.get(path.slice(6));
      if (!object) return new Response('Arquivo não encontrado.', { status: 404 });
      const headers = new Headers({ 'cache-control': 'public, max-age=31536000, immutable', etag: object.httpEtag });
      object.writeHttpMetadata(headers);
      return new Response(object.body, { headers });
    }
    if (path === 'catalog' && context.request.method === 'GET') {
      const state = await getState(context.env);
      const catalog = state || defaultCatalogState();
      return reply({ initialized: Boolean(state), store: catalog.store, products: catalog.products.filter((product) => product.active !== false), catalogVersion: catalog.catalogVersion || 0 });
    }
    if (path.startsWith('admin/')) {
      const admin = await handleAdmin(context, path);
      if (admin) return admin;
    }
    if (path.startsWith('customer/')) {
      const customer = await handleCustomerArea(context, path);
      if (customer) return customer;
    }
    if (path === 'orders' && context.request.method === 'POST') return createOrder(context);
    if (path === 'health' && context.request.method === 'GET') return reply({ ok: true, database: 'cloudflare-d1', files: 'cloudflare-r2', email: context.env.BREVO_API_KEY ? 'brevo' : 'disabled' });
    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (error) {
    console.error(error);
    return reply({ error: 'Erro interno do servidor.' }, 500);
  }
}
