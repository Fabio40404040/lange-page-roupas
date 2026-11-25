import { orderStatusLabel } from './order-pickup.js';
const newestFirst = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

export function customerEvents(orders, reviews) {
  return orders.flatMap((order) => {
    const short = order.id.split('-')[0].toUpperCase();
    const time = order.updated_at || order.created_at;
    const events = [{ id: `order:${order.id}:${order.status}:${order.payment_status}`, kind: 'order', orderId: order.id, title: `Pedido #${short}: ${orderStatusLabel(order)}`, text: order.payment_status === 'paid' ? 'Pagamento confirmado pela loja.' : order.payment_status === 'pay_on_pickup' ? 'Pagamento na retirada. Acompanhe a preparação do pedido.' : order.payment_status === 'refunded' ? 'Pagamento estornado.' : 'Acompanhe as atualizações do seu pedido.', createdAt: time }];
    if (order.payment_status === 'paid' && order.status !== 'cancelled') {
      const items = [...new Map(order.items.map((item) => [item.id, item])).values()];
      for (const item of items) {
        if (reviews.some((review) => review.order_id === order.id && review.product_id === item.id)) continue;
        events.push({ id: `review:${order.id}:${item.id}`, kind: 'review', orderId: order.id, productId: item.id, title: 'Como foi sua compra?', text: `Pedido #${short}: avalie ${item.name}. Seu pagamento foi confirmado.`, createdAt: time, demo: Boolean(order.demo_status) });
      }
    }
    return events;
  }).concat(reviews.map((review) => ({ id: `review-status:${review.id}:${review.status}:${review.updated_at}`, kind: 'review-status', orderId: review.order_id, productId: review.product_id, title: review.status === 'approved' ? 'Sua avaliação foi aprovada' : review.status === 'pending' ? 'Avaliação recebida' : 'Sua avaliação foi analisada', text: review.status === 'approved' ? `${review.product_name}: depoimento publicado na loja.` : review.status === 'pending' ? 'Obrigada! A loja recebeu seu comentário para aprovação.' : 'O depoimento não foi publicado. Você pode revisar sua avaliação.', createdAt: review.updated_at }))).sort(newestFirst);
}

export function adminEvents(orders, reviews) {
  return orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).map((order) => ({ id: `admin-order:${order.id}:${order.status}:${order.payment_status}`, kind: 'order', orderId: order.id, title: `Pedido #${order.id.split('-')[0].toUpperCase()}`, text: `${order.customer?.name || 'Cliente'} · ${orderStatusLabel(order)}`, createdAt: order.updated_at || order.created_at }))
    .concat(reviews.filter((review) => review.status === 'pending').map((review) => ({ id: `admin-review:${review.id}:${review.updated_at}`, kind: 'moderation', title: 'Nova avaliação para aprovar', text: `${review.author} · ${review.rating} estrelas · ${review.product_name}`, createdAt: review.updated_at })))
    .sort(newestFirst);
}
