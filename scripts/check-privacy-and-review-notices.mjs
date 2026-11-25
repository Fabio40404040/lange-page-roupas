import assert from 'node:assert/strict';
import { createReviewFixture } from './check-reviews.mjs';
import { PRIVACY_VERSION } from '../src/lib/privacy-policy.js';

const { db, env, call, customerCookie, adminCookie } = await createReviewFixture();
const alice = customerCookie('alice'), bob = customerCookie('bob'), owner = adminCookie();
const input = { orderId: 'paid-order', productId: 'p1', rating: 5, comment: 'Gostei da peça e da experiência de compra.', publicConsent: true };
assert.equal((await call('customer/reviews', 'POST', input, alice)).status, 201);
let review = db.prepare('SELECT * FROM product_reviews').get();
assert.ok(review.public_consent_at);
assert.equal(review.privacy_version, PRIVACY_VERSION);
await call(`admin/reviews/${review.id}`, 'PATCH', { status: 'approved' }, owner);
review = db.prepare('SELECT * FROM product_reviews').get();
let events = (await call('customer/notifications', 'GET', null, alice)).body.events;
assert.ok(!events.some((event) => event.kind === 'review'), 'Uma compra avaliada não gera novo convite');
const notice = events.find((event) => event.kind === 'review-status');
assert.equal(notice.title, 'Sua avaliação foi aprovada');
await call('customer/notifications', 'POST', { action: 'dismiss', ids: [notice.id] }, alice);
await call(`admin/reviews/${review.id}`, 'PATCH', { status: 'approved' }, owner);
const repeated = await call('customer/reviews', 'POST', input, alice);
assert.equal(repeated.body.unchanged, true);
assert.equal(db.prepare('SELECT status, updated_at FROM product_reviews').get().status, 'approved');
assert.equal(db.prepare('SELECT updated_at FROM product_reviews').get().updated_at, review.updated_at);
assert.ok(!(await call('customer/notifications', 'GET', null, alice)).body.events.some((event) => event.id === notice.id), 'Confirmação encerrada não reaparece');
assert.equal((await call('customer/privacy-export')).status, 401);
const exported = (await call('customer/privacy-export', 'GET', null, alice)).body;
assert.equal(exported.profile.email, 'alice@example.com');
assert.ok(!('password_hash' in exported.profile) && !('password_salt' in exported.profile));
assert.equal(exported.orders.length, 3);
assert.ok(!exported.orders.some((order) => order.id === 'foreign-order'));
assert.equal(exported.reviews.length, 1);
assert.equal((await call(`customer/reviews/${review.id}/withdraw`, 'POST', {}, bob)).status, 404);
assert.equal((await call(`customer/reviews/${review.id}/withdraw`, 'POST', {}, alice)).status, 200);
assert.equal((await call('reviews')).body.reviews.length, 0);
assert.equal((await call(`admin/reviews/${review.id}`, 'PATCH', { status: 'approved' }, owner)).status, 403, 'Admin não pode ignorar a retirada da autorização');
assert.ok(db.prepare('SELECT withdrawn_at FROM product_reviews').get().withdrawn_at);
assert.equal((await call('customer/orders', 'GET', null, alice)).body.orders.length, 3);
// Nova autorização é uma decisão explícita da cliente; volta para aprovação.
await call('customer/reviews', 'POST', input, alice);
assert.equal(db.prepare('SELECT status, withdrawn_at FROM product_reviews').get().status, 'pending');
assert.equal(db.prepare('SELECT withdrawn_at FROM product_reviews').get().withdrawn_at, null);
assert.equal((await call('customer/register', 'POST', { email: 'novo@example.com', password: 'teste1234' })).status, 400);
assert.equal((await call('customer/register', 'POST', { privacyAcknowledged: true, privacyVersion: 'antiga' })).status, 400);
env.DB.batch = async (statements) => {
  const results = []; db.exec('BEGIN');
  try { for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
};
env.BREVO_API_KEY = 'local-only'; env.BREVO_SENDER_EMAIL = 'test@example.com';
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, json: async () => ({ messageId: 'local-test-not-sent' }) });
try {
  const registered = await call('customer/register', 'POST', { name: 'Cliente Teste Privacidade', email: 'nova@example.com', phone: '11999999999', password: 'Teste12345', privacyAcknowledged: true, privacyVersion: PRIVACY_VERSION });
  assert.equal(registered.status, 200);
  const acknowledgment = db.prepare("SELECT privacy_version, privacy_acknowledged_at FROM customers WHERE email = 'nova@example.com'").get();
  assert.equal(acknowledgment.privacy_version, PRIVACY_VERSION);
  assert.ok(acknowledgment.privacy_acknowledged_at);
} finally { globalThis.fetch = originalFetch; }
db.close();
console.log('OK: aprovação sem reconfirmação ou avisos repetidos, reenvio idempotente, ciência da política, exportação autenticada sem senhas, retirada e nova autorização de publicação.');
