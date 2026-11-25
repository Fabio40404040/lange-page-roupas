import { isPickupOrder } from './order-pickup.js';

export function filterCustomerOrders(orders, scope, status = 'all') {
  return orders.filter((order) => {
    if (scope === 'pickup' && !isPickupOrder(order)) return false;
    if (scope === 'tracking' && isPickupOrder(order)) return false;
    if (status === 'all') return true;
    if (status === 'active') return !['completed', 'cancelled'].includes(order.status);
    if (status === 'preparing') return ['received', 'preparing'].includes(order.status);
    return order.status === status;
  });
}
