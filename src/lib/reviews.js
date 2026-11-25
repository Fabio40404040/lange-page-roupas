export const reviewStatusLabels = { pending: 'Aguardando aprovação', approved: 'Aprovada', rejected: 'Não publicada' };
export const escapeReview = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export async function reviewRequest(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: 'include', cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível acessar as avaliações.');
  return data;
}
export function notifyReviewsChanged() {
  try { localStorage.setItem('frswear_reviews_updated', `${Date.now()}:${Math.random()}`); } catch { /* Dados já salvos no servidor. */ }
  window.dispatchEvent(new Event('notificationschange'));
}
