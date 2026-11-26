import '@fontsource-variable/fraunces';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/space-mono/400.css';
import './account.css';
import { bindSupport } from './lib/support-ui.js';
import { demoSupportEvents } from './lib/support-demo.js';
import { setupPwa } from './lib/pwa.js';
import { isPickupOrder, orderStatusLabel } from './lib/order-pickup.js';
import { demoPurchases, demoBuyer, saveDemoBuyer, demoTimeline, DEMO_PURCHASES_KEY } from './lib/demo-checkout.js';
import { applyDemoOrderUpdates, DEMO_ORDER_KEY } from './lib/demo-order-updates.js';
import { noveltyVariants } from './lib/product-variant.js';
import { configureStoreMode, getProducts } from './lib/store.js';
import { bindCustomerReviews, openCustomerReview, setReviewOrders, localReviewEvents } from './lib/customer-reviews.js';
import { startNotifications } from './lib/notifications.js';
import { customerEvents } from './lib/notification-events.js';
import { PRIVACY_VERSION } from './lib/privacy-policy.js';
import { filterCustomerOrders } from './lib/customer-order-filters.js';

setupPwa();

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const money = (cents) => Number(cents || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const paymentLabels = { pending: 'Aguardando pagamento', paid: 'Pago', pay_on_pickup: 'Pagamento na retirada', refunded: 'Estornado' };
const statusLabels = { received: 'Pedido recebido', preparing: 'Em preparação', shipped: 'Enviado', completed: 'Concluído', cancelled: 'Cancelado' };
const shippingLabels = { pending: 'Aguardando preparação', preparing: 'Preparando envio', shipped: 'Em transporte', delivered: 'Entregue', cancelled: 'Envio cancelado' };
let loginEmail = '';
let resendTimer;
let orders = [];
let refreshNotifications;
let profile = null;
let localDemoAccount = false;
let supportPanel, supportDemo = false;

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Não foi possível carregar seus dados.'), { status: response.status });
  return data;
}

function showError(message = '') { $('#accountError').textContent = message; $('#accountError').hidden = !message; }

function startResendCooldown(seconds = 30) {
  clearInterval(resendTimer);
  let remaining = seconds;
  const button = $('#resendCodeButton');
  const render = () => {
    button.disabled = remaining > 0;
    if (remaining <= 0) clearInterval(resendTimer);
    remaining -= 1;
  };
  render();
  resendTimer = setInterval(render, 1000);
}

function bindLogin() {
  $$('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
    const field = button.closest('.passwordField').querySelector('input');
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    button.classList.toggle('is-visible', show);
    button.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  }));
  $$('[data-access]').forEach((button) => button.addEventListener('click', () => {
    const register = button.dataset.access === 'register';
    $('#loginStep').hidden = register; $('#registerStep').hidden = !register; $('#codeStep').hidden = true;
    $$('[data-access]').forEach((item) => item.classList.toggle('is-active', item === button)); showError();
  }));
  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault(); showError();
    const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Entrando…';
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { const data = await api('customer/login', { method: 'POST', body: JSON.stringify(values) }); await openAccount(data.customer); }
    catch (error) { showError(error.message); }
    finally { button.disabled = false; button.textContent = 'Entrar'; }
  });
  $('#registerForm').addEventListener('submit', async (event) => {
    event.preventDefault(); showError();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.password_confirmation) { showError('As senhas não são iguais.'); return; }
    delete values.password_confirmation;
    values.privacyAcknowledged = event.currentTarget.elements.privacyAcknowledged.checked;
    values.privacyVersion = PRIVACY_VERSION;
    const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Criando conta…';
    try {
      const data = await api('customer/register', { method: 'POST', body: JSON.stringify(values) });
      loginEmail = values.email.trim().toLowerCase(); $('#codeEmail').textContent = loginEmail;
      $('#loginStep').hidden = true; $('#registerStep').hidden = true; $('#codeStep').hidden = false; $('#accessTabs').hidden = true;
      $('#demoCode').hidden = !data.devCode; $('#demoCode').textContent = data.devCode ? `Código local: ${data.devCode}` : '';
      startResendCooldown();
      $('#codeForm').elements.code.focus();
    } catch (error) { showError(error.message); }
    finally { button.disabled = false; button.textContent = 'Criar conta e confirmar e-mail'; }
  });
  $('#codeForm').addEventListener('submit', async (event) => {
    event.preventDefault(); showError();
    const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Verificando…';
    try { const data = await api('customer/verify-code', { method: 'POST', body: JSON.stringify({ email: loginEmail, code: event.currentTarget.elements.code.value }) }); await openAccount(data.customer); }
    catch (error) { showError(error.message); }
    finally { button.disabled = false; button.textContent = 'Confirmar e ativar conta'; }
  });
  $('#resendCodeButton').addEventListener('click', async () => {
    showError();
    const button = $('#resendCodeButton'); button.disabled = true; button.textContent = 'Reenviando…';
    try {
      const data = await api('customer/resend-code', { method: 'POST', body: JSON.stringify({ email: loginEmail }) });
      $('#demoCode').hidden = !data.devCode; $('#demoCode').textContent = data.devCode ? `Código local: ${data.devCode}` : '';
      startResendCooldown();
    } catch (error) { showError(error.message); button.disabled = false; }
    finally { button.textContent = 'Reenviar código'; }
  });
  $('#changeEmail').addEventListener('click', () => { $('#registerStep').hidden = false; $('#codeStep').hidden = true; $('#accessTabs').hidden = false; showError(); });
}

function orderCard(order) {
  const statusLabels = { [order.status]: orderStatusLabel(order) };
  const count = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const short = order.id.split('-')[0].toUpperCase();
  return `<article class="customerOrder"><div class="orderTop"><div><span>Pedido #${escapeHtml(short)}</span><small>${order.demo_purchase ? 'DEMONSTRAÇÃO · ' : ''}${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(order.created_at))}</small></div><span class="orderStatus">${escapeHtml(statusLabels[order.status] || order.status)}</span></div><div class="orderSummary"><div><small>Itens</small><strong>${count}</strong></div><div><small>Total</small><strong>${money(order.total_cents / 100)}</strong></div><div><small>Pagamento</small><strong>${escapeHtml(paymentLabels[order.payment_status] || order.payment_status)}</strong></div></div><button class="secondaryButton" data-order="${escapeHtml(order.id)}" type="button">Ver detalhes</button>${order.payment_status === 'paid' && order.status !== 'cancelled' && !order.demo_status ? `<button class="secondaryButton" data-review-order="${escapeHtml(order.id)}" type="button">Avaliar compra</button>` : ''}</article>`;
}

function trackingCard(order) {
  if (order.demo_purchase && !order.demo_manual_status) {
    const steps = demoTimeline(order), remaining = Math.max(0, Math.ceil((Date.parse(order.demo_delivery_at) - Date.now()) / 1000));
    const time = (value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `<article class="trackingCard"><div class="orderTop"><strong>Pedido #${escapeHtml(order.id.split('-')[0].toUpperCase())}</strong><span>Demonstração · sem envio real</span></div><p>${escapeHtml(order.shipping_provider)} · ${escapeHtml(order.shipping_service)} · CEP ${escapeHtml(order.destination_postal_code)}</p><p>Prazo consultado no Sandbox: ${Number(order.delivery_days)} dia(s) útil(eis). Frete simulado: ${money(order.shipping_cents / 100)}.</p><ol class="demoDeliveryTimeline">${steps.map((step) => `<li class="${step.done ? 'is-done' : ''}"><strong>${escapeHtml(step.label)}</strong><span>${time(step.at)} · ${step.done ? 'Simulado' : 'Previsto na demonstração'}</span></li>`).join('')}</ol><p role="status">${remaining ? `Conclusão da simulação às ${time(order.demo_delivery_at)} — faltam ${Math.floor(remaining / 60)} min ${remaining % 60} s.` : 'Entrega simulada concluída. Nenhum produto foi enviado.'}</p><p>Código demonstrativo: ${escapeHtml(order.tracking_code)}</p><button class="secondaryButton" data-order="${escapeHtml(order.id)}" type="button">Ver detalhes</button></article>`;
  }
  const stages = ['received', 'preparing', 'shipped', 'completed'];
  const current = order.status === 'cancelled' ? -1 : Math.max(0, stages.indexOf(order.status));
  const deliveryLabel = order.status === 'cancelled' ? 'Entrega cancelada' : order.status === 'completed' ? 'Entrega concluída' : shippingLabels[order.shipping_status] || order.shipping_status;
  const noTrackingMessage = order.status === 'cancelled' ? 'Esta entrega foi cancelada.' : order.status === 'completed' ? 'Entrega concluída.' : 'O código de rastreio aparecerá aqui assim que o pedido for enviado.';
  return `<article class="trackingCard"><div class="orderTop"><div><span>Pedido #${escapeHtml(order.id.split('-')[0].toUpperCase())}</span><small>${escapeHtml(deliveryLabel)}</small></div>${order.tracking_code ? `<strong class="trackingCode">${escapeHtml(order.tracking_code)}</strong>` : ''}</div><div class="trackingSteps">${stages.map((stage, index) => `<div class="trackingStep ${index <= current ? 'is-done' : ''}"><i></i><span>${statusLabels[stage]}</span></div>`).join('')}</div>${order.tracking_code ? `<p>Transportadora: ${escapeHtml(order.shipping_provider || 'Não informada')} ${order.shipping_service ? `· ${escapeHtml(order.shipping_service)}` : ''}</p>` : `<p>${escapeHtml(noTrackingMessage)}</p>`}</article>`;
}

function pickupCard(order) {
  const stages = ['received', 'ready_for_pickup', 'completed'];
  const labels = ['Pedido recebido', 'Pronto para retirar', 'Retirado'];
  const current = order.status === 'completed' ? 2 : order.status === 'ready_for_pickup' ? 1 : order.status === 'cancelled' ? -1 : 0;
  return `<article class="trackingCard"><div class="orderTop"><span>Pedido #${escapeHtml(order.id.split('-')[0].toUpperCase())}</span><strong>${escapeHtml(orderStatusLabel(order))}</strong></div><div class="trackingSteps">${stages.map((stage, index) => `<div class="trackingStep ${index <= current ? 'is-done' : ''}"><i></i><span>${labels[index]}</span></div>`).join('')}</div><p>${order.status === 'completed' ? 'Retirada confirmada pela loja. Obrigado pela compra!' : order.status === 'cancelled' ? 'Pedido cancelado.' : order.status === 'ready_for_pickup' ? 'Seu pedido está pronto. Apresente o número do pedido na loja.' : 'Aguarde a loja separar os produtos e liberar a retirada.'}</p><p>${escapeHtml(paymentLabels[order.payment_status] || order.payment_status)}</p><button class="secondaryButton" data-order="${escapeHtml(order.id)}" type="button">Ver detalhes</button></article>`;
}

function bindOrderButtons() {
  $$('[data-order]').forEach((button) => button.addEventListener('click', () => showOrder(button.dataset.order)));
  $$('[data-review-order]').forEach((button) => button.addEventListener('click', async () => {
    await openCustomerReview(button.dataset.reviewOrder);
  }));
}

function showOrder(id) {
  const original = orders.find((item) => item.id === id); if (!original) return;
  const order = isPickupOrder(original) ? { ...original, tracking_code: '' } : original;
  const statusLabels = { [order.status]: orderStatusLabel(order) };
  $('#orderDetailContent').innerHTML = `<p class="eyebrow">DETALHES DO PEDIDO</p><h2>#${escapeHtml(order.id.split('-')[0].toUpperCase())}</h2><div class="detailStatus"><span>${escapeHtml(statusLabels[order.status] || order.status)}</span><span>${escapeHtml(paymentLabels[order.payment_status] || order.payment_status)}</span></div><div class="detailItems">${order.items.map((item) => `<div><span>${item.quantity}× ${escapeHtml(item.name)}<small>${escapeHtml(item.size)} · ${escapeHtml(item.color)}</small></span><strong>${money(item.price_cents * item.quantity / 100)}</strong></div>`).join('')}</div>${order.demo_purchase ? `<p>Demonstração local, sem cobrança. Produtos: ${money(order.subtotal_cents / 100)} · Frete: ${money(order.shipping_cents / 100)}</p>` : ''}<div class="detailTotal"><span>Total</span><strong>${money(order.total_cents / 100)}</strong></div>${order.tracking_code ? `<div class="trackingBox"><small>Código de rastreio</small><strong>${escapeHtml(order.tracking_code)}</strong><span>${escapeHtml(order.shipping_provider || '')}</span></div>` : ''}`;
  $('#orderDetail').showModal();
}

function renderAccount() {
  const active = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  $('#accountMetrics').innerHTML = [['Total de pedidos', orders.length], ['Em andamento', active.length], ['Concluídos', orders.filter((order) => order.status === 'completed').length]].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join('');
  $('#latestOrder').innerHTML = orders[0] ? orderCard(orders[0]) : '<div class="emptyAccount"><h3>Nenhum pedido ainda</h3><p>Quando você comprar usando este e-mail, o pedido aparecerá aqui.</p><a href="/#catalogo" class="primaryButton">Ver produtos</a></div>';
  const filtered = filterCustomerOrders(orders, 'orders', $('#customerOrdersFilter').value);
  const deliveries = filterCustomerOrders(orders, 'tracking', $('#customerTrackingFilter').value);
  const pickups = filterCustomerOrders(orders, 'pickup', $('#customerPickupFilter').value);
  $('#customerOrdersCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}.`;
  $('#customerTrackingCount').textContent = `${deliveries.length} ${deliveries.length === 1 ? 'entrega encontrada' : 'entregas encontradas'}.`;
  $('#customerPickupCount').textContent = `${pickups.length} ${pickups.length === 1 ? 'retirada encontrada' : 'retiradas encontradas'}.`;
  $('#customerOrderList').innerHTML = filtered.length ? filtered.map(orderCard).join('') : '<div class="emptyAccount"><h3>Nenhum pedido para este filtro</h3><p>Selecione Todos os pedidos para consultar seu histórico.</p></div>';
  $('#trackingList').innerHTML = deliveries.length ? deliveries.map(trackingCard).join('') : '<div class="emptyAccount"><h3>Nenhuma entrega para este filtro</h3><p>Você pode selecionar Todas as entregas. Pedidos para retirada ficam em Retiradas na loja.</p></div>';
  $('#pickupList').innerHTML = pickups.length ? pickups.map(pickupCard).join('') : '<div class="emptyAccount"><h3>Nenhuma retirada para este filtro</h3><p>Selecione Todas as retiradas para consultar seu histórico.</p></div>';
  bindOrderButtons();
}

let noveltyProducts = [];
let productsLoadVersion = 0;

function renderNoveltyProducts() {
  $('#accountProducts').innerHTML = noveltyProducts.map((product) => `<a href="/#catalogo" class="accountProduct">${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />` : '<span class="productBlank"></span>'}<span><small>Novo${product.colorName ? ` · ${escapeHtml(product.colorName)}` : ''}</small><strong>${escapeHtml(product.name)}</strong><small>${Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small></span></a>`).join('') || '<div class="emptyAccount">Nenhuma novidade no momento. Confira todos os produtos na loja.</div>';
}

async function loadProducts() {
  const version = ++productsLoadVersion;
  try {
    const [data, adminSession] = await Promise.all([api('catalog'), api('auth/session').catch(() => null)]);
    if (version !== productsLoadVersion) return;
    const demo = adminSession?.access === 'demo' || new URLSearchParams(location.search).get('preview') === 'demo';
    configureStoreMode({ localOnly: demo, namespace: demo ? 'demo_v4' : '' });
    noveltyProducts = noveltyVariants(demo ? getProducts() : data.products || []);
    $('#noveltyDemoNotice').hidden = !demo;
    $('#account-products a.secondaryButton').href = demo ? '/?preview=demo#catalogo' : '/#catalogo';
    renderNoveltyProducts();
  } catch {
    if (version !== productsLoadVersion) return;
    if (!noveltyProducts.length) $('#accountProducts').innerHTML = '<div class="emptyAccount">Não foi possível carregar o catálogo.</div>';
  }
}

let orderLoadVersion = 0;
async function loadOrders() {
  const version = ++orderLoadVersion;
  const [data, adminSession] = await Promise.all([(localDemoAccount ? Promise.resolve({ orders: [] }) : api('customer/orders')), api('auth/session').catch(() => null)]);
  if (version !== orderLoadVersion) return;
  // A cliente pode continuar conectada após sair/expirar a sessão do admin.
  // A simulação pertence aos seus pedidos neste navegador, não ao cookie
  // administrativo. As compras demonstrativas são identificadas separadamente.
  const fullAdmin = ['owner', 'client'].includes(adminSession?.access);
  const combined = [...demoPurchases($('#customerEmail').textContent), ...(data.orders || [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  orders = fullAdmin && !localDemoAccount ? combined : applyDemoOrderUpdates(combined);
  setReviewOrders(orders, $('#customerEmail').textContent);
  $('#demoOrderStatusNotice').hidden = !orders.some((order) => order.demo_status);
  renderAccount();
  refreshNotifications?.();
}

async function loadProfile() {
  const data = localDemoAccount ? { profile: demoBuyer() } : await api('customer/profile'); profile = data.profile;
  const form = $('#profileForm');
  Object.entries(profile).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value || ''; });
  $('#customerEmail').textContent = profile.email;
  $('#customerWelcome').textContent = `Olá, ${profile.name.split(' ')[0]}.`;
}

async function openAccount(customer) {
  $('#accessGate').hidden = true; $('#accountShell').hidden = false; $('#customerEmail').textContent = customer.email;
  await Promise.all([loadOrders(), loadProducts(), loadProfile()]);
  if (!supportPanel) {
    const adminAccess = await api('auth/session').catch(() => null);
    supportDemo = localDemoAccount || adminAccess?.access === 'demo' || new URLSearchParams(location.search).get('preview') === 'demo';
    supportPanel = bindSupport({ mount: $('#customerSupport'), role: 'customer', demo: supportDemo, email: customer.email, name: customer.name || profile?.name || 'Cliente', onRead: () => refreshNotifications?.() });
  }
  if (!refreshNotifications) refreshNotifications = startNotifications({ audience: 'customer', localOnly: localDemoAccount, localRecipient: customer.email, mount: $('#customerNotifications'), localEvents: () => { const local = localReviewEvents(); return [...customerEvents(local.orders, local.reviews), ...(supportDemo ? demoSupportEvents('customer', customer.email) : [])]; }, onOpen: async (event) => {
    if (event.kind === 'support') { showView('support'); await supportPanel.open(); return; }
    if (event.kind === 'review-status') {
      $('#reviewNoticeTitle').textContent = event.title;
      $('#reviewNoticeText').textContent = `${event.text} Nenhuma nova autorização é necessária.`;
      $('#reviewNoticeDialog').showModal();
      return;
    }
    await loadOrders();
    if (event.kind === 'review') await openCustomerReview(event.orderId, event.productId); else showOrder(event.orderId);
  } });
  const requestedView = new URLSearchParams(location.search).get('view');
  if (['overview', 'orders', 'pickup', 'tracking', 'products', 'profile', 'support'].includes(requestedView)) showView(requestedView);
  const reviewOrder = new URLSearchParams(location.search).get('reviewOrder');
  if (reviewOrder || requestedView === 'reviews') await openCustomerReview(reviewOrder || '', new URLSearchParams(location.search).get('reviewProduct') || '');
}

function showView(name) { if (name === 'support') setTimeout(() => supportPanel?.refresh(), 0); $$('.accountView').forEach((view) => view.classList.toggle('is-active', view.id === `account-${name}`)); $$('.accountNav').forEach((button) => button.classList.toggle('is-active', button.dataset.view === name)); }

function bindAccount() {
  bindCustomerReviews();
  ['customerOrdersFilter', 'customerPickupFilter', 'customerTrackingFilter'].forEach((id) => $(`#${id}`).addEventListener('change', renderAccount));
  $('#downloadPrivacyData').addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try {
      const data = await api('customer/privacy-export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'meus-dados-da-loja.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('#privacyDataMessage').textContent = 'Cópia dos seus dados gerada. Confira os downloads do navegador.';
    } catch (error) { $('#privacyDataMessage').textContent = error.message; }
    finally { button.disabled = false; }
  });
  const refreshProducts = () => { if (!$('#accountShell').hidden) loadProducts(); };
  window.addEventListener('focus', refreshProducts);
  window.addEventListener('storage', (event) => {
    if (['frswear_catalog_published', 'frswear_products_v2_demo_v4'].includes(event.key)) refreshProducts();
  });
  setInterval(() => { if (document.visibilityState === 'visible') refreshProducts(); }, 30000);
  const refreshOrders = () => {
    if (!$('#accountShell').hidden) loadOrders().catch(console.error);
  };
  window.addEventListener('focus', refreshOrders);
  window.addEventListener('storage', (event) => { if (event.key === 'frswear_orders_updated' || event.key === DEMO_ORDER_KEY || event.key === DEMO_PURCHASES_KEY) refreshOrders(); });
  window.addEventListener('notificationschange', refreshOrders);
  window.addEventListener('demoorderschange', refreshOrders);
  setInterval(() => { if (document.visibilityState === 'visible') refreshOrders(); }, 5000);
  $$('.accountNav').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  $$('[data-go]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.go)));
  $('#refreshCustomerOrders').addEventListener('click', loadOrders);
  $('#refreshPickupOrders').addEventListener('click', refreshOrders);
  $('#closeOrderDetail').addEventListener('click', () => $('#orderDetail').close());
  $('#customerLogout').addEventListener('click', async () => { if (localDemoAccount) { location.href = '/conta'; return; } await api('customer/logout', { method: 'POST', body: '{}' }); location.reload(); });
  $('#profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      if (localDemoAccount) saveDemoBuyer({ ...profile, ...Object.fromEntries(new FormData(event.currentTarget)) });
      else await api('customer/profile', { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      await loadProfile(); $('#profileMessage').textContent = 'Dados atualizados com sucesso.'; $('#profileMessage').hidden = false;
    } catch (error) { $('#profileMessage').textContent = error.message; $('#profileMessage').hidden = false; }
    finally { button.disabled = false; }
  });
}

async function init() {
  bindLogin(); bindAccount();
  if (new URLSearchParams(location.search).get('preview') === 'demo' && demoBuyer()) {
    localDemoAccount = true;
    document.querySelector('.cartLink').href = '/?preview=demo&cart=open';
    await openAccount(demoBuyer());
    return;
  }
  try { const data = await api('customer/session'); await openAccount(data.customer); }
  catch { $('#accessGate').hidden = false; }
}

init();
