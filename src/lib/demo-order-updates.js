export const DEMO_ORDER_KEY = 'frswear_demo_order_updates_v1';

function readUpdates() {
  try { return JSON.parse(localStorage.getItem(DEMO_ORDER_KEY) || '{}') || {}; }
  catch { return {}; }
}

export function saveDemoOrderUpdate(order, values) {
  const updates = readUpdates();
  updates[order.id] = {
    email: String(order.customer?.email || '').toLowerCase(),
    status: values.status,
    payment_status: values.payment_status,
    shipping_status: values.shipping_status,
    tracking_code: values.tracking_code || '',
    shipping_provider: values.shipping_provider || '',
    shipping_service: values.shipping_service || '',
  };
  localStorage.setItem(DEMO_ORDER_KEY, JSON.stringify(updates));
}

export function applyDemoOrderUpdates(orders) {
  const updates = readUpdates();
  return orders.map((order) => {
    const update = updates[order.id];
    if (!update?.email || update.email !== String(order.customer?.email || '').toLowerCase()) return order;
    const { email, ...values } = update;
    return { ...order, ...values, demo_status: true };
  });
}
