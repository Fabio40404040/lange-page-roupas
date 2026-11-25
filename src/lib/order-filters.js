import { isPickupOrder } from './order-pickup.js';

const normalize = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function filterOrders(orders, { search = '', status = '', method = '', payment = '' } = {}) {
  const terms = normalize(search).replace(/^#/, '').split(/\s+/).filter(Boolean);
  return orders.filter((order) => {
    if (method && order.payment_method !== method) return false;
    if (payment && order.payment_status !== payment) return false;
    if (status === 'active' && ['completed', 'cancelled'].includes(order.status)) return false;
    if (status === 'picked_up' && !(order.status === 'completed' && isPickupOrder(order))) return false;
    if (status === 'completed' && !(order.status === 'completed' && !isPickupOrder(order))) return false;
    if (status && !['active', 'picked_up', 'completed'].includes(status) && order.status !== status) return false;
    const text = normalize([order.id, order.customer?.name, order.customer?.email, ...(order.items || []).map((item) => item.name)].join(' '));
    return terms.every((term) => text.includes(term));
  });
}
