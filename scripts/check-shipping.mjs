import assert from 'node:assert/strict';
import { createReviewFixture } from './check-reviews.mjs';
import { onRequest } from '../functions/api/[[path]].js';
import { quotePayload, quoteOptions } from '../functions/shipping.js';

const { db, env, call, adminCookie } = await createReviewFixture();
const owner = adminCookie();
const state = { store: { name: 'Loja teste', shippingSandboxEnabled: true, shippingOriginPostalCode: '63500785', shippingDefaultWeight: .3, shippingDefaultWidth: 15, shippingDefaultHeight: 5, shippingDefaultLength: 20 }, products: [{ id: 'shipping-product', name: 'Blusa de teste', price: 12.5, stock: 10, active: true, sizes: ['M'], colors: [{ name: 'Preto' }] }], activity: [], catalogVersion: 3 };
await call('admin/data', 'PUT', state, owner);
const input = { postalCode: '01001-000', items: [{ id: 'shipping-product', quantity: 2, price: .01, weight: .001 }] };
const built = quotePayload(state, input);
assert.equal(built.payload.from.postal_code, '63500785');
assert.equal(built.payload.to.postal_code, '01001000');
assert.equal(built.payload.products[0].insurance_value, 12.5);
assert.equal(built.payload.products[0].weight, .3);
assert.equal(built.subtotalCents, 2500);
assert.equal(built.usesDefaultPackaging, true);
assert.throws(() => quotePayload(state, { ...input, postalCode: '00000000' }), /CEP/);
assert.throws(() => quotePayload(state, { ...input, items: [{ id: 'missing', quantity: 1 }] }), /catálogo/);
assert.throws(() => quotePayload(state, { ...input, items: [{ id: 'shipping-product', quantity: 11 }] }), /catálogo/);
assert.throws(() => quotePayload(state, { ...input, items: [{ id: 'shipping-product', quantity: -1 }] }), /Quantidade/);
const combined = quotePayload(state, { ...input, items: [{ id: 'shipping-product', quantity: 1 }, { id: 'shipping-product', quantity: 2 }] });
assert.equal(combined.payload.products.length, 1); assert.equal(combined.payload.products[0].quantity, 3);
const ownMeasurements = structuredClone(state);
Object.assign(ownMeasurements.products[0], { shippingWeight: .5, shippingWidth: 25, shippingHeight: 8, shippingLength: 30 });
assert.equal(quotePayload(ownMeasurements, input).payload.products[0].weight, .5);
assert.equal(quotePayload(ownMeasurements, input).usesDefaultPackaging, false);
assert.equal((await call('admin/shipping/connect', 'POST', {}, adminCookie('demo'))).status, 403);
assert.equal((await call('admin/shipping/status')).status, 401);
assert.equal((await call('shipping/quote', 'POST', input)).status, 503, 'Não há cotações fictícias quando faltam credenciais');
env.MELHOR_ENVIO_CLIENT_ID = 'test-client'; env.MELHOR_ENVIO_CLIENT_SECRET = 'local-secret-not-real'; env.MELHOR_ENVIO_CONTACT_EMAIL = 'support@example.com';
const originalFetch = globalThis.fetch;
let refreshes = 0, calculations = 0, lastQuote;
globalThis.fetch = async (url, options) => {
  assert.equal(new URL(url).origin, 'https://sandbox.melhorenvio.com.br');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['User-Agent'], 'FRS-Wear (support@example.com)');
  const body = JSON.parse(options.body);
  if (url.endsWith('/oauth/token')) {
    assert.equal(body.client_secret, 'local-secret-not-real');
    if (body.grant_type === 'refresh_token') { assert.equal(body.refresh_token, 'refresh-test'); refreshes++; }
    else assert.equal(body.grant_type, 'authorization_code');
    return { ok: true, status: 200, json: async () => ({ access_token: 'access-test', refresh_token: 'refresh-test', expires_in: 3600 }) };
  }
  assert.equal(new URL(url).pathname, '/api/v2/me/shipment/calculate', 'Nenhuma compra ou geração de etiquetas');
  assert.equal(options.headers.Authorization, 'Bearer access-test');
  assert.equal(body.products[0].insurance_value, 12.5); lastQuote = body; calculations++;
  return { ok: true, status: 200, json: async () => [
    { id: 1, name: 'PAC', company: { name: 'Correios' }, price: '15.00', custom_price: '19.90', delivery_time: 7, custom_delivery_time: 5 },
    { id: 2, name: 'SEDEX', company: { name: 'Correios' }, price: '29.90', delivery_time: 2 },
    { id: 3, name: 'Indisponível', error: 'Trecho não atendido' },
  ] };
};
const callback = async (state) => onRequest({ request: new Request(`https://reviews.test/api/admin/shipping/callback?code=test-code&state=${state}`, { headers: { cookie: owner } }), params: { path: ['admin', 'shipping', 'callback'] }, env, waitUntil() {} });
try {
  const connection = await call('admin/shipping/connect', 'POST', {}, owner);
  const auth = new URL(connection.body.url);
  assert.equal(auth.origin, 'https://sandbox.melhorenvio.com.br');
  assert.equal(auth.searchParams.get('scope'), 'shipping-calculate');
  assert.equal(auth.searchParams.get('redirect_uri'), 'https://reviews.test/api/admin/shipping/callback');
  assert.ok((await callback(auth.searchParams.get('state'))).headers.get('location').endsWith('shipping=connected'));
  assert.ok((await callback(auth.searchParams.get('state'))).headers.get('location').endsWith('shipping=invalid'), 'State só é usado uma vez');
  const encrypted = db.prepare("SELECT value FROM app_state WHERE key = 'shipping:sandbox:tokens'").get().value;
  assert.ok(!encrypted.includes('access-test') && !encrypted.includes('refresh-test'));
  assert.ok(!(JSON.stringify((await call('admin/data', 'GET', null, owner)).body)).includes('access-test'));
  const countBefore = db.prepare('SELECT count(*) AS count FROM orders').get().count;
  const result = await call('shipping/quote', 'POST', input);
  assert.equal(result.status, 200);
  assert.equal(result.body.environment, 'sandbox');
  assert.equal(result.body.options.length, 2);
  assert.equal(result.body.options[0].priceCents, 1990);
  assert.equal(result.body.options[0].deliveryDays, 5);
  assert.equal(result.body.options[0].estimatedTotalCents, 4490);
  assert.equal(db.prepare('SELECT count(*) AS count FROM orders').get().count, countBefore);
  assert.equal((await call('catalog')).body.products[0].stock, 10);
  const expired = JSON.parse(encrypted); expired.expiresAt = Date.now() - 1;
  db.prepare("UPDATE app_state SET value = ? WHERE key = 'shipping:sandbox:tokens'").run(JSON.stringify(expired));
  assert.equal((await call('shipping/quote', 'POST', input)).status, 200);
  assert.equal(refreshes, 1);
  assert.equal(calculations, 2);
  const previewState = structuredClone(state);
  previewState.products[0].id = 'only-in-local-preview';
  previewState.store.shippingOriginPostalCode = '60000000';
  previewState.store.shippingDefaultWeight = .7;
  const previewInput = { postalCode: input.postalCode, items: [{ id: 'only-in-local-preview', quantity: 1 }], state: previewState };
  assert.equal((await call('admin/shipping/preview-quote', 'POST', previewInput)).status, 401);
  state.store.shippingSandboxEnabled = false; await call('admin/data', 'PUT', state, owner);
  const previewResult = await call('admin/shipping/preview-quote', 'POST', previewInput, adminCookie('demo'));
  assert.equal(previewResult.status, 200, 'Demo consulta Sandbox mesmo com o simulador público desativado');
  assert.equal(previewResult.body.subtotalCents, 1250);
  assert.equal(lastQuote.from.postal_code, '60000000');
  assert.equal(lastQuote.products[0].weight, .7);
  const published = (await call('catalog')).body;
  assert.equal(published.products[0].id, 'shipping-product');
  assert.equal(published.store.shippingOriginPostalCode, '63500785');
  assert.equal(published.store.shippingSandboxEnabled, false);
  assert.equal((await call('admin/shipping/connect', 'POST', {}, adminCookie('demo'))).status, 403);
  assert.equal((await call('admin/shipping/preview-quote', 'POST', { ...previewInput, state: {} }, adminCookie('demo'))).status, 400);
  state.store.shippingSandboxEnabled = true; await call('admin/data', 'PUT', state, owner);

  globalThis.fetch = async () => ({ ok: false, status: 429 });
  assert.equal((await call('shipping/quote', 'POST', input)).status, 429);
  assert.ok(!JSON.stringify((await call('admin/shipping/status', 'GET', null, owner)).body).includes('local-secret-not-real'));
  const expiring = JSON.parse(db.prepare("SELECT value FROM app_state WHERE key = 'shipping:sandbox:tokens'").get().value);
  expiring.expiresAt = Date.now() - 1;
  db.prepare("UPDATE app_state SET value = ? WHERE key = 'shipping:sandbox:tokens'").run(JSON.stringify(expiring));
  globalThis.fetch = async () => {
    db.prepare("DELETE FROM app_state WHERE key = 'shipping:sandbox:tokens'").run();
    return { ok: true, status: 200, json: async () => ({ access_token: 'renewed', refresh_token: 'renewed-refresh', expires_in: 3600 }) };
  };
  assert.equal((await call('shipping/quote', 'POST', input)).status, 503);
  assert.equal(db.prepare("SELECT value FROM app_state WHERE key = 'shipping:sandbox:tokens'").get(), undefined, 'Renovação em andamento não recria uma conexão removida');
  await call('admin/shipping/disconnect', 'POST', {}, owner);
  assert.equal((await call('shipping/quote', 'POST', input)).status, 503);
  state.store.shippingSandboxEnabled = false; await call('admin/data', 'PUT', state, owner);
  assert.equal((await call('shipping/quote', 'POST', input)).status, 503);
} finally { globalThis.fetch = originalFetch; db.close(); }
assert.throws(() => quoteOptions({ error: 'invalid' }, 100), /Resposta inválida/);
assert.equal(quoteOptions([{ id: 1, name: 'PAC', company: { name: 'Correios' }, custom_price: '-1', delivery_time: 2 }], 100).length, 0);
console.log('OK: OAuth Sandbox, escopo só de cotação, state descartável, tokens criptografados e renovados, valores do catálogo, embalagem, erros, desconexão e nenhum pedido/etiqueta/pagamento gerado. Chamadas externas simuladas.');
