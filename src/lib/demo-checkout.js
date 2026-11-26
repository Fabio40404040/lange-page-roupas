// Pedidos de apresentação ficam exclusivamente neste navegador.
export const DEMO_PURCHASES_KEY = 'frswear_demo_purchases_v1';
const PROFILE_KEY = 'frswear_demo_buyer_v1';
export const DEMO_DELIVERY_MS = 120000;
export const DEMO_STEPS = [
  ['Pedido recebido', 0], ['Pagamento aprovado', 8000], ['Em preparação', 25000],
  ['Enviado à transportadora', 50000], ['Saiu para entrega', 85000], ['Entregue', DEMO_DELIVERY_MS],
];
function rows() {
  try { const value = JSON.parse(localStorage.getItem(DEMO_PURCHASES_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}
function notify() {
  try { localStorage.setItem('frswear_orders_updated', `${Date.now()}:demo`); } catch { /* O pedido já está salvo. */ }
  window.dispatchEvent(new Event('demoorderschange'));
}
export function demoBuyer() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; } }
export function saveDemoBuyer(profile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
export function demoTimeline(order, now = Date.now()) {
  const created = Date.parse(order.created_at), elapsed = Math.max(0, now - created);
  return DEMO_STEPS.map(([label, offset]) => ({ label, at: new Date(created + offset).toISOString(), done: elapsed >= offset }));
}
export function demoPurchases(email = '', now = Date.now()) {
  return rows().filter((order) => !email || order.customer.email.toLowerCase() === email.toLowerCase()).map((order) => {
    const elapsed = Math.max(0, now - Date.parse(order.created_at));
    const pickup = order.payment_method === 'retirada';
    const delivered = elapsed >= DEMO_DELIVERY_MS;
    const status = delivered ? 'completed' : pickup ? (elapsed >= 25000 ? 'ready_for_pickup' : 'received') : elapsed >= 50000 ? 'shipped' : elapsed >= 25000 ? 'preparing' : 'received';
    return { ...order, status, payment_status: pickup ? (delivered ? 'paid' : 'pay_on_pickup') : elapsed >= 8000 ? 'paid' : 'pending',
      shipping_status: pickup ? (delivered ? 'picked_up' : elapsed >= 25000 ? 'ready_for_pickup' : 'awaiting_pickup') : delivered ? 'delivered' : elapsed >= 50000 ? 'shipped' : elapsed >= 25000 ? 'preparing' : 'pending' };
  });
}
export function createDemoPurchase({ quote, customer, address = {}, method, shipping, now = Date.now() }) {
  if (!['pix', 'cartao', 'retirada'].includes(method)) throw new Error('Escolha uma forma de pagamento.');
  if (!quote?.items?.length || !Number.isSafeInteger(quote.totalCents) || quote.totalCents < 0) throw new Error('Revise o carrinho da demonstração.');
  if (method !== 'retirada' && (!shipping || !Number.isSafeInteger(shipping.priceCents) || shipping.priceCents < 0 || shipping.subtotalCents !== quote.totalCents || now - shipping.quotedAt > 900000)) throw new Error('Calcule o frete e selecione uma opção válida antes de finalizar a entrega.');
  const freight = method === 'retirada' ? 0 : shipping.priceCents;
  const order = { id: crypto.randomUUID(), demo_purchase: true, demo_status: true, customer: { ...customer, email: customer.email.toLowerCase() }, address,
    created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
    items: quote.items.map((item) => ({ id: item.id, name: item.name, size: item.size, color: item.color, quantity: item.quantity, price_cents: item.unitPriceCents })),
    subtotal_cents: quote.totalCents, shipping_cents: freight, total_cents: quote.totalCents + freight, payment_method: method,
    shipping_provider: method === 'retirada' ? '' : shipping.company, shipping_service: method === 'retirada' ? '' : shipping.service,
    delivery_days: method === 'retirada' ? null : shipping.deliveryDays, destination_postal_code: method === 'retirada' ? '' : shipping.postalCode,
    tracking_code: method === 'retirada' ? '' : `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    demo_delivery_at: new Date(now + DEMO_DELIVERY_MS).toISOString(),
  };
  // Falha de armazenamento não pode apagar o carrinho nem criar pedido real.
  saveDemoBuyer({ ...address, ...customer });
  localStorage.setItem(DEMO_PURCHASES_KEY, JSON.stringify([order, ...rows()].slice(0, 100)));
  notify();
  return demoPurchases(customer.email, now).find((row) => row.id === order.id);
}
