import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { checkoutQuote } from '../src/lib/checkout-prices.js';
const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
globalThis.window = { dispatchEvent() {} };
const { createDemoPurchase, demoPurchases, demoTimeline, DEMO_DELIVERY_MS } = await import('../src/lib/demo-checkout.js');
const quote = { items: [{ id: 'local-p', name: 'Blusa teste', quantity: 2, unitPriceCents: 3500, size: 'M', color: 'Preto' }], totalCents: 7000 };
const customer = { name: 'Cliente Teste', email: 'teste@example.com', phone: '11999999999' };
const now = Date.now(), shipping = { priceCents: 1990, subtotalCents: 7000, quotedAt: now, company: 'Correios', service: 'PAC', deliveryDays: 5, postalCode: '01001000' };
assert.throws(() => createDemoPurchase({ quote, customer, method: 'pix' }), /Calcule o frete/);
assert.throws(() => createDemoPurchase({ quote, customer, method: 'cartao', shipping: { ...shipping, subtotalCents: 2 } }), /Calcule o frete/);
assert.throws(() => createDemoPurchase({ quote, customer, method: 'cartao', shipping: { ...shipping, quotedAt: now - 900001 } }), /Calcule o frete/);
for (const method of ['pix', 'cartao', 'retirada']) {
  const order = createDemoPurchase({ quote, customer, method, shipping, now });
  assert.equal(order.total_cents, method === 'retirada' ? 7000 : 8990);
  assert.equal(order.demo_purchase, true);
  assert.equal(demoPurchases('other@example.com').length, 0);
  const at = (offset) => demoPurchases(customer.email, now + offset).find((row) => row.id === order.id);
  assert.equal(at(0).status, 'received');
  assert.equal(at(8000).payment_status, method === 'retirada' ? 'pay_on_pickup' : 'paid');
  assert.equal(at(25000).status, method === 'retirada' ? 'ready_for_pickup' : 'preparing');
  if (method !== 'retirada') {
    assert.equal(at(50000).status, 'shipped');
    assert.equal(demoTimeline(at(85000), now + 85000).filter((row) => row.done).length, 5);
    assert.equal(at(0).delivery_days, 5);
  }
  assert.equal(at(DEMO_DELIVERY_MS).status, 'completed');
  assert.equal(at(DEMO_DELIVERY_MS).shipping_status, method === 'retirada' ? 'picked_up' : 'delivered');
  assert.equal(demoTimeline(order, now + DEMO_DELIVERY_MS).every((step) => step.done), true);
}
const source = (await readFile(new URL('../src/lib/checkout.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
for (const method of ['pix', 'cartao', 'retirada']) {
  const nodes = new Map(), calls = [], qrs = [];
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', hidden: false, value: '', checkValidity: () => true, reportValidity() {}, querySelector: () => node('detailsLink'), showModal() { this.open = true; }, classList: { add() {} } });
    return nodes.get(id);
  };
  node('checkoutName').value = customer.name; node('checkoutEmail').value = customer.email; node('checkoutPhone').value = customer.phone;
  const basket = [{ id: 'local-p', price: 35, qty: 2, size: 'M', color: 'Preto' }];
  const context = { document: { getElementById: node, querySelector: node }, cart: basket, paymentMethod: method,
    clearCart() { basket.splice(0); }, closeCart() {}, renderCart() {}, checkoutQuote, createDemoPurchase,
    getProducts: () => [{ id: 'local-p', name: 'Blusa teste', price: 35, stock: 5 }], isStorePreview: () => true,
    getSelectedShipping: () => shipping, buildPixPayload() { throw new Error('Demonstração não pode gerar Pix real'); },
    QRCode: { toDataURL: async (payload) => { qrs.push(payload); return 'data:image/png;base64,demo'; } },
    fetch: async (...args) => { calls.push(args); throw new Error('Demonstração não pode criar pedido real'); },
    localStorage, setTimeout, navigator: {}, console,
  };
  vm.createContext(context); vm.runInContext(source, context); await context.checkoutOrder();
  assert.equal(calls.length, 0, 'Finalização de teste não chama API de pedidos ou pagamentos');
  assert.equal(node('orderDialog').open, true);
  assert.equal(node('cardPaymentDialog').open, undefined, 'Cartão de teste conclui o pedido');
  assert.match(node('detailsLink').href, /preview=demo/);
  assert.equal(basket.length, 0);
  if (method === 'pix') { assert.match(qrs[0], /^DEMONSTRACAO SEM VALOR/); assert.equal(node('confirmedPixCopy').hidden, true); }
}
console.log('OK: Pix/cartão/retirada locais, total com frete, cotação vencida ou divergente bloqueada, prazos e todas as etapas até 2 min; sem pedido real, Pix bancário, e-mail ou alteração de estoque.');
// A área cliente deve mostrar as compras locais sem exigir cadastro real.
const accountSource = (await readFile(new URL('../src/account.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/\ninit\(\);\s*$/, '');
const accountNodes = new Map();
const anode = (selector) => {
  if (!accountNodes.has(selector)) accountNodes.set(selector, { textContent: selector === '#customerEmail' ? customer.email : '', value: 'all', innerHTML: '', hidden: false });
  return accountNodes.get(selector);
};
const account = { document: { querySelector: anode, querySelectorAll: () => [] },
  setupPwa() {}, demoPurchases, demoTimeline, demoBuyer: () => customer,
  applyDemoOrderUpdates: (orders) => orders, setReviewOrders() {},
  filterCustomerOrders: (orders, scope) => orders.filter(order => scope === 'orders' || (scope === 'pickup' ? order.payment_method === 'retirada' : order.payment_method !== 'retirada')),
  isPickupOrder: (order) => order.payment_method === 'retirada', orderStatusLabel: (order) => order.status,
  fetch: async (path) => { assert.equal(path, '/api/auth/session'); return { ok: true, json: async () => ({ access: 'demo' }) }; },
  console, setInterval() {}, clearInterval() {},
};
vm.createContext(account); vm.runInContext(accountSource, account); vm.runInContext('localDemoAccount = true;', account);
await account.loadOrders();
assert.match(anode('#customerOrderList').innerHTML, /DEMONSTRAÇÃO/);
assert.match(anode('#trackingList').innerHTML, /Pagamento aprovado/);
assert.match(anode('#trackingList').innerHTML, /Saiu para entrega/);
assert.match(anode('#trackingList').innerHTML, /Prazo consultado no Sandbox: 5/);
assert.match(anode('#trackingList').innerHTML, /Conclusão da simulação/);
assert.equal(anode('#demoOrderStatusNotice').hidden, false);
console.log('OK: área cliente abre pedidos demonstrativos locais e mostra todas as etapas, frete e horário de conclusão.');
