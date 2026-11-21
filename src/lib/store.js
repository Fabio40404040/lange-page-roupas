import { STORE as DEFAULT_STORE } from '../data/config.js';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/products.js';

const STORE_KEY = 'frswear_store_v2';
const PRODUCTS_KEY = 'frswear_products_v2';
const ACTIVITY_KEY = 'frswear_activity_v1';
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let syncTimer;
let syncPromise = Promise.resolve();

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

function applySnapshot(snapshot) {
  if (snapshot?.store) localStorage.setItem(STORE_KEY, JSON.stringify({ ...DEFAULT_STORE, ...snapshot.store }));
  if (Array.isArray(snapshot?.products)) localStorage.setItem(PRODUCTS_KEY, JSON.stringify(snapshot.products));
  if (Array.isArray(snapshot?.activity)) localStorage.setItem(ACTIVITY_KEY, JSON.stringify(snapshot.activity.slice(0, 20)));
}

function snapshot() {
  return {
    store: getStore(),
    products: getProducts({ includeInactive: true }),
    activity: getActivity(),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível acessar o servidor.');
  return data;
}

export async function hydrateStore({ admin = false } = {}) {
  try {
    const data = await request(admin ? '/api/admin/data' : '/api/catalog');
    if (data.initialized) {
      applySnapshot(data);
      return true;
    }
    if (admin) await syncStore();
  } catch (error) {
    console.warn('Catálogo remoto indisponível; usando dados locais.', error);
  }
  return false;
}

export function syncStore() {
  clearTimeout(syncTimer);
  syncPromise = syncPromise.catch(() => {}).then(() => request('/api/admin/data', {
    method: 'PUT',
    body: JSON.stringify(snapshot()),
  }));
  return syncPromise;
}

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncStore().catch((error) => console.error('Falha ao salvar no servidor:', error)), 180);
}

export function getStore() {
  return { ...clone(DEFAULT_STORE), ...read(STORE_KEY, {}) };
}

export function saveStore(data, message = 'Configurações da loja atualizadas') {
  const next = { ...getStore(), ...data };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
  logActivity(message);
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
  return next;
}

export function getProducts({ includeInactive = false } = {}) {
  const products = read(PRODUCTS_KEY, defaultProducts()).map((product) => ({
    ...product,
    stock: Math.max(0, Number(product.stock) || 0),
    active: product.active !== false,
    featured: Boolean(product.featured),
  }));
  return includeInactive ? products : products.filter((product) => product.active);
}

export function getCategories() {
  return ['Tudo', ...new Set(getProducts().map((product) => product.category).filter(Boolean))];
}

export function saveProduct(product) {
  const products = getProducts({ includeInactive: true });
  const normalized = {
    ...product,
    id: product.id || `p-${Date.now().toString(36)}`,
    price: Math.max(0, Number(product.price) || 0),
    stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
    sizes: product.sizes?.length ? product.sizes : ['Único'],
    colors: product.colors?.length ? product.colors : [{ name: 'Única', hex: '#777777' }],
    active: product.active !== false,
    featured: Boolean(product.featured),
  };
  const index = products.findIndex((item) => item.id === normalized.id);
  if (index >= 0) products[index] = normalized;
  else products.unshift(normalized);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
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
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products.filter((item) => item.id !== id)));
  logActivity(`Produto removido: ${product?.name || id}`);
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
}

export function logActivity(message) {
  const activity = read(ACTIVITY_KEY, []);
  activity.unshift({ message, at: new Date().toISOString() });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 20)));
}

export function getActivity() {
  return read(ACTIVITY_KEY, []);
}

export function exportData() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    store: getStore(),
    products: getProducts({ includeInactive: true }),
  };
}

export function importData(data) {
  if (!data || !Array.isArray(data.products) || typeof data.store !== 'object') {
    throw new Error('Arquivo de backup inválido.');
  }
  localStorage.setItem(STORE_KEY, JSON.stringify({ ...DEFAULT_STORE, ...data.store }));
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data.products));
  logActivity(`Backup importado com ${data.products.length} produtos`);
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
}

export function resetData() {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(PRODUCTS_KEY);
  logActivity('Dados restaurados para a versão original');
  window.dispatchEvent(new CustomEvent('storedatachange'));
  scheduleSync();
}
