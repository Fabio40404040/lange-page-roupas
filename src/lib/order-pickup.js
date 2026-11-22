export const isPickupOrder = (order) => order.payment_method === 'retirada' || ['awaiting_pickup', 'ready_for_pickup', 'picked_up'].includes(order.shipping_status);

export function orderStatusLabel(order) {
  if (isPickupOrder(order)) {
    return { received: 'Pedido recebido', preparing: 'Separando para retirada', ready_for_pickup: 'Pronto para retirar', completed: 'Retirado', cancelled: 'Cancelado' }[order.status] || 'Aguardando retirada';
  }
  return { received: 'Pedido recebido', preparing: 'Em preparação', shipped: 'Enviado', completed: 'Concluído', cancelled: 'Cancelado' }[order.status] || order.status;
}

export function pickupUpdate(order, values) {
  if (!isPickupOrder(order)) return values;
  if (values.status === 'shipped') throw new Error('Este pedido é para retirada na loja. Use Pronto para retirar ou Retirado.');
  return {
    ...values,
    shipping_status: values.status === 'completed' ? 'picked_up' : values.status === 'cancelled' ? 'cancelled' : values.status === 'ready_for_pickup' ? 'ready_for_pickup' : 'awaiting_pickup',
    tracking_code: '', shipping_provider: '', shipping_service: '',
  };
}
