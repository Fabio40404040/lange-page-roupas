import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { onRequest } from '../functions/api/[[path]].js';
import { variantTag, variantProductName, noveltyVariants } from '../src/lib/product-variant.js';
import { resolveStorefrontDemo } from '../src/lib/storefront-mode.js';

const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
};
const adminStorage = storage();
const visitorStorage = storage();
globalThis.localStorage = adminStorage;
globalThis.window = { dispatchEvent() {}, scrollTo() {}, scrollX: 0, scrollY: 0 };
globalThis.CustomEvent = class {};
let persisted = null;
let writes = 0;
const DB = { prepare(sql) {
  return { bind(...args) { this.args = args; return this; }, async first() { return persisted ? { value: persisted } : null; }, async run() {
    assert.match(sql, /INSERT INTO app_state/);
    persisted = this.args[1]; writes += 1;
    return { meta: { changes: 1 } };
  } };
} };
const email = 'admin@example.com';
const secret = 'catalog-test-only-secret';
const expires = Math.floor(Date.now() / 1000) + 3600;
const signature = createHmac('sha256', secret).update(`${expires}:owner:${email}`).digest('base64url');
const cookie = `frs_admin_session=${expires}.owner.${signature}`;
const backendFetch = async (path, options = {}) => onRequest({
  request: new Request(`https://catalog-test.example${path}`, { ...options, headers: { ...options.headers, cookie } }),
  params: { path: path.replace(/^\/api\//, '').split('/') },
  env: { DB, ADMIN_EMAIL: email, ADMIN_SESSION_SECRET: secret },
});
globalThis.fetch = backendFetch;
const admin = await import('../src/lib/store.js?admin-sync-check');
admin.configureStoreMode({ localOnly: false });
const originals = admin.getProducts();
for (const [index, product] of originals.entries()) {
  admin.saveProduct({ ...product, name: `Produto sincronizado ${index}`, price: index + 1.25,
    stock: index + 4, sizes: ['PP', 'GG'], tag: index % 2 ? 'mais vendido' : 'novo',
    colors: [
      { name: 'Azul', hex: '#0000ff', image: `/azul-${index}.webp` },
      { name: 'Verde', hex: '#008800', image: `/verde-${index}.webp`, tag: 'novo', productName: `Variação ${index}` },
    ],
  });
}
await admin.syncStore();
assert.equal(writes, 1);
globalThis.localStorage = visitorStorage;
const visitor = await import('../src/lib/store.js?visitor-sync-check');
assert.equal(await visitor.hydrateStore(), true);
assert.equal(visitor.getProducts().length, originals.length);

// Execute a renderização real do catálogo com um DOM mínimo de teste.
class Element {
  constructor() { this.children = []; this.attributes = {}; this.listeners = {}; this.style = { setProperty() {} }; this.dataset = {}; this.className = ''; this.classList = { add: (...names) => { this.className += ` ${names.join(' ')}`; }, toggle: (name, enabled) => { const classes = this.className.split(' ').filter(Boolean).filter((item) => item !== name); if (enabled) classes.push(name); this.className = classes.join(' '); } }; }
  set innerHTML(value) { this.children = []; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(event, listener) { this.listeners[event] = listener; }
  querySelectorAll(selector) { return this.children.flatMap((child) => [...(child.className.split(' ').includes(selector.slice(1)) ? [child] : []), ...child.querySelectorAll(selector)]); }
}
const wrap = new Element();
const context = { getProducts: visitor.getProducts, variantTag, variantProductName,
  document: { getElementById: () => wrap, createElement: () => new Element() },
  Image: class { set src(value) { this.onload(); } },
  window, requestAnimationFrame: (callback) => callback(),
  formatPrice: (price) => Number(price).toFixed(2), addToCart() {}, renderCart() {}, openCart() {},
};
const catalogSource = (await readFile(new URL('../src/lib/catalog.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
vm.createContext(context); vm.runInContext(catalogSource, context);
context.renderCatalog();
assert.equal(wrap.children.length, originals.length);
for (const [index, card] of wrap.children.entries()) {
  assert.equal(card.querySelectorAll('.card__price')[0].textContent, (index + 1.25).toFixed(2));
  assert.equal(card.querySelectorAll('.card__tagBadge')[0].textContent, index % 2 ? 'mais vendido' : 'novo');
  assert.equal(card.querySelectorAll('.card__name')[0].textContent, `Produto sincronizado ${index}`);
  assert.equal(card.querySelectorAll('.card__stock')[0].textContent, `${index + 4} disponíveis`);
  assert.deepEqual(Array.from(card.querySelectorAll('.sizeBtn'), (button) => button.textContent), ['PP', 'GG']);
  card.querySelectorAll('.colorSwatch')[1].listeners.click();
  assert.equal(card.querySelectorAll('.card__name')[0].textContent, `Variação ${index}`);
  assert.equal(card.querySelectorAll('.card__tagBadge')[0].textContent, 'novo');
}
assert.ok(noveltyVariants(visitor.getProducts()).length > originals.length);

// Produto oculto, novo cadastro e exclusão também chegam ao visitante.
globalThis.localStorage = adminStorage;
admin.saveProduct({ ...admin.getProducts()[0], active: false });
admin.deleteProduct(originals[1].id);
admin.saveProduct({ id: 'novo-teste', name: 'Adicionado no admin', category: 'Anabol', price: 79, stock: 8, sizes: ['M'], tag: 'novo', colors: [{ name: 'Preto', hex: '#000000' }, { name: 'Bege', hex: '#c8b090', image: '/produto-bege.webp' }] });
await admin.syncStore();
globalThis.localStorage = visitorStorage;
await visitor.hydrateStore(); context.renderCatalog();
assert.equal(visitor.getProducts().some((product) => product.id === originals[0].id), false);
assert.equal(visitor.getProducts().some((product) => product.id === originals[1].id), false);
assert.equal(visitor.getProducts().find((product) => product.id === 'novo-teste').price, 79);
const categories = visitor.getCategories();
assert.equal(categories[0], 'Tudo');
assert.ok(categories.indexOf('Anabol') > categories.indexOf('Acessórios'));
assert.equal(categories.at(-1), 'Anabol');
const newCard = wrap.children[0];
assert.equal(newCard.querySelectorAll('.card__emptyPhoto')[0].hidden, false);
newCard.querySelectorAll('.colorSwatch')[1].listeners.click();
assert.equal(newCard.querySelectorAll('.card__emptyPhoto')[0].hidden, true);
assert.equal(newCard.querySelectorAll('.card__price').length, 1);
assert.equal(newCard.querySelectorAll('.card__price')[0].textContent, '79.00');
newCard.querySelectorAll('.colorSwatch')[0].listeners.click();
assert.equal(newCard.querySelectorAll('.card__emptyPhoto')[0].hidden, false);
assert.equal(newCard.querySelectorAll('.card__price')[0].textContent, '79.00');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
assert.match(css, /\.card__photo \{[^}]*background: var\(--paper\)/);

const basket = await import('../src/lib/cart.js?catalog-sync-check');
const item = visitor.getProducts().find((product) => product.id === 'novo-teste');
basket.addToCart(item, 'M', 'Preto'); basket.addToCart(item, 'M', 'Preto');
basket.reconcileCart([{ ...item, price: 19.5, stock: 1 }]);
assert.equal(basket.cart[0].price, 19.5);
assert.equal(basket.cart[0].qty, 1);
basket.reconcileCart([{ ...item, active: false }]);
assert.equal(basket.cart.length, 0);

// A sessão demo abre a prévia local sem escrever na loja publicada.
const writesBeforeDemo = writes;
globalThis.localStorage = adminStorage;
admin.configureStoreMode({ localOnly: true, namespace: 'demo_v4' });
admin.saveProduct({ id: 'demo-local', name: 'Só demonstração', price: 2, stock: 1, sizes: ['M'], tag: 'novo', colors: [{ name: 'Azul' }] });
await admin.syncStore();
assert.equal(writes, writesBeforeDemo);
assert.equal(JSON.parse(persisted).products.some((product) => product.id === 'demo-local'), false);
for (const [access, expected] of [['demo', true], ['owner', false], ['client', false], [null, false]]) {
  globalThis.fetch = async () => ({ ok: Boolean(access), json: async () => ({ access }) });
  assert.equal(await resolveStorefrontDemo(''), expected);
}
assert.equal(await resolveStorefrontDemo('?preview=demo'), true);
console.log(`OK: ${originals.length} produtos verificados do admin ao backend e à vitrine: preços, etiquetas, nomes, estoque, tamanhos e variações; inclusão, exclusão, ocultação e isolamento da demonstração.`);
