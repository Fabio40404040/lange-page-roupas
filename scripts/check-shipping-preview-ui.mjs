import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = (await readFile(new URL('../src/lib/shipping-ui.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
for (const mode of ['public', 'preview-local', 'preview-stale']) {
  const preview = mode !== 'public', stale = mode === 'preview-stale';
  const nodes = new Map(), requests = [];
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, { value: '01001-000', textContent: '', handlers: {}, addEventListener(key, handler) { this.handlers[key] = handler; }, replaceChildren() {}, appendChild() {}, setCustomValidity() {}, reportValidity() {} });
    return nodes.get(id);
  };
  const store = { shippingSandboxEnabled: !stale, shippingOriginPostalCode: '63500785' };
  const products = [{ id: 'local-product', price: 32, stock: 3 }, { id: 'not-in-cart', price: 50 }];
  const context = { document: { getElementById: node }, cart: [{ id: 'local-product', qty: 2, price: 32 }], formatPrice: String, getProducts: () => products, getStore: () => store, isStorePreview: () => preview, fetch: async (path, options) => {
    if (path === '/api/catalog') return { ok: true, json: async () => ({ store: { shippingSandboxEnabled: true, shippingOriginPostalCode: '60000000' } }) };
    requests.push({ path, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ options: [], message: 'Nenhum serviço para este trecho.' }) };
  } };
  vm.createContext(context); vm.runInContext(source, context); await context.bindShippingSimulator();
  assert.equal(node('shippingTestPanel').hidden, false, 'Frete publicado aparece mesmo com configuração demo antiga');
  await node('calculateShippingTest').handlers.click();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, preview ? '/api/admin/shipping/preview-quote' : '/api/shipping/quote');
  assert.deepEqual(requests[0].body.items, [{ id: 'local-product', quantity: 2 }]);
  if (preview) { assert.deepEqual(requests[0].body.state.store, stale ? { shippingSandboxEnabled: true, shippingOriginPostalCode: '60000000' } : store);
    assert.equal(store.shippingSandboxEnabled, !stale, 'Não grava configuração publicada na prévia'); assert.deepEqual(requests[0].body.state.products, [products[0]]); }
  else assert.equal(requests[0].body.state, undefined);
  assert.equal(node('calculateShippingTest').disabled, false);
}
console.log('OK: carrinho da prévia envia configuração local e somente produtos selecionados; loja pública não envia catálogo local.');
