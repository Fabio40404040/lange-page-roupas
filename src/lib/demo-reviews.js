export const DEMO_REVIEWS_KEY = 'frswear_demo_reviews_v1';
export function demoReviews(email = '') {
  try { return JSON.parse(localStorage.getItem(DEMO_REVIEWS_KEY) || '[]').filter((row) => !email || row.customer_email === email.toLowerCase()); } catch { return []; }
}
export function saveDemoReview(review) {
  const rows = demoReviews();
  const index = rows.findIndex((row) => row.id === review.id);
  if (index >= 0) rows[index] = review; else rows.push(review);
  localStorage.setItem(DEMO_REVIEWS_KEY, JSON.stringify(rows));
}
