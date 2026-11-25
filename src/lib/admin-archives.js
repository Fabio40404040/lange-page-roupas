import { reviewRequest } from './reviews.js';
export const ADMIN_ARCHIVES_KEY = 'frswear_admin_demo_archives_v1';
function read() { try { return JSON.parse(localStorage.getItem(ADMIN_ARCHIVES_KEY) || '{}') || {}; } catch { return {}; } }
export function applyLocalArchives(rows, entity) {
  const saved = read()[entity] || {};
  return rows.map((row) => { const id = entity === 'orders' ? row.id : row.email; return Object.hasOwn(saved, id) ? { ...row, archived_at: saved[id] } : row; });
}
export function matchesArchive(row, scope = 'active') { return scope === 'all' || (scope === 'archived' ? Boolean(row.archived_at) : !row.archived_at); }
export function confirmArchive(entity) {
  const dialog = document.getElementById('archiveConfirmDialog');
  document.getElementById('archiveConfirmTitle').textContent = entity === 'orders' ? 'Arquivar pedido?' : 'Arquivar cliente?';
  document.getElementById('archiveConfirmText').textContent = entity === 'orders' ? 'O pedido sairá da lista principal do admin. O histórico da cliente, o pagamento e o estoque serão mantidos. Você poderá restaurar pelo filtro Arquivados.' : 'O cliente sairá da lista principal do admin. A conta, o acesso à loja e o histórico de compras serão mantidos. Você poderá restaurar pelo filtro Arquivados.';
  dialog.returnValue = '';
  return new Promise((resolve) => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'archive'), { once: true }); dialog.showModal(); });
}
export async function changeArchive(entity, id, archived, demo = false) {
  if (demo) {
    const saved = read(); saved[entity] ||= {}; saved[entity][id] = archived ? new Date().toISOString() : null;
    localStorage.setItem(ADMIN_ARCHIVES_KEY, JSON.stringify(saved));
  } else await reviewRequest(`admin/${entity}/${encodeURIComponent(id)}/archive`, { method: 'PATCH', body: JSON.stringify({ archived }) });
  try { localStorage.setItem('frswear_admin_archives_updated', `${Date.now()}:${id}`); } catch { /* O arquivamento já foi salvo. */ }
  window.dispatchEvent(new Event('notificationschange'));
}
