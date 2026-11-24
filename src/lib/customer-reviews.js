import { reviewRequest, escapeReview as html, reviewStatusLabels, notifyReviewsChanged } from './reviews.js';
const $ = (id) => document.getElementById(id);
let eligible = [];
let reviews = [];
let version = 0;

export async function loadCustomerReviews(orderId = '') {
  const current = ++version;
  try {
    const data = await reviewRequest('customer/reviews');
    if (current !== version) return;
    eligible = data.eligible; reviews = data.reviews;
    $('reviewPurchase').innerHTML = '<option value="">Escolha o produto comprado</option>' + eligible.map((item, index) => `<option value="${index}">#${html(item.orderId.split('-')[0].toUpperCase())} · ${html(item.productName)}</option>`).join('');
    if (orderId) {
      const index = eligible.findIndex((item) => item.orderId === orderId);
      if (index >= 0) $('reviewPurchase').value = String(index);
    }
    $('customerReviewForm').hidden = eligible.length === 0;
    $('reviewEligibility').textContent = eligible.length ? 'Avalie um produto de um pedido com pagamento confirmado pela loja. Sua avaliação será publicada somente após aprovação.' : 'As avaliações serão liberadas quando a loja confirmar o pagamento de um pedido. Pagamentos e retiradas simulados no admin não liberam avaliações reais.';
    $('myReviews').innerHTML = reviews.map((review) => `<article class="customerOrder"><strong>${html(review.product_name)}</strong><p>${'★'.repeat(review.rating)} · ${html(reviewStatusLabels[review.status])}</p><p class="reviewComment">${html(review.comment)}</p>${eligible.some((item) => item.orderId === review.order_id && item.productId === review.product_id) ? `<button class="secondaryButton" type="button" data-edit-review="${html(review.id)}">Editar avaliação</button>` : ''}</article>`).join('') || '<p>Você ainda não enviou avaliações.</p>';
  } catch (error) { $('reviewEligibility').textContent = error.message; }
}

export function bindCustomerReviews() {
  $('customerReviewForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const item = eligible[Number($('reviewPurchase').value)];
    if (!item || $('reviewPurchase').value === '') return;
    const button = form.querySelector('[type="submit"]'); button.disabled = true;
    $('reviewFeedback').textContent = 'Enviando avaliação…';
    try {
      await reviewRequest('customer/reviews', { method: 'POST', body: JSON.stringify({ orderId: item.orderId, productId: item.productId, rating: Number(form.elements.rating.value), comment: form.elements.comment.value, publicConsent: form.elements.publicConsent.checked }) });
      form.reset();
      $('reviewFeedback').textContent = 'Avaliação enviada. Ela está aguardando aprovação da loja.';
      notifyReviewsChanged();
      await loadCustomerReviews();
    } catch (error) { $('reviewFeedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('myReviews').addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit-review]'); if (!button) return;
    const review = reviews.find((item) => item.id === button.dataset.editReview); if (!review) return;
    const index = eligible.findIndex((item) => item.orderId === review.order_id && item.productId === review.product_id); if (index < 0) return;
    const form = $('customerReviewForm');
    $('reviewPurchase').value = String(index);
    form.elements.rating.value = review.rating;
    form.elements.comment.value = review.comment;
    form.elements.publicConsent.checked = false;
    form.elements.comment.focus();
    $('reviewFeedback').textContent = 'Ao editar, a avaliação volta à fila de aprovação.';
  });
}
