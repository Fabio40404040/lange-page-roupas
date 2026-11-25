import { reviewRequest, escapeReview as html, notifyReviewsChanged, reviewStatusLabels } from './reviews.js';
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
  const saved = Boolean(review);
  $('customerReviewTitle').textContent = saved ? 'Sua avaliação' : 'Avalie sua compra';
  $('reviewEligibility').textContent = saved ? (review.withdrawn_at ? 'Seu depoimento não está publicado.' : review.status === 'approved' ? 'Sua avaliação já foi aprovada e publicada. Obrigada por compartilhar sua experiência.' : 'Sua avaliação já foi enviada. Acompanhe a situação abaixo.') : 'Conte como foi sua compra. Sua avaliação será publicada somente após aprovação da loja.';
  ['rating', 'comment', 'publicConsent'].forEach((name) => { form.elements[name].closest('label').hidden = saved; form.elements[name].disabled = saved; });
  form.querySelector('[type="submit"]').hidden = saved;
  $('existingReview').hidden = !saved;
  if (saved) {
    $('existingReviewStatus').textContent = review.withdrawn_at ? 'Autorização de publicação retirada' : reviewStatusLabels[review.status];
    $('existingReviewComment').textContent = `${'★'.repeat(review.rating)} · ${review.comment}`;
    $('editCustomerReview').disabled = Boolean(item.readOnly);
    $('withdrawCustomerReview').hidden = Boolean(review.withdrawn_at);
  }
  form.querySelector('[type="submit"]').textContent = 'Enviar para aprovação';
  $('reviewFeedback').textContent = item?.demo ? 'Demonstração: avaliação e aprovação ficam somente neste navegador.' : review ? 'Você já avaliou este produto. Não é necessário autorizar novamente. Só uma edição voluntária volta para aprovação.' : '';
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
    for (const review of reviews) if (!eligible.some((item) => item.orderId === review.order_id && item.productId === review.product_id && Boolean(item.demo) === Boolean(review.demo))) eligible.push({ orderId: review.order_id, productId: review.product_id, productName: review.product_name, demo: Boolean(review.demo), readOnly: true });
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
  $('existingReview').hidden = true;
  if (!$('customerReviewDialog').open) $('customerReviewDialog').showModal();
  await loadCustomerReviews(orderId, productId);
}

export function bindCustomerReviews() {
  $('closeCustomerReview').addEventListener('click', () => $('customerReviewDialog').close());
  $('reviewPurchase').addEventListener('change', fillExisting);
  $('editCustomerReview').addEventListener('click', () => {
    const form = $('customerReviewForm');
    ['rating', 'comment', 'publicConsent'].forEach((name) => { form.elements[name].closest('label').hidden = false; form.elements[name].disabled = false; });
    form.querySelector('[type="submit"]').hidden = false;
    $('existingReview').hidden = true;
    $('reviewFeedback').textContent = 'Ao salvar uma edição, autorize a publicação da nova versão. Ela passará por aprovação da loja.';
    form.elements.comment.focus();
  });
  $('withdrawCustomerReview').addEventListener('click', async () => {
    const item = eligible[Number($('reviewPurchase').value)];
    const review = reviews.find((row) => row.order_id === item?.orderId && row.product_id === item?.productId && Boolean(row.demo) === Boolean(item?.demo));
    if (!review) return;
    const button = $('withdrawCustomerReview'); button.disabled = true;
    try {
      if (review.demo) saveDemoReview({ ...review, status: 'rejected', withdrawn_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      else await reviewRequest(`customer/reviews/${encodeURIComponent(review.id)}/withdraw`, { method: 'POST', body: '{}' });
      notifyReviewsChanged(); await loadCustomerReviews(item.orderId, item.productId);
      $('reviewFeedback').textContent = 'Autorização retirada. Seu depoimento não será mais exibido na loja.';
    } catch (error) { $('reviewFeedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('customerReviewForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const item = eligible[Number($('reviewPurchase').value)];
    if (!item || $('reviewPurchase').value === '') return;
    const button = form.querySelector('[type="submit"]'); button.disabled = true;
    if (button.hidden) { button.disabled = false; return; }
    $('reviewFeedback').textContent = 'Enviando avaliação…';
    try {
      if (item.demo) {
        const name = orders.find((order) => order.id === item.orderId)?.customer?.name || 'Cliente';
        saveDemoReview({ id: `demo:${item.orderId}:${item.productId}`, order_id: item.orderId, product_id: item.productId, product_name: item.productName, customer_email: email, author: name.split(' ')[0], rating: Number(form.elements.rating.value), comment: form.elements.comment.value.trim(), status: 'pending', demo: true, withdrawn_at: null, public_consent_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      } else await reviewRequest('customer/reviews', { method: 'POST', body: JSON.stringify({ orderId: item.orderId, productId: item.productId, rating: Number(form.elements.rating.value), comment: form.elements.comment.value, publicConsent: form.elements.publicConsent.checked }) });
      notifyReviewsChanged();
      await loadCustomerReviews(item.orderId, item.productId);
    } catch (error) { $('reviewFeedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
}
