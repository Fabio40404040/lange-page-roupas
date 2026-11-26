import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { checkoutQuote } from '../src/lib/checkout-prices.js';
import { createReviewFixture } from './check-reviews.mjs';

const fixture = await createReviewFixture();
const { db, env, call, adminCookie } = fixture;
env.DB.batch = async (statements) => {
  db.exec('BEGIN');
  try { const result = []; for (const statement of statements) result.push(await statement.run()); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
};
const product = { id: 'price-check', name: 'Blusa de teste', price: 79.9, stock: 20, active: true, sizes: ['M'], colors: [{ name: 'Preto' }] };
const state = { store: { name: 'Loja teste', pixKey: 'pix@example.com', pixCity: 'IGUATU' }, products: [product], activity: [], catalogVersion: 3 };
assert.equal((await call('admin/data', 'PUT', state, adminCookie())).status, 200);
const published = (await call('catalog')).body.products;
const basket = [{ id: product.id, name: product.name, price: 159.9, qty: 2, size: 'M', color: 'Preto' }];
const quote = checkoutQuote(basket, published);
assert.equal(quote.changed, true);
assert.equal(quote.totalCents, 15980);
assert.equal(checkoutQuote([{ ...basket[0], price: 79.9 }], published).changed, false);
assert.throws(() => checkoutQuote([{ ...basket[0], qty: 21 }], published), /Estoque/);

const request = { customer: { name: 'Alice Teste', email: 'alice@example.com', phone: '11999999999' }, paymentMethod: 'pix', items: quote.items };
const countBefore = db.prepare('SELECT count(*) AS count FROM orders').get().count;
// Um preço antigo, adulterado ou ausente nunca cria pedido nem baixa estoque.
for (const unitPriceCents of [15990, 1, undefined]) {
  assert.equal((await call('orders', 'POST', { ...request, items: [{ ...quote.items[0], unitPriceCents }] })).status, 409);
}
assert.equal(db.prepare('SELECT count(*) AS count FROM orders').get().count, countBefore);
assert.equal((await call('catalog')).body.products[0].stock, 20);
// O envio externo fica desligado nesta fixture; capture apenas esse aviso esperado.
const originalError = console.error;
const mailWarnings = [];
let created;
try {
  console.error = (...args) => mailWarnings.push(args);
  created = await call('orders', 'POST', request);
} finally { console.error = originalError; }
assert.ok(mailWarnings.every((args) => args[0] === 'Falha Brevo:' && /Configuração da Brevo incompleta/.test(args[1]?.message)));
assert.equal(created.status, 201);
assert.equal(created.body.order.total_cents, quote.totalCents);
assert.equal(created.body.order.pix.key, 'pix@example.com');
const stored = db.prepare('SELECT * FROM orders WHERE id = ?').get(created.body.order.id);
assert.equal(stored.total_cents, 15980);
assert.equal(JSON.parse(stored.items)[0].price_cents, 7990);
const orders = await call('customer/orders', 'GET', null, fixture.customerCookie('alice'));
assert.equal(orders.body.orders.find((order) => order.id === created.body.order.id).total_cents, 15980);

// Execute o checkout real com um DOM mínimo: cancelar preserva o carrinho;
// confirmar envia exatamente o valor mostrado no card de revisão.
let approve = false;
let posts = 0;
let clears = 0;
const nodes = new Map();
const node = (id) => {
  if (nodes.has(id)) return nodes.get(id);
  const element = { value: id.includes('Email') ? 'alice@example.com' : 'Alice Teste', textContent: '', hidden: false,
    children: [], checkValidity: () => true, reportValidity() {}, classList: { add() {} },
    replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); },
    addEventListener(event, listener) { this.listener = listener; },
    querySelector: () => ({}), showModal() {
      if (id === 'checkoutPricesDialog') { this.returnValue = approve ? 'confirm' : 'cancel'; this.listener(); }
    },
  };
  nodes.set(id, element); return element;
};
const context = { isStorePreview: () => false, cart: basket, paymentMethod: 'retirada', checkoutQuote, QRCode: {}, buildPixPayload() {},
  clearCart() { clears++; }, renderCart() {}, closeCart() {},
  localStorage: { setItem() {} },
  document: { getElementById: node, querySelector: node, createElement: () => ({}) },
  fetch: async (path, options) => {
    if (path === '/api/catalog') return { ok: true, json: async () => ({ initialized: true, products: published }) };
    posts++;
    const body = JSON.parse(options.body);
    assert.equal(body.items[0].unitPriceCents, 7990);
    assert.equal(body.paymentMethod, 'retirada');
    return { ok: true, json: async () => ({ order: { ...created.body.order, payment_method: 'retirada' } }) };
  },
};
vm.createContext(context);
const source = (await readFile(new URL('../src/lib/checkout.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
vm.runInContext(source, context);
await context.checkoutOrder();
assert.equal(posts, 0); assert.equal(clears, 0);
assert.match(node('checkoutPricesTotal').textContent, /159,80/);
approve = true;
await context.checkoutOrder();
assert.equal(posts, 1); assert.equal(clears, 1);
assert.match(node('confirmedOrderTotal').textContent, /159,80/);
assert.equal(node('checkoutBtn').disabled, false);
db.close();
console.log('OK: preço publicado do admin ao carrinho, revisão e cancelamento, bloqueio de preço antigo/adulterado, pedido, total Pix e Área da Cliente. Nenhuma alteração em produção.');
