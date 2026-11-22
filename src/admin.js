import '@fontsource-variable/fraunces';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/space-mono/400.css';
import './admin.css';
import { setupPwa } from './lib/pwa.js';

setupPwa();

import {
  configureStoreMode,
  deleteProduct,
  exportData,
  getActivity,
  getCategories,
  getProducts,
  getStore,
  hydrateStore,
  importData,
  resetData,
  saveProduct,
  saveStore,
  syncStore,
  updateStock,
} from './lib/store.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const viewTitles = { dashboard: 'Visão geral', orders: 'Pedidos', products: 'Produtos', appearance: 'Vitrine & banner', contact: 'Contato & redes', backup: 'Dados & backup' };
const API_BASE = '';
let pendingProductImage = '';
let pendingColorVariants = [];
let pendingBannerImage = '';
let panelInitialized = false;
let initializedAccess = '';
let adminOrders = [];
let accessMode = 'owner';

function demoOrders() {
  const now = Date.now();
  return [
    { id: 'demo-8f21', customer: { name: 'Mariana Souza', email: 'mariana@exemplo.com' }, items: [{ quantity: 2 }], total_cents: 23980, payment_method: 'pix', status: 'preparing', payment_status: 'paid', shipping_status: 'preparing', created_at: new Date(now - 38 * 60_000).toISOString() },
    { id: 'demo-5ca4', customer: { name: 'Ana Clara', email: 'ana@exemplo.com' }, items: [{ quantity: 1 }], total_cents: 15990, payment_method: 'cartao', status: 'received', payment_status: 'paid', shipping_status: 'pending', created_at: new Date(now - 4 * 60 * 60_000).toISOString() },
    { id: 'demo-31be', customer: { name: 'Juliana Lima', email: 'juliana@exemplo.com' }, items: [{ quantity: 1 }, { quantity: 1 }], total_cents: 32700, payment_method: 'retirada', status: 'completed', payment_status: 'pay_on_pickup', shipping_status: 'delivered', created_at: new Date(now - 26 * 60 * 60_000).toISOString() },
  ];
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}/api/auth/${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível validar o acesso.');
  return data;
}

function showLogin(message = '') {
  document.body.classList.remove('nav-open');
  $('#adminShell').hidden = true;
  $('#loginGate').hidden = false;
  $('#loginChecking').hidden = true;
  $('#loginForm').hidden = false;
  $('#demoAccess').hidden = false;
  $('#loginError').hidden = !message;
  $('#loginError').textContent = message;
  $('#loginForm').elements.email.focus();
}

async function showPanel(session = {}) {
  accessMode = session.access || (session.demo ? 'demo' : 'owner');
  const demo = accessMode === 'demo';
  if (panelInitialized && initializedAccess !== accessMode) {
    window.location.reload();
    return;
  }
  $('#loginGate').hidden = true;
  $('#adminShell').hidden = false;
  $('#demoModeBar').hidden = !demo;
  $('#sessionDescription').textContent = demo ? 'Demonstração isolada da loja publicada' : 'Sessão completa protegida por cookie';
  $('#openStoreLink').href = demo ? '/?preview=demo' : '/';
  $('#showcaseLink').href = demo ? '/?preview=demo' : '/';
  if (!panelInitialized) {
    configureStoreMode({ localOnly: demo, namespace: demo ? 'demo_v4' : '' });
    await hydrateStore({ admin: !demo, preferLocal: demo });
    fillSettings();
    bindEvents();
    renderDashboard();
    panelInitialized = true;
    initializedAccess = accessMode;
  }
}

async function bootstrapAuth() {
  try {
    const session = await authRequest('session');
    await showPanel(session);
  } catch {
    showLogin();
  }
}

function bindAuth() {
  if (import.meta.env.DEV) {
    $('#loginForm').elements.email.value = 'admin@frswear.local';
    $('#loginForm').elements.password.value = 'frs1234';
  }
  $('#togglePassword').addEventListener('click', () => {
    const field = $('#loginForm').elements.password;
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    $('#togglePassword').textContent = show ? 'Ocultar' : 'Mostrar';
    $('#togglePassword').setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });
  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]');
    const data = new FormData(event.currentTarget);
    button.disabled = true;
    button.textContent = 'Entrando…';
    $('#loginError').hidden = true;
    try {
      const session = await authRequest('login', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      await showPanel(session);
    } catch (error) {
      showLogin(error.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Entrar no painel';
    }
  });
  $('#demoLoginButton').addEventListener('click', async () => {
    $('#loginForm').elements.email.value = 'demo@frswear.com.br';
    $('#loginForm').elements.password.value = 'DemoFRS2026!';
    $('#loginError').hidden = true;
    $('#loginForm').querySelector('[type="submit"]').focus();
  });
  $('#logoutButton').addEventListener('click', async () => {
    try { await authRequest('logout', { method: 'POST', body: '{}' }); }
    finally { window.location.reload(); }
  });
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('is-visible'), 2800);
}

function showView(name) {
  $$('.adminView').forEach((view) => view.classList.toggle('is-active', view.id === `view-${name}`));
  $$('.navItem').forEach((button) => button.classList.toggle('is-active', button.dataset.view === name));
  $('#viewTitle').textContent = viewTitles[name];
  $('#quickAddButton').hidden = name !== 'dashboard';
  document.body.classList.remove('nav-open');
  if (name === 'dashboard') renderDashboard();
  if (name === 'orders') renderOrders();
  if (name === 'products') renderProducts();
}

async function renderOrders() {
  const rows = $('#orderRows');
  rows.innerHTML = '<tr><td colspan="7"><div class="emptyState">Carregando pedidos…</div></td></tr>';
  try {
    if (accessMode === 'demo') {
      if (!adminOrders.length) adminOrders = demoOrders();
      renderOrderRows(rows, adminOrders);
      return;
    }
    const response = await fetch(`${API_BASE}/api/admin/orders`, { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os pedidos.');
    adminOrders = data.orders;
    renderOrderRows(rows, data.orders);
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="7"><div class="emptyState">${escapeHtml(error.message)}</div></td></tr>`;
  }
}

function renderOrderRows(rows, orders) {
    const paymentLabels = { retirada: 'Retirada', pix: 'Pix', cartao: 'Cartão' };
    rows.innerHTML = orders.length ? orders.map((order) => {
      const shortId = String(order.id).split('-')[0].toUpperCase();
      const items = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const created = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.created_at));
      return `<tr><td><strong>#${escapeHtml(shortId)}</strong><small class="tableMeta">${created}</small></td><td><strong>${escapeHtml(order.customer?.name)}</strong><small class="tableMeta">${escapeHtml(order.customer?.email)}</small></td><td>${items} ${items === 1 ? 'item' : 'itens'}</td><td>${money(order.total_cents / 100)}</td><td>${escapeHtml(paymentLabels[order.payment_method] || order.payment_method || '—')}</td><td><span class="statusBadge is-active">${escapeHtml(order.status === 'completed' ? 'Concluído' : order.status === 'shipped' ? 'Enviado' : order.status === 'preparing' ? 'Preparando' : 'Recebido')}</span></td><td><button class="iconButton" data-manage-order="${escapeHtml(order.id)}" type="button" aria-label="Gerenciar pedido">•••</button></td></tr>`;
    }).join('') : '<tr><td colspan="7"><div class="emptyState">Nenhum pedido recebido ainda.</div></td></tr>';
    $$('[data-manage-order]').forEach((button) => button.addEventListener('click', () => openOrderModal(button.dataset.manageOrder)));
}

function openOrderModal(id) {
  const order = adminOrders.find((item) => item.id === id);
  if (!order) return;
  const form = $('#orderForm');
  form.elements.id.value = order.id;
  ['status', 'payment_status', 'shipping_status', 'shipping_provider', 'tracking_code', 'shipping_service'].forEach((name) => { form.elements[name].value = order[name] || (name === 'status' ? 'received' : name === 'payment_status' ? 'pending' : name === 'shipping_status' ? 'pending' : ''); });
  $('#orderModalTitle').textContent = `Pedido #${order.id.split('-')[0].toUpperCase()}`;
  $('#orderModal').hidden = false;
  document.body.classList.add('modal-open');
}

function closeOrderModal() { $('#orderModal').hidden = true; document.body.classList.remove('modal-open'); }

function renderDashboard() {
  const products = getProducts({ includeInactive: true });
  const active = products.filter((product) => product.active);
  const low = active.filter((product) => product.stock > 0 && product.stock <= 3);
  const out = active.filter((product) => product.stock === 0);
  const inventoryValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);
  const store = getStore();
  $('#welcomeTitle').textContent = `${store.name} em um só lugar.`;
  $('#metricGrid').innerHTML = [
    ['Produtos ativos', active.length, `${products.length - active.length} ocultos`],
    ['Itens em estoque', products.reduce((sum, product) => sum + product.stock, 0), `${out.length} esgotados`],
    ['Valor do estoque', money(inventoryValue), 'pelo preço de venda'],
    ['Alertas', low.length + out.length, low.length + out.length ? 'pedem atenção' : 'tudo em ordem'],
  ].map(([label, value, hint]) => `<article class="metricCard"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`).join('');

  const attention = [...out, ...low].slice(0, 5);
  $('#stockAlerts').innerHTML = attention.length ? attention.map((product) => `
    <div class="alertRow"><div class="miniProduct">${product.image ? `<img src="${escapeHtml(product.image)}" alt="" />` : '<span></span>'}<div><strong>${escapeHtml(product.name)}</strong><small>${product.stock === 0 ? 'Esgotado' : `Só ${product.stock} em estoque`}</small></div></div><button class="stockPill" data-edit="${escapeHtml(product.id)}">Ajustar</button></div>`).join('') : '<div class="emptyState">Estoque saudável. Nenhum produto precisa de reposição agora.</div>';

  const campaignProduct = active.filter((product) => product.stock >= 4).sort((a, b) => Number(b.featured) - Number(a.featured) || b.stock - a.stock)[0];
  const campaignCopy = campaignProduct
    ? `✨ Destaque da semana: ${campaignProduct.name} por ${money(campaignProduct.price)}. Disponível em ${campaignProduct.sizes.join(', ')}. Confira e peça direto no site!`
    : 'Cadastre ou reponha um produto para receber uma sugestão automática de campanha.';
  $('#campaignIdea').innerHTML = `<div class="campaignCard"><span class="spark">✦</span><p>${escapeHtml(campaignCopy)}</p><button class="secondaryButton" id="copyCampaign" type="button" ${campaignProduct ? '' : 'disabled'}>Copiar texto</button></div>`;
  $('#copyCampaign')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(campaignCopy);
    toast('Texto da campanha copiado');
  });

  const checks = [
    { label: 'Produtos com foto', value: products.filter((product) => product.image).length, total: products.length },
    { label: 'Produtos com cor definida', value: products.filter((product) => product.colors?.length).length, total: products.length },
    { label: 'Produtos disponíveis', value: active.filter((product) => product.stock > 0).length, total: Math.max(active.length, 1) },
  ];
  $('#catalogHealth').innerHTML = checks.map((check) => {
    const percent = Math.round((check.value / Math.max(check.total, 1)) * 100);
    return `<div class="healthRow"><div><span>${check.label}</span><strong>${check.value}/${check.total}</strong></div><div class="progress"><i style="width:${percent}%"></i></div></div>`;
  }).join('');

  const activity = getActivity().slice(0, 5);
  $('#activityList').innerHTML = activity.length ? activity.map((item) => `<div class="activityRow"><i></i><div><strong>${escapeHtml(item.message)}</strong><small>${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.at))}</small></div></div>`).join('') : '<div class="emptyState">As próximas alterações aparecerão aqui.</div>';
  $$('[data-edit]').forEach((button) => button.addEventListener('click', () => openProductModal(button.dataset.edit)));
}

function renderProducts() {
  const term = $('#productSearch').value.trim().toLowerCase();
  const filter = $('#stockFilter').value;
  let products = getProducts({ includeInactive: true });
  if (term) products = products.filter((product) => [product.name, product.category, ...product.colors.map((color) => color.name)].join(' ').toLowerCase().includes(term));
  if (filter === 'low') products = products.filter((product) => product.stock > 0 && product.stock <= 3);
  if (filter === 'out') products = products.filter((product) => product.stock === 0);
  if (filter === 'hidden') products = products.filter((product) => !product.active);
  $('#productRows').innerHTML = products.length ? products.map((product) => `
    <tr>
      <td><div class="tableProduct">${product.image ? `<img src="${escapeHtml(product.image)}" alt="" />` : '<span></span>'}<div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.sizes.join(' · '))}</small></div></div></td>
      <td>${escapeHtml(product.category)}</td><td>${money(product.price)}</td>
      <td><div class="stockControl"><button data-stock="${escapeHtml(product.id)}" data-delta="-1" type="button">−</button><strong class="${product.stock <= 3 ? 'is-low' : ''}">${product.stock}</strong><button data-stock="${escapeHtml(product.id)}" data-delta="1" type="button">+</button></div></td>
      <td><span class="statusBadge ${!product.active ? 'is-hidden' : product.stock === 0 ? 'is-out' : 'is-active'}">${!product.active ? 'Oculto' : product.stock === 0 ? 'Esgotado' : 'Ativo'}</span></td>
      <td><button class="iconButton" data-edit="${escapeHtml(product.id)}" type="button" aria-label="Editar ${escapeHtml(product.name)}">•••</button></td>
    </tr>`).join('') : '<tr><td colspan="6"><div class="emptyState">Nenhum produto encontrado.</div></td></tr>';
  $$('[data-stock]').forEach((button) => button.addEventListener('click', async () => {
    const product = getProducts({ includeInactive: true }).find((item) => item.id === button.dataset.stock);
    updateStock(product.id, product.stock + Number(button.dataset.delta));
    renderProducts();
    try { await syncStore(); } catch (error) { toast(error.message); }
  }));
  $$('[data-edit]').forEach((button) => button.addEventListener('click', () => openProductModal(button.dataset.edit)));
}

function setProductPreview(source) {
  const image = $('#productImagePreview');
  image.src = source || '';
  image.hidden = !source;
  $('#productImagePlaceholder').hidden = Boolean(source);
  $('#removeProductImageButton').hidden = !source;
}

function openProductModal(id = '') {
  const form = $('#productForm');
  form.reset();
  const product = getProducts({ includeInactive: true }).find((item) => item.id === id);
  pendingProductImage = product?.image || '';
  $('#productModalTitle').textContent = product ? 'Editar produto' : 'Novo produto';
  $('#deleteProductButton').hidden = !product;
  form.elements.id.value = product?.id || '';
  form.elements.name.value = product?.name || '';
  form.elements.category.value = product?.category || '';
  form.elements.price.value = product?.price ?? '';
  form.elements.stock.value = product?.stock ?? 0;
  form.elements.tag.value = product?.tag || '';
  form.elements.sizes.value = product?.sizes?.join(', ') || 'Único';
  pendingColorVariants = (product?.colors?.length ? product.colors : [{ name: 'Única', hex: '#777777', image: product?.image || '' }]).map((color) => ({
    id: crypto.randomUUID(),
    name: color.name || '',
    hex: /^#[0-9a-f]{6}$/i.test(color.hex || '') ? color.hex : '#777777',
    image: color.image || '',
  }));
  renderColorVariants();
  form.elements.active.checked = product?.active !== false;
  form.elements.featured.checked = Boolean(product?.featured);
  form.elements.image.value = product?.image?.startsWith('data:') ? '' : product?.image || '';
  $('#categoryOptions').innerHTML = getCategories().filter((category) => category !== 'Tudo').map((category) => `<option value="${escapeHtml(category)}"></option>`).join('');
  setProductPreview(pendingProductImage);
  $('#productModal').hidden = false;
  document.body.classList.add('modal-open');
  setTimeout(() => form.elements.name.focus(), 50);
}

function closeProductModal() {
  $('#productModal').hidden = true;
  document.body.classList.remove('modal-open');
}

function renderColorVariants() {
  $('#colorVariantList').innerHTML = pendingColorVariants.map((variant, index) => `
    <article class="colorVariantRow" data-variant-id="${escapeHtml(variant.id)}">
      <div class="colorVariantPreview" style="--variant-color:${escapeHtml(variant.hex)}">
        ${variant.image ? `<img src="${escapeHtml(variant.image)}" alt="Prévia da cor ${escapeHtml(variant.name || String(index + 1))}" />` : '<span>Sem foto</span>'}
      </div>
      <div class="colorVariantFields">
        <label>Nome da cor<input data-variant-field="name" value="${escapeHtml(variant.name)}" placeholder="Ex.: Caramelo" required /></label>
        <label>Cor visual<span class="colorPickerField"><input data-variant-field="hex" type="color" value="${escapeHtml(variant.hex)}" /><code>${escapeHtml(variant.hex.toUpperCase())}</code></span></label>
        <div class="colorVariantPhotoActions">
          <label class="secondaryButton fileButton">Escolher foto<input data-variant-file type="file" accept="image/*" hidden /></label>
          ${variant.image ? '<button class="dangerTextButton" data-remove-variant-image type="button">Remover foto</button>' : ''}
        </div>
        <label class="variantUrlField">Ou use uma URL<input data-variant-field="image" value="${variant.image?.startsWith('data:') ? '' : escapeHtml(variant.image)}" placeholder="https://..." /></label>
      </div>
      <button class="iconButton removeVariantButton" data-remove-variant type="button" aria-label="Remover esta cor" title="Remover cor">×</button>
    </article>`).join('');
}

function addColorVariant() {
  pendingColorVariants.push({ id: crypto.randomUUID(), name: '', hex: '#777777', image: '' });
  renderColorVariants();
  $('#colorVariantList .colorVariantRow:last-child [data-variant-field="name"]')?.focus();
}

async function resizeImage(file, width, height, quality = 0.82) {
  const source = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const scale = Math.max(width / source.width, height / source.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(source, (source.width - sourceWidth) / 2, (source.height - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, width, height);
  return canvas.toDataURL('image/webp', quality);
}

async function uploadImage(source) {
  if (!source?.startsWith('data:')) return source;
  if (accessMode === 'demo') return source;
  const blob = await (await fetch(source)).blob();
  const body = new FormData();
  body.append('image', blob, 'imagem.webp');
  const response = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    credentials: 'include',
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a imagem.');
  return data.url;
}

function fillSettings() {
  const store = getStore();
  ['appearanceForm', 'contactForm'].forEach((id) => {
    const form = $(`#${id}`);
    [...form.elements].forEach((field) => {
      if (field.name && store[field.name] !== undefined) field.value = store[field.name];
    });
  });
  $('#bannerPreview').src = store.heroImage;
  pendingBannerImage = '';
  $('#bannerPreview').style.objectPosition = `${store.heroPositionX ?? 50}% ${store.heroPositionY ?? 50}%`;
}

function bindEvents() {
  $$('.navItem').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  $$('[data-go]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.go)));
  $('#mobileNavButton').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $('#refreshOrders').addEventListener('click', renderOrders);
  ['closeOrderModal', 'cancelOrderButton'].forEach((id) => $(`#${id}`).addEventListener('click', closeOrderModal));
  $('#orderModal').addEventListener('click', (event) => { if (event.target === $('#orderModal')) closeOrderModal(); });
  $('#orderForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true;
    try {
      if (accessMode === 'demo') {
        const order = adminOrders.find((item) => item.id === values.id);
        if (order) Object.assign(order, values);
        closeOrderModal(); await renderOrders(); toast('Atualização salva somente na demonstração');
        return;
      }
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(values.id)}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o pedido.');
      closeOrderModal(); await renderOrders(); toast('Pedido e rastreio atualizados');
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  });
  ['quickAddButton', 'addProductButton'].forEach((id) => $(`#${id}`).addEventListener('click', () => openProductModal()));
  $('#productSearch').addEventListener('input', renderProducts);
  $('#stockFilter').addEventListener('change', renderProducts);
  ['closeProductModal', 'cancelProductButton'].forEach((id) => $(`#${id}`).addEventListener('click', closeProductModal));
  $('#productModal').addEventListener('click', (event) => { if (event.target === $('#productModal')) closeProductModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#productModal').hidden) closeProductModal(); });

  $('#addColorVariantButton').addEventListener('click', addColorVariant);
  $('#colorVariantList').addEventListener('input', (event) => {
    const row = event.target.closest('[data-variant-id]');
    const field = event.target.dataset.variantField;
    if (!row || !field) return;
    const variant = pendingColorVariants.find((item) => item.id === row.dataset.variantId);
    if (!variant) return;
    variant[field] = event.target.value;
    if (field === 'hex') {
      row.querySelector('.colorVariantPreview').style.setProperty('--variant-color', variant.hex);
      row.querySelector('.colorPickerField code').textContent = variant.hex.toUpperCase();
    }
  });
  $('#colorVariantList').addEventListener('change', async (event) => {
    if (event.target.dataset.variantField === 'image') {
      const row = event.target.closest('[data-variant-id]');
      const variant = pendingColorVariants.find((item) => item.id === row?.dataset.variantId);
      if (variant) renderColorVariants();
      return;
    }
    if (!event.target.matches('[data-variant-file]')) return;
    const file = event.target.files[0];
    const row = event.target.closest('[data-variant-id]');
    const variant = pendingColorVariants.find((item) => item.id === row?.dataset.variantId);
    if (!file || !variant) return;
    variant.image = await resizeImage(file, 900, 1200, 0.8);
    renderColorVariants();
    toast('Foto da cor ajustada e comprimida');
  });
  $('#colorVariantList').addEventListener('click', (event) => {
    const row = event.target.closest('[data-variant-id]');
    const variant = pendingColorVariants.find((item) => item.id === row?.dataset.variantId);
    if (!variant) return;
    if (event.target.closest('[data-remove-variant-image]')) {
      variant.image = '';
      renderColorVariants();
    }
    if (event.target.closest('[data-remove-variant]')) {
      if (pendingColorVariants.length === 1) return toast('O produto precisa ter pelo menos uma cor');
      pendingColorVariants = pendingColorVariants.filter((item) => item.id !== variant.id);
      renderColorVariants();
    }
  });

  $('#productImageFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    pendingProductImage = await resizeImage(file, 900, 1200, 0.8);
    setProductPreview(pendingProductImage);
    toast('Foto ajustada e comprimida');
  });
  $('#productForm').elements.image.addEventListener('input', (event) => {
    if (event.target.value) { pendingProductImage = event.target.value; setProductPreview(pendingProductImage); }
  });
  $('#removeProductImageButton').addEventListener('click', () => {
    pendingProductImage = '';
    $('#productForm').elements.image.value = '';
    $('#productImageFile').value = '';
    setProductPreview('');
    toast('Foto removida. Salve o produto para confirmar.');
  });
  $('#productForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]');
    const data = new FormData(event.currentTarget);
    button.disabled = true;
    try {
      const image = await uploadImage(pendingProductImage);
      const validVariants = pendingColorVariants.filter((variant) => variant.name.trim());
      if (!validVariants.length) throw new Error('Adicione pelo menos uma cor ao produto.');
      const colors = await Promise.all(validVariants.map(async (variant) => ({
        name: variant.name.trim(),
        hex: variant.hex,
        image: variant.image === pendingProductImage ? image : await uploadImage(variant.image),
      })));
      saveProduct({
        id: data.get('id'), name: data.get('name').trim(), category: data.get('category').trim(),
        price: data.get('price'), stock: data.get('stock'), tag: data.get('tag'), image,
        sizes: data.get('sizes').split(',').map((item) => item.trim()).filter(Boolean), colors,
        active: data.get('active') === 'on', featured: data.get('featured') === 'on',
      });
      await syncStore();
      closeProductModal();
      renderProducts();
      toast(accessMode === 'demo' ? 'Produto salvo somente na demonstração' : 'Produto salvo na vitrine');
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });
  $('#deleteProductButton').addEventListener('click', async () => {
    const id = $('#productForm').elements.id.value;
    const product = getProducts({ includeInactive: true }).find((item) => item.id === id);
    if (product && window.confirm(`Excluir “${product.name}”? Esta ação não pode ser desfeita.`)) {
      deleteProduct(id);
      try { await syncStore(); closeProductModal(); renderProducts(); toast(accessMode === 'demo' ? 'Produto removido somente da demonstração' : 'Produto excluído'); }
      catch (error) { toast(error.message); }
    }
  });

  $('#bannerFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    pendingBannerImage = await resizeImage(file, 1600, 900, 0.82);
    $('#bannerPreview').src = pendingBannerImage;
    toast('Banner ajustado em 16:9 e comprimido');
  });
  ['heroPositionX', 'heroPositionY'].forEach((name) => $('#appearanceForm').elements[name].addEventListener('input', () => {
    $('#bannerPreview').style.objectPosition = `${$('#appearanceForm').elements.heroPositionX.value}% ${$('#appearanceForm').elements.heroPositionY.value}%`;
  }));
  $('#appearanceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      values.heroImage = await uploadImage(pendingBannerImage || values.heroImage);
      saveStore(values, 'Vitrine e banner atualizados');
      await syncStore();
      pendingBannerImage = '';
      event.currentTarget.elements.heroImage.value = values.heroImage;
      toast(accessMode === 'demo' ? 'Vitrine atualizada somente na demonstração' : 'Vitrine atualizada');
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });
  $('#contactForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    saveStore(Object.fromEntries(new FormData(event.currentTarget)), 'Contatos e redes sociais atualizados');
    try { await syncStore(); toast(accessMode === 'demo' ? 'Contatos salvos somente na demonstração' : 'Contatos atualizados'); }
    catch (error) { toast(error.message); }
  });
  $('#exportButton').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `frs-wear-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('Backup baixado');
  });
  $('#importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { importData(JSON.parse(await file.text())); await syncStore(); fillSettings(); renderDashboard(); toast(accessMode === 'demo' ? 'Backup carregado somente na demonstração' : 'Backup restaurado'); }
    catch (error) { toast(error.message); }
  });
  $('#resetButton').addEventListener('click', async () => {
    if (window.confirm('Restaurar o catálogo original e apagar todas as alterações locais?')) {
      resetData();
      try { await syncStore(); fillSettings(); renderDashboard(); toast(accessMode === 'demo' ? 'Demonstração restaurada' : 'Dados originais restaurados'); }
      catch (error) { toast(error.message); }
    }
  });
}

bindAuth();
bootstrapAuth();
