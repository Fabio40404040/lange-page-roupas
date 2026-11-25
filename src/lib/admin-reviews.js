import { reviewRequest, escapeReview as html, reviewStatusLabels, notifyReviewsChanged } from './reviews.js';
import { demoReviews, saveDemoReview } from './demo-reviews.js';
const $ = (id) => document.getElementById(id);
let rows = [];
let version = 0;
let searchTimer;

export async function loadAdminReviews(append = false) {
  const current = ++version;
  if (!append) rows = [];
  const offset = rows.length;
  const params = new URLSearchParams({ status: $('reviewStatusFilter').value, rating: $('reviewRatingFilter').value, search: $('reviewSearch').value.trim(), offset: String(offset) });
  $('adminReviewFeedback').textContent = 'Carregando avaliações…';
  $('moreReviewsButton').disabled = true;
  try {
    const data = await reviewRequest(`admin/reviews?${params}`);
    if (data.demo) {
      const session = await reviewRequest('customer/session').catch(() => null);
      const local = session ? demoReviews(session.customer.email).filter((review) => (!params.get('status') || review.status === params.get('status')) && (!params.get('rating') || review.rating === Number(params.get('rating'))) && `${review.author} ${review.product_name} ${review.comment}`.toLowerCase().includes(params.get('search').toLowerCase())) : [];
      data.reviews = [...local, ...data.reviews]; data.total += local.length;
      data.message = 'Demonstração: avaliações de teste são aprovadas somente na prévia deste navegador.';
    }
    if (current !== version) return;
    rows = append ? [...rows, ...data.reviews] : data.reviews;
    $('adminReviewFeedback').textContent = data.message || `${rows.length} de ${data.total} avaliações encontradas.${data.demo ? ' Demonstração: somente suas avaliações, sem permissão para publicar.' : ''}`;
    $('adminReviewList').innerHTML = rows.map((review) => `<article class="reviewModerationCard"><div><strong>${html(review.author)} · ${'★'.repeat(review.rating)}${review.demo ? ' · Teste local' : ''}</strong><span class="statusBadge">${html(reviewStatusLabels[review.status])}</span></div><p>${html(review.product_name)} · Pedido #${html(review.order_id.split('-')[0].toUpperCase())}</p><p class="reviewComment">${html(review.comment)}</p><div class="reviewModerationActions">${[['approved', review.demo ? 'Aprovar na prévia' : 'Aprovar e publicar'], ['rejected', 'Não publicar'], ['pending', 'Voltar para pendentes']].map(([status, label]) => `<button type="button" class="secondaryButton" data-moderate-review="${html(review.id)}" data-status="${status}" ${(data.demo && !review.demo) || review.status === status ? 'disabled' : ''}>${label}</button>`).join('')}</div></article>`).join('') || '<div class="emptyState">Nenhuma avaliação para estes filtros.</div>';
    $('moreReviewsButton').hidden = data.demo || rows.length >= data.total;
  } catch (error) { if (current === version) $('adminReviewFeedback').textContent = error.message; }
  finally { if (current === version) $('moreReviewsButton').disabled = false; }
}

export function bindAdminReviews() {
  ['reviewStatusFilter', 'reviewRatingFilter'].forEach((id) => $(id).addEventListener('change', () => loadAdminReviews()));
  $('reviewSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadAdminReviews(), 250); });
  $('refreshReviewsButton').addEventListener('click', () => loadAdminReviews());
  $('moreReviewsButton').addEventListener('click', () => loadAdminReviews(true));
  $('adminReviewList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-moderate-review]'); if (!button) return;
    button.disabled = true;
    try {
      const review = rows.find((row) => row.id === button.dataset.moderateReview);
      if (review?.demo) saveDemoReview({ ...review, status: button.dataset.status, updated_at: new Date().toISOString() });
      else await reviewRequest(`admin/reviews/${encodeURIComponent(button.dataset.moderateReview)}`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.status }) });
      notifyReviewsChanged();
      await loadAdminReviews();
    } catch (error) { $('adminReviewFeedback').textContent = error.message; button.disabled = false; }
  });
}
