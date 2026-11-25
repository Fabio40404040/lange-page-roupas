import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { onRequest } from '../functions/api/[[path]].js';

export async function createReviewFixture() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_init.sql', '0002_customer_area.sql', '0003_customer_registration.sql', '0004_product_reviews.sql', '0005_notification_reads.sql', '0006_admin_archives.sql', '0007_notification_dismissals.sql']) db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  const now = new Date().toISOString();
  const customerCookie = (name) => `frs_customer_session=${name}-local-test-token`;
  for (const name of ['alice', 'bob']) {
    db.prepare('INSERT INTO customers (email, name, phone, password_hash, password_salt, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)').run(`${name}@example.com`, `${name === 'alice' ? 'Alice' : 'Bob'} Teste`, '11999999999', 'unused', 'unused', now, now);
    db.prepare('INSERT INTO customer_sessions VALUES (?, ?, ?, ?)').run(createHash('sha256').update(`${name}-local-test-token`).digest('base64url'), `${name}@example.com`, new Date(Date.now() + 3600000).toISOString(), now);
  }
  for (const [id, email, payment, status] of [['paid-order', 'alice@example.com', 'paid', 'completed'], ['unpaid-order', 'alice@example.com', 'pending', 'received'], ['foreign-order', 'bob@example.com', 'paid', 'completed'], ['cancelled-order', 'alice@example.com', 'paid', 'cancelled']]) {
    db.prepare(`INSERT INTO orders (id, customer, customer_email, address, items, subtotal_cents, total_cents, payment_method, payment_status, status) VALUES (?, ?, ?, '{}', ?, 9900, 9900, 'pix', ?, ?)`)
      .run(id, JSON.stringify({ email, name: 'Cliente Teste' }), email, JSON.stringify([{ id: 'p1', name: 'Blusa de teste', quantity: 1, price_cents: 9900 }]), payment, status);
  }
  const env = { ADMIN_EMAIL: 'admin@example.com', ADMIN_SESSION_SECRET: 'reviews-owner-test-secret', DEMO_SESSION_SECRET: 'reviews-demo-test-secret', DB: {
    prepare(sql) { return { bind(...params) { this.params = params; return this; }, async first() { return db.prepare(sql).get(...(this.params || [])) || null; }, async all() { return { results: db.prepare(sql).all(...(this.params || [])) }; }, async run() { const result = db.prepare(sql).run(...(this.params || [])); return { meta: { changes: Number(result.changes) } }; } }; },
  } };
  const adminCookie = (access = 'owner') => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const email = access === 'demo' ? 'demo@frswear.com.br' : env.ADMIN_EMAIL;
    const signature = createHmac('sha256', access === 'demo' ? env.DEMO_SESSION_SECRET : env.ADMIN_SESSION_SECRET).update(`${expires}:${access}:${email}`).digest('base64url');
    return `frs_admin_session=${expires}.${access}.${signature}`;
  };
  const call = async (path, method = 'GET', body, cookie = '') => {
    const response = await onRequest({ request: new Request(`https://reviews.test/api/${path}`, { method, headers: { cookie, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), params: { path: path.split('?')[0].split('/') }, env, waitUntil() {} });
    return { status: response.status, body: await response.json() };
  };
  return { db, env, call, adminCookie, customerCookie };
}

async function check() {
  const { db, call, adminCookie, customerCookie } = await createReviewFixture();
  const customer = customerCookie('alice');
  const review = { orderId: 'paid-order', productId: 'p1', rating: 5, comment: 'A peça chegou muito bonita e serviu perfeitamente.', publicConsent: true, status: 'approved' };
  assert.equal((await call('customer/reviews', 'POST', review)).status, 401);
  assert.equal((await call('customer/reviews', 'POST', { ...review, orderId: 'foreign-order' }, customer)).status, 404);
  assert.equal((await call('customer/reviews', 'POST', { ...review, orderId: 'unpaid-order' }, customer)).status, 403);
  assert.equal((await call('customer/reviews', 'POST', { ...review, orderId: 'cancelled-order' }, customer)).status, 403);
  assert.equal((await call('customer/reviews', 'POST', { ...review, productId: 'unbought' }, customer)).status, 400);
  assert.equal((await call('customer/reviews', 'POST', { ...review, publicConsent: false }, customer)).status, 400);
  assert.equal((await call('customer/reviews', 'POST', { ...review, rating: 6 }, customer)).status, 400);
  assert.equal((await call('customer/reviews', 'POST', review, customer)).status, 201);
  let record = db.prepare('SELECT * FROM product_reviews').get();
  assert.equal(record.status, 'pending');
  assert.equal(record.author, 'Alice T.');
  assert.equal((await call('reviews')).body.reviews.length, 0);
  assert.equal((await call(`admin/reviews/${record.id}`, 'PATCH', { status: 'approved' }, customer)).status, 401);
  assert.equal((await call(`admin/reviews/${record.id}`, 'PATCH', { status: 'approved' }, adminCookie('demo'))).status, 403);
  assert.equal((await call('admin/reviews', 'GET', null, `${adminCookie('demo')}; ${customer}`)).body.total, 1);
  assert.equal((await call('admin/reviews?rating=1', 'GET', null, adminCookie())).body.total, 0);
  assert.equal((await call('admin/reviews?status=pending&rating=5&search=Blusa', 'GET', null, adminCookie())).body.total, 1);
  assert.equal((await call(`admin/reviews/${record.id}`, 'PATCH', { status: 'approved' }, adminCookie())).status, 200);
  const published = (await call('reviews')).body.reviews;
  assert.equal(published.length, 1);
  assert.ok(!('customer_email' in published[0]));
  assert.ok(!('order_id' in published[0]));
  db.prepare("UPDATE orders SET payment_status = 'refunded' WHERE id = 'paid-order'").run();
  assert.equal((await call('reviews')).body.reviews.length, 0);
  db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = 'paid-order'").run();
  await call('customer/reviews', 'POST', { ...review, rating: 2, comment: 'Atualizei minha avaliação depois de usar a peça.' }, customer);
  assert.equal(db.prepare('SELECT count(*) AS count FROM product_reviews').get().count, 1);
  assert.equal((await call('reviews')).body.reviews.length, 0);
  record = db.prepare('SELECT * FROM product_reviews').get();
  assert.equal(record.status, 'pending');
  await call(`admin/reviews/${record.id}`, 'PATCH', { status: 'rejected' }, adminCookie());
  assert.equal((await call('admin/reviews?status=rejected&rating=2', 'GET', null, adminCookie())).body.total, 1);
  const mine = (await call('customer/reviews', 'GET', null, customer)).body;
  assert.deepEqual(mine.eligible.map((item) => item.orderId), ['paid-order']);
  assert.equal(mine.reviews.length, 1);
  console.log('OK: banco e migração, compra paga, autenticação, propriedade do pedido/produto, consentimento, nota, fila de moderação, filtros, publicação, privacidade, edição e reembolso. Nenhuma alteração em produção.');
  db.close();
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await check();
