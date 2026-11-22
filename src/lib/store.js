import { STORE as DEFAULT_STORE } from '../data/config.js';
import { PRODUCTS as DEFAULT_PRODUCTS, CATEGORIES as DEFAULT_CATEGORIES } from '../data/products.js';
import { normalizePixKey } from './pix-key.js';
import { normalizeSizes } from './product-sizes.js';

const BASE_KEYS = { store: 'frswear_store_v2', products: 'frswear_products_v2', activity: 'frswear_activity_v1', resetUndo: 'frswear_reset_undo_v1' };
const CATALOG_VERSION = 3;
const LEGACY_SEED_IDS = new Set([...Array.from({ length: 23 }, (_, index) => `p${index + 1}`), 'p22-24']);
const API_BASE = '';
let syncTimer;
let syncPromise = Promise.resolve();
let storeMode = { localOnly: false, namespace: '' };

const storageKey = (name) => storeMode.namespace ? `${BASE_KEYS[name]}_${storeMode.namespace}` : BASE_KEYS[name];

export function configureStoreMode({ localOnly = false, namespace = '' } = {}) {
  storeMode = { localOnly: Boolean(localOnly), namespace: String(namespace || '').replace(/[^a-z0-9_-]/gi, '') };
}

const clone = (value) => JSON.parse(JSON.stringify(value));

function read(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved ?? clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function defaultProducts() {
  const used = new Set();
  return DEFAULT_PRODUCTS.map((product, index) => {
    let id = product.id || `produto-${index + 1}`;
    if (used.has(id)) id = `${id}-${index + 1}`;
    used.add(id);
    return {
      ...clone(product),
      id,
      stock: Number.isFinite(product.stock) ? product.stock : 12,
      active: product.active !== false,
      featured: Boolean(product.featured || product.tag),
    };
  });
}

function isLegacySeedCatalog(products, version = 0) {
  return Number(version) < CATALOG_VERSION
    && Array.isArray(products)
    && products.length === LEGACY_SEED_IDS.size
    && products.every((product) => LEGACY_SEED_IDS.has(product.id));
}

function migrateLocalSeedCatalog() {
  const products = read(storageKey('products'), null);
  if (isLegacySeedCatalog(products)) {
    localStorage.setItem(storageKey('products'), JSON.stringify(defaultProducts()));
    return true;
  }
  return false;
}

function applySnapshot(snapshot) {
  if (snapshot?.store) localStorage.setItem(storageKey('store'), JSON.stringify({ ...DEFAULT_STORE, ...snapshot.store }));
  if (Array.isArray(snapshot?.products)) localStorage.setItem(storageKey('products'), JSON.stringify(snapshot.products));
  if (Array.isArray(snapshot?.activity)) localStorage.setItem(storageKey('activity'), JSON.stringify(snapshot.activity.slice(0, 20)));
}

function snapshot() {
  return {
    store: getStore(),
    products: getProducts({ includeInactive: true }),
    activity: getActivity(),
    catalogVersion: CATALOG_VERSION,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível acessar o servidor.');
  return data;
}

export async function hydrateStore({ admin = false, preferLocal = false } = {}) {
  migrateLocalSeedCatalog();
  if (storeMode.localOnly && preferLocal) return true;
  try {
    const data = await request(admin && !storeMode.localOnly ? '/api/admin/data' : '/api/catalog');
    if (data.initialized) {
      const upgraded = isLegacySeedCatalog(data.products, data.catalogVersion);
      if (upgraded) data.products = defaultProducts();
      applySnapshot(data);
      if (upgraded && admin && !storeMode.localOnly) await syncStore();
      return true;
    }
    if (admin && !storeMode.localOnly) await syncStore();
  } catch (error) {
    console.warn('Catálogo remoto indisponível; usando dados locais.', error);
  }
  return false;
}

export function syncStore() {
  if (storeMode.localOnly) return Promise.resolve({ ok: true, localOnly: true });
  clearTimeout(syncTimer);
  // Capture os dados editados antes de esperar outra sincronização terminar.
  const body = JSON.stringify(snapshot());
  syncPromise = syncPromise.catch(() => {}).then(() => request('/api/admin/data', {
    method: 'PUT',
    body,
  })).then((result) => {
    try { localStorage.setItem('frswear_catalog_published', `${Date.now()}:${Math.random()}`); } catch { /* Catálogo já publicado. */ }
    return result;
  });
  return syncPromise;
}

function scheduleSync() {
  clearTimeout(syncTimer);
  if (storeMode.localOnly) return;
  syncTimer = setTimeout(() => syncStore().catch((error) => console.error('Falha ao salvar no servidor:', error)), 180);
}

export function getStore() {
  const store = { ...clone(DEFAULT_STORE), ...read(storageKey('store'), {}) };
  store.pixKey = normalizePixKey(store.pixKey);
  return store;
}

export function saveStore(data, message = 'Configurações da loja atualizadas') {
  const next = { ...getStore(), ...data };
  localStorage.setItem(storageKey('store'), JSON.stringify(next));
  logActivity(message);
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
  return next;
}

function colorImage(product, color, index) {
  const upgrade = (source = '') => ({
    '/products-demo/vestido-midi-esmeralda.webp': '/products-demo/vestido-midi-esmeralda-v3.webp',
    '/products-demo/vestido-midi-esmeralda-v2.webp': '/products-demo/vestido-midi-esmeralda-v3.webp',
    '/products-demo/variants/vestido-midi-esmeralda-2.webp': '/products-demo/variants/vestido-midi-esmeralda-v4-2.png',
    '/products-demo/variants/vestido-midi-esmeralda-v2-2.webp': '/products-demo/variants/vestido-midi-esmeralda-v4-2.png',
    '/products-demo/variants/vestido-midi-esmeralda-v3-2.webp': '/products-demo/variants/vestido-midi-esmeralda-v4-2.png',
  }[source] || source);
  if (color.image) return upgrade(color.image);
  if (index === 0) return upgrade(product.image || '');
  const match = product.image?.match(/^\/products-demo\/([^/]+)\.webp$/);
  return match ? upgrade(`/products-demo/variants/${match[1]}-${index + 1}.webp`) : '';
}

export function getProducts({ includeInactive = false } = {}) {
  const products = read(storageKey('products'), defaultProducts()).map((product) => ({
    ...product,
    image: ['/products-demo/vestido-midi-esmeralda.webp', '/products-demo/vestido-midi-esmeralda-v2.webp'].includes(product.image) ? '/products-demo/vestido-midi-esmeralda-v3.webp' : product.image,
    sizes: normalizeSizes(product.sizes),
    stock: Math.max(0, Number(product.stock) || 0),
    active: product.active !== false,
    featured: Boolean(product.featured),
    colors: (product.colors?.length ? product.colors : [{ name: 'Única', hex: '#777777' }]).map((color, index) => ({
      ...color,
      image: colorImage(product, color, index),
    })),
  }));
  return includeInactive ? products : products.filter((product) => product.active);
}

export function getCategories() {
  const categories = [...new Set(getProducts().map((product) => product.category).filter(Boolean))];
  const original = DEFAULT_CATEGORIES.filter((category) => category !== 'Tudo' && categories.includes(category));
  const added = categories.filter((category) => !DEFAULT_CATEGORIES.includes(category));
  return ['Tudo', ...original, ...added];
}

export function saveProduct(product) {
  const products = getProducts({ includeInactive: true });
  const normalized = {
    ...product,
    id: product.id || `p-${Date.now().toString(36)}`,
    price: Math.max(0, Number(product.price) || 0),
    stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
    sizes: normalizeSizes(product.sizes),
    colors: product.colors?.length ? product.colors : [{ name: 'Única', hex: '#777777' }],
    active: product.active !== false,
    featured: Boolean(product.featured),
  };
  const index = products.findIndex((item) => item.id === normalized.id);
  if (index >= 0) products[index] = normalized;
  else products.unshift(normalized);
  localStorage.setItem(storageKey('products'), JSON.stringify(products));
  logActivity(`${index >= 0 ? 'Produto atualizado' : 'Produto adicionado'}: ${normalized.name}`);
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
  return normalized;
}

export function updateStock(id, stock) {
  const product = getProducts({ includeInactive: true }).find((item) => item.id === id);
  if (!product) return;
  product.stock = Math.max(0, Math.floor(Number(stock) || 0));
  saveProduct(product);
}

export function deleteProduct(id) {
  const products = getProducts({ includeInactive: true });
  const product = products.find((item) => item.id === id);
  localStorage.setItem(storageKey('products'), JSON.stringify(products.filter((item) => item.id !== id)));
  logActivity(`Produto removido: ${product?.name || id}`);
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
}

export function logActivity(message) {
  const activity = read(storageKey('activity'), []);
  activity.unshift({ message, at: new Date().toISOString() });
  localStorage.setItem(storageKey('activity'), JSON.stringify(activity.slice(0, 20)));
}

export function getActivity() {
  return read(storageKey('activity'), []);
}

export function exportData() {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    store: getStore(),
    products: getProducts({ includeInactive: true }),
    catalogVersion: CATALOG_VERSION,
  };
}

export function importData(data) {
  if (!data || !Array.isArray(data.products) || typeof data.store !== 'object') {
    throw new Error('Arquivo de backup inválido.');
  }
  localStorage.setItem(storageKey('store'), JSON.stringify({ ...DEFAULT_STORE, ...data.store }));
  localStorage.setItem(storageKey('products'), JSON.stringify(data.products));
  logActivity(`Backup importado com ${data.products.length} produtos`);
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
}

export function resetData() {
  // A cópia precisa ser gravada antes de remover qualquer configuração.
  // Se não houver espaço, interrompemos a restauração sem apagar os dados.
  try {
    localStorage.setItem(storageKey('resetUndo'), JSON.stringify({ ...exportData(), activity: getActivity() }));
  } catch {
    throw new Error('Não há espaço para guardar a cópia de segurança. A restauração foi cancelada e seus dados foram mantidos. Baixe um backup JSON antes de continuar.');
  }
  localStorage.removeItem(storageKey('store'));
  localStorage.removeItem(storageKey('products'));
  logActivity('Dados restaurados para a versão original');
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
}

export function canUndoReset() {
  const previous = read(storageKey('resetUndo'), null);
  return Boolean(previous?.store && Array.isArray(previous.products));
}

export function undoResetData() {
  const previous = read(storageKey('resetUndo'), null);
  if (!previous?.store || !Array.isArray(previous.products)) throw new Error('Não há restauração para desfazer neste navegador.');
  applySnapshot(previous);
  logActivity('Restauração desfeita: dados anteriores recuperados');
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
}

export function finishUndoReset() {
  localStorage.removeItem(storageKey('resetUndo'));
}
