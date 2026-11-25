import { reviewRequest, escapeReview as html, notifyReviewsChanged } from './reviews.js';
import { demoReviews, saveDemoReview } from './demo-reviews.js';
const $ = (id) => document.getElementById(id);
let eligible = [], reviews = [], orders = [], email = '';
let version = 0;

export function setReviewOrders(next, customerEmail) { orders = next; email = customerEmail.toLowerCase(); }
export function localReviewEvents() { return { orders: orders.filter((order) => order.demo_status), reviews: demoReviews(email) }; }

function fillExisting() {
  const form = $('customerReviewForm');
  const item = eligible[Number($('reviewPurchase').value)];
  const review = reviews.find((row) => row.order_id === item?.orderId && row.product_id === item?.productId && Boolean(row.demo) === Boolean(item?.demo));
  form.elements.rating.value = review?.rating || '';
  form.elements.comment.value = review?.comment || '';
  form.elements.publicConsent.checked = false;
  form.querySelector('[type="submit"]').textContent = 'Enviar para aprovação';
  $('reviewFeedback').textContent = item?.demo ? 'Demonstração: avaliação e aprovação ficam somente neste navegador. Nenhum depoimento real será publicado.' : review ? 'Você já avaliou este produto. Ao editar, o comentário volta para aprovação.' : '';
}

export async function loadCustomerReviews(orderId = '', productId = '') {
  const current = ++version;
  try {
    const data = await reviewRequest('customer/reviews');
    if (current !== version) return;
    const localOrders = orders.filter((order) => order.demo_status && order.payment_status === 'paid' && order.status !== 'cancelled');
    const localEligible = localOrders.flatMap((order) => [...new Map(order.items.map((item) => [item.id, item])).values()].map((item) => ({ orderId: order.id, productId: item.id, productName: item.name, demo: true })));
    const localIds = new Set(localOrders.map((order) => order.id));
    eligible = [...data.eligible.filter((item) => !localIds.has(item.orderId)), ...localEligible];
    reviews = [...data.reviews, ...demoReviews(email)];
    const options = orderId ? eligible.filter((item) => item.orderId === orderId) : eligible;
    $('reviewPurchase').innerHTML = '<option value="">Escolha o produto comprado</option>' + options.map((item) => `<option value="${eligible.indexOf(item)}">${html(item.productName)}${item.demo ? ' (teste)' : ''}</option>`).join('');
    const index = eligible.findIndex((item) => (!orderId || item.orderId === orderId) && (!productId || item.productId === productId));
    if (index >= 0) $('reviewPurchase').value = String(index);
    $('customerReviewForm').hidden = options.length === 0;
    $('reviewEligibility').textContent = options.length ? 'Conte como foi sua compra. Sua avaliação será publicada somente após aprovação da loja.' : 'A loja precisa confirmar o pagamento para liberar a avaliação. Pronto para retirar, sozinho, não confirma o pagamento.';
    fillExisting();
  } catch (error) { $('reviewEligibility').textContent = error.message; $('customerReviewForm').hidden = true; }
}

export async function openCustomerReview(orderId, productId = '') {
  $('customerReviewForm').reset();
  $('reviewFeedback').textContent = '';
  $('reviewEligibility').textContent = 'Carregando sua compra…';
  $('customerReviewForm').hidden = true;
  if (!$('customerReviewDialog').open) $('customerReviewDialog').showModal();
  await loadCustomerReviews(orderId, productId);
}

export function bindCustomerReviews() {
  $('closeCustomerReview').addEventListener('click', () => $('customerReviewDialog').close());
  $('reviewPurchase').addEventListener('change', fillExisting);
  $('customerReviewForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const item = eligible[Number($('reviewPurchase').value)];
    if (!item || $('reviewPurchase').value === '') return;
    const button = form.querySelector('[type="submit"]'); button.disabled = true;
    $('reviewFeedback').textContent = 'Enviando avaliação…';
    try {
      if (item.demo) {
        const name = orders.find((order) => order.id === item.orderId)?.customer?.name || 'Cliente';
        saveDemoReview({ id: `demo:${item.orderId}:${item.productId}`, order_id: item.orderId, product_id: item.productId, product_name: item.productName, customer_email: email, author: name.split(' ')[0], rating: Number(form.elements.rating.value), comment: form.elements.comment.value.trim(), status: 'pending', demo: true, updated_at: new Date().toISOString() });
      } else await reviewRequest('customer/reviews', { method: 'POST', body: JSON.stringify({ orderId: item.orderId, productId: item.productId, rating: Number(form.elements.rating.value), comment: form.elements.comment.value, publicConsent: form.elements.publicConsent.checked }) });
      $('reviewFeedback').textContent = item.demo ? 'Avaliação de teste enviada ao painel demonstrativo deste navegador.' : 'Obrigada! Sua avaliação foi enviada e aguarda aprovação da loja.';
      button.textContent = 'Avaliação enviada';
      notifyReviewsChanged();
    } catch (error) { $('reviewFeedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
}
