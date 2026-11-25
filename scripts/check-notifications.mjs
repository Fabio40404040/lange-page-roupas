import assert from 'node:assert/strict';
import { createReviewFixture } from './check-reviews.mjs';
import { customerEvents } from '../src/lib/notification-events.js';
import { applyDemoOrderUpdates, saveDemoOrderUpdate } from '../src/lib/demo-order-updates.js';
import { demoReviews, saveDemoReview } from '../src/lib/demo-reviews.js';

const { db, env, call, customerCookie, adminCookie } = await createReviewFixture();
const alice = customerCookie('alice'), bob = customerCookie('bob'), owner = adminCookie();
assert.equal((await call('customer/notifications')).status, 401);
assert.equal((await call('admin/notifications', 'GET', null, alice)).status, 401);
let events = (await call('customer/notifications', 'GET', null, alice)).body.events;
assert.equal(events.filter((event) => event.kind === 'review').length, 1);
assert.equal(events.find((event) => event.kind === 'review').orderId, 'paid-order');
assert.ok(!events.some((event) => event.orderId === 'foreign-order'));
const invitation = events.find((event) => event.kind === 'review');
await call('customer/notifications', 'POST', { ids: [invitation.id] }, alice);
events = (await call('customer/notifications', 'GET', null, alice)).body.events;
assert.equal(events.find((event) => event.id === invitation.id).read, true);
await call('customer/notifications', 'POST', { ids: [invitation.id] }, bob);
assert.equal(db.prepare("SELECT count(*) AS count FROM notification_reads WHERE recipient = 'bob@example.com'").get().count, 0);

// Retirada: pronto para retirar não confirma pagamento; pago libera o convite.
db.prepare("UPDATE orders SET payment_method = 'retirada', payment_status = 'pay_on_pickup', shipping_status = 'awaiting_pickup' WHERE id = 'unpaid-order'").run();
env.BREVO_API_KEY = 'local-test-only'; env.BREVO_SENDER_EMAIL = 'test@example.com'; env.STORE_NOTIFICATION_EMAIL = 'store@example.com';
const originalFetch = globalThis.fetch;
const mails = [];
globalThis.fetch = async (url, options) => { assert.equal(url, 'https://api.brevo.com/v3/smtp/email'); mails.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ messageId: 'test-local' }) }; };
try {
  const ready = { status: 'ready_for_pickup', payment_status: 'pay_on_pickup', shipping_status: 'ready_for_pickup' };
  assert.equal((await call('admin/orders/unpaid-order', 'PATCH', ready, owner)).status, 200);
  events = (await call('customer/notifications', 'GET', null, alice)).body.events;
  assert.ok(events.some((event) => event.title.includes('Pronto para retirar')));
  assert.ok(!events.some((event) => event.kind === 'review' && event.orderId === 'unpaid-order'));
  const paid = { status: 'completed', payment_status: 'paid', shipping_status: 'picked_up' };
  assert.equal((await call('admin/orders/unpaid-order', 'PATCH', paid, owner)).status, 200);
  assert.equal(mails.length, 2);
  assert.match(mails[1].textContent, /reviewOrder=unpaid-order/);
  await call('admin/orders/unpaid-order', 'PATCH', paid, owner);
  assert.equal(mails.length, 2, 'Salvar o mesmo estado não repete o email');
  events = (await call('customer/notifications', 'GET', null, alice)).body.events;
  assert.ok(events.some((event) => event.kind === 'review' && event.orderId === 'unpaid-order'));
  const review = { orderId: 'unpaid-order', productId: 'p1', rating: 5, comment: 'Gostei da peça e retirei sem problemas.', publicConsent: true };
  assert.equal((await call('customer/reviews', 'POST', review, alice)).status, 201);
  assert.equal(mails.length, 3);
  assert.equal(mails[2].to[0].email, 'store@example.com');
  events = (await call('customer/notifications', 'GET', null, alice)).body.events;
  assert.ok(!events.some((event) => event.kind === 'review' && event.orderId === 'unpaid-order'));
  assert.ok(events.some((event) => event.kind === 'review-status' && event.orderId === 'unpaid-order'));
  const admin = (await call('admin/notifications', 'GET', null, owner)).body.events;
  assert.ok(admin.some((event) => event.kind === 'moderation'));
  const stored = db.prepare('SELECT * FROM product_reviews').get();
  await call(`admin/reviews/${stored.id}`, 'PATCH', { status: 'approved' }, owner);
  assert.ok(!(await call('admin/notifications', 'GET', null, owner)).body.events.some((event) => event.kind === 'moderation'));
  assert.ok((await call('customer/notifications', 'GET', null, alice)).body.events.some((event) => event.title === 'Sua avaliação foi aprovada'));
  assert.equal((await call('reviews')).body.reviews.length, 1);
  assert.deepEqual((await call('admin/notifications', 'GET', null, adminCookie('demo'))).body.events, []);
} finally { globalThis.fetch = originalFetch; }

// Mesmo fluxo na prévia: avaliação local sem alterar pagamento nem depoimentos reais.
const values = new Map();
globalThis.localStorage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
const order = { id: 'demo-order', customer: { email: 'alice@example.com' }, status: 'received', payment_status: 'pay_on_pickup', items: [{ id: 'p1', name: 'Produto de teste' }], created_at: new Date().toISOString() };
saveDemoOrderUpdate(order, { status: 'completed', payment_status: 'paid', shipping_status: 'picked_up' });
const simulated = applyDemoOrderUpdates([order]);
assert.equal(customerEvents(simulated, []).filter((event) => event.kind === 'review').length, 1);
saveDemoReview({ id: 'demo-review', order_id: order.id, product_id: 'p1', status: 'pending', customer_email: 'alice@example.com', updated_at: new Date().toISOString() });
assert.equal(customerEvents(simulated, demoReviews('alice@example.com')).filter((event) => event.kind === 'review').length, 0);
assert.equal(demoReviews('bob@example.com').length, 0);
assert.equal(order.payment_status, 'pay_on_pickup');
db.close();
console.log('OK: avisos autenticados e isolados, lidos persistentes, retirada, confirmação de pagamento, convite, Brevo simulado sem envio externo, moderação, publicação e demonstração local.');
