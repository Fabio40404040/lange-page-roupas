import { reviewRequest, escapeReview as html, reviewStatusLabels, notifyReviewsChanged } from './reviews.js';
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
    if (current !== version) return;
    rows = append ? [...rows, ...data.reviews] : data.reviews;
    $('adminReviewFeedback').textContent = data.message || `${rows.length} de ${data.total} avaliações encontradas.${data.demo ? ' Demonstração: somente suas avaliações, sem permissão para publicar.' : ''}`;
    $('adminReviewList').innerHTML = rows.map((review) => `<article class="reviewModerationCard"><div><strong>${html(review.author)} · ${'★'.repeat(review.rating)}</strong><span class="statusBadge">${html(reviewStatusLabels[review.status])}</span></div><p>${html(review.product_name)} · Pedido #${html(review.order_id.split('-')[0].toUpperCase())}</p><p class="reviewComment">${html(review.comment)}</p><div class="reviewModerationActions">${[['approved', 'Aprovar e publicar'], ['rejected', 'Não publicar'], ['pending', 'Voltar para pendentes']].map(([status, label]) => `<button type="button" class="secondaryButton" data-moderate-review="${html(review.id)}" data-status="${status}" ${data.demo || review.status === status ? 'disabled' : ''}>${label}</button>`).join('')}</div></article>`).join('') || '<div class="emptyState">Nenhuma avaliação para estes filtros.</div>';
    $('moreReviewsButton').hidden = rows.length >= data.total;
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
      await reviewRequest(`admin/reviews/${encodeURIComponent(button.dataset.moderateReview)}`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.status }) });
      notifyReviewsChanged();
      await loadAdminReviews();
    } catch (error) { $('adminReviewFeedback').textContent = error.message; button.disabled = false; }
  });
}
