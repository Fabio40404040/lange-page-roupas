import '@fontsource-variable/fraunces';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/space-mono/400.css';
import './account.css';
import { setupPwa } from './lib/pwa.js';

setupPwa();

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const money = (cents) => Number(cents || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const paymentLabels = { pending: 'Aguardando pagamento', paid: 'Pago', pay_on_pickup: 'Pagamento na retirada', refunded: 'Estornado' };
const statusLabels = { received: 'Pedido recebido', preparing: 'Em preparação', shipped: 'Enviado', completed: 'Concluído', cancelled: 'Cancelado' };
const shippingLabels = { pending: 'Aguardando preparação', preparing: 'Preparando envio', shipped: 'Em transporte', delivered: 'Entregue', cancelled: 'Envio cancelado' };
let loginEmail = '';
let orders = [];

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Não foi possível carregar seus dados.'), { status: response.status });
  return data;
}

function showError(message = '') { $('#accountError').textContent = message; $('#accountError').hidden = !message; }

async function requestCode(email = loginEmail) {
  const data = await api('customer/request-code', { method: 'POST', body: JSON.stringify({ email }) });
  loginEmail = email;
  $('#codeEmail').textContent = email;
  $('#emailStep').hidden = true;
  $('#codeStep').hidden = false;
  $('#demoCode').hidden = !data.devCode;
  $('#demoCode').textContent = data.devCode ? `Código local: ${data.devCode}` : '';
  $('#codeForm').elements.code.focus();
}

function bindLogin() {
  $('#emailForm').addEventListener('submit', async (event) => {
    event.preventDefault(); showError();
    const button = event.currentTarget.querySelector('button'); button.disabled = true; button.textContent = 'Enviando…';
    try { await requestCode(event.currentTarget.elements.email.value.trim().toLowerCase()); }
    catch (error) { showError(error.message); }
    finally { button.disabled = false; button.textContent = 'Receber código'; }
  });
  $('#codeForm').addEventListener('submit', async (event) => {
    event.preventDefault(); showError();
    const button = event.currentTarget.querySelector('button'); button.disabled = true; button.textContent = 'Verificando…';
    try { await api('customer/verify-code', { method: 'POST', body: JSON.stringify({ email: loginEmail, code: event.currentTarget.elements.code.value }) }); await openAccount(loginEmail); }
    catch (error) { showError(error.message); }
    finally { button.disabled = false; button.textContent = 'Entrar na minha conta'; }
  });
  $('#changeEmail').addEventListener('click', () => { $('#emailStep').hidden = false; $('#codeStep').hidden = true; showError(); });
  $('#resendCode').addEventListener('click', async () => { try { await requestCode(); } catch (error) { showError(error.message); } });
}

function orderCard(order) {
  const count = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const short = order.id.split('-')[0].toUpperCase();
  return `<article class="customerOrder"><div class="orderTop"><div><span>Pedido #${escapeHtml(short)}</span><small>${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(order.created_at))}</small></div><span class="orderStatus">${escapeHtml(statusLabels[order.status] || order.status)}</span></div><div class="orderSummary"><div><small>Itens</small><strong>${count}</strong></div><div><small>Total</small><strong>${money(order.total_cents / 100)}</strong></div><div><small>Pagamento</small><strong>${escapeHtml(paymentLabels[order.payment_status] || order.payment_status)}</strong></div></div><button class="secondaryButton" data-order="${escapeHtml(order.id)}" type="button">Ver detalhes</button></article>`;
}

function trackingCard(order) {
  const stages = ['received', 'preparing', 'shipped', 'completed'];
  const current = order.status === 'cancelled' ? -1 : Math.max(0, stages.indexOf(order.status));
  return `<article class="trackingCard"><div class="orderTop"><div><span>Pedido #${escapeHtml(order.id.split('-')[0].toUpperCase())}</span><small>${escapeHtml(shippingLabels[order.shipping_status] || order.shipping_status)}</small></div>${order.tracking_code ? `<strong class="trackingCode">${escapeHtml(order.tracking_code)}</strong>` : ''}</div><div class="trackingSteps">${stages.map((stage, index) => `<div class="trackingStep ${index <= current ? 'is-done' : ''}"><i></i><span>${statusLabels[stage]}</span></div>`).join('')}</div>${order.tracking_code ? `<p>Transportadora: ${escapeHtml(order.shipping_provider || 'Não informada')} ${order.shipping_service ? `· ${escapeHtml(order.shipping_service)}` : ''}</p>` : '<p>O código de rastreio aparecerá aqui assim que o pedido for enviado.</p>'}</article>`;
}

function bindOrderButtons() { $$('[data-order]').forEach((button) => button.addEventListener('click', () => showOrder(button.dataset.order))); }

function showOrder(id) {
  const order = orders.find((item) => item.id === id); if (!order) return;
  $('#orderDetailContent').innerHTML = `<p class="eyebrow">DETALHES DO PEDIDO</p><h2>#${escapeHtml(order.id.split('-')[0].toUpperCase())}</h2><div class="detailStatus"><span>${escapeHtml(statusLabels[order.status] || order.status)}</span><span>${escapeHtml(paymentLabels[order.payment_status] || order.payment_status)}</span></div><div class="detailItems">${order.items.map((item) => `<div><span>${item.quantity}× ${escapeHtml(item.name)}<small>${escapeHtml(item.size)} · ${escapeHtml(item.color)}</small></span><strong>${money(item.price_cents * item.quantity / 100)}</strong></div>`).join('')}</div><div class="detailTotal"><span>Total</span><strong>${money(order.total_cents / 100)}</strong></div>${order.tracking_code ? `<div class="trackingBox"><small>Código de rastreio</small><strong>${escapeHtml(order.tracking_code)}</strong><span>${escapeHtml(order.shipping_provider || '')}</span></div>` : ''}`;
  $('#orderDetail').showModal();
}

function renderAccount() {
  const active = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  $('#accountMetrics').innerHTML = [['Total de pedidos', orders.length], ['Em andamento', active.length], ['Entregues', orders.filter((order) => order.shipping_status === 'delivered' || order.status === 'completed').length]].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join('');
  $('#latestOrder').innerHTML = orders[0] ? orderCard(orders[0]) : '<div class="emptyAccount"><h3>Nenhum pedido ainda</h3><p>Quando você comprar usando este e-mail, o pedido aparecerá aqui.</p><a href="/#catalogo" class="primaryButton">Ver produtos</a></div>';
  $('#customerOrderList').innerHTML = orders.length ? orders.map(orderCard).join('') : '<div class="emptyAccount"><h3>Nenhum pedido encontrado</h3><p>Use o mesmo e-mail informado no checkout.</p></div>';
  $('#trackingList').innerHTML = active.length ? active.map(trackingCard).join('') : '<div class="emptyAccount"><h3>Nada em transporte</h3><p>Seus próximos envios aparecerão aqui.</p></div>';
  bindOrderButtons();
}

async function loadProducts() {
  try {
    const data = await api('catalog');
    $('#accountProducts').innerHTML = (data.products || []).slice(0, 6).map((product) => `<a href="/#catalogo" class="accountProduct">${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />` : '<span class="productBlank"></span>'}<span><strong>${escapeHtml(product.name)}</strong><small>${Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small></span></a>`).join('') || '<div class="emptyAccount">Catálogo em atualização.</div>';
  } catch { $('#accountProducts').innerHTML = '<div class="emptyAccount">Não foi possível carregar o catálogo.</div>'; }
}

async function loadOrders() { const data = await api('customer/orders'); orders = data.orders; renderAccount(); }

async function openAccount(email) {
  $('#accessGate').hidden = true; $('#accountShell').hidden = false; $('#customerEmail').textContent = email;
  await Promise.all([loadOrders(), loadProducts()]);
}

function showView(name) { $$('.accountView').forEach((view) => view.classList.toggle('is-active', view.id === `account-${name}`)); $$('.accountNav').forEach((button) => button.classList.toggle('is-active', button.dataset.view === name)); }

function bindAccount() {
  $$('.accountNav').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  $$('[data-go]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.go)));
  $('#refreshCustomerOrders').addEventListener('click', loadOrders);
  $('#closeOrderDetail').addEventListener('click', () => $('#orderDetail').close());
  $('#customerLogout').addEventListener('click', async () => { await api('customer/logout', { method: 'POST', body: '{}' }); location.reload(); });
}

async function init() {
  bindLogin(); bindAccount();
  try { const data = await api('customer/session'); await openAccount(data.customer.email); }
  catch { $('#accessGate').hidden = false; }
}

init();
