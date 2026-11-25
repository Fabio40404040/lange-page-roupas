import './notifications.css';
import { reviewRequest, escapeReview as html } from './reviews.js';

export function startNotifications({ audience, mount, onOpen, localEvents = () => [] }) {
  mount.innerHTML = '<div class="notificationCenter"><details><summary aria-label="Abrir notificações"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg> Notificações <b class="notificationCount" hidden></b></summary><section class="notificationPanel" aria-label="Notificações"><div class="notificationHeading"><strong>Suas notificações</strong><button type="button" data-read-all>Marcar como lidas</button></div><p class="notificationError" role="status"></p><div class="notificationList"></div></section></details><div class="notificationPrompt" aria-live="polite"></div></div>';
  const list = mount.querySelector('.notificationList');
  const badge = mount.querySelector('.notificationCount');
  const prompt = mount.querySelector('.notificationPrompt');
  const error = mount.querySelector('.notificationError');
  let events = [], recipient = '', busy = false, signature = '';
  const readKey = () => `frswear_notification_reads_demo:${audience}:${recipient}`;
  function localReads() { try { return JSON.parse(localStorage.getItem(readKey()) || '[]'); } catch { return []; } }
  function render() {
    const next = JSON.stringify(events);
    if (next === signature) return;
    signature = next;
    const unread = events.filter((event) => !event.read);
    badge.hidden = !unread.length; badge.textContent = unread.length;
    const invitation = unread.find((event) => event.kind === 'review') || unread[0];
    const button = (event, label) => `<button type="button" data-notification="${html(event.id)}">${label}</button>`;
    prompt.innerHTML = invitation ? `<div><strong>${html(invitation.title)}${invitation.demo ? ' · Teste' : ''}</strong><span>${html(invitation.text)}</span></div>${button(invitation, invitation.kind === 'review' ? 'Avaliar agora' : 'Ver aviso')}` : '';
    prompt.hidden = !invitation;
    list.innerHTML = events.map((event) => `<article class="notificationItem ${event.read ? '' : 'is-unread'}"><strong>${html(event.title)}${event.demo ? ' · Teste' : ''}</strong><p>${html(event.text)}</p>${button(event, event.kind === 'review' ? 'Avaliar produto' : event.kind === 'moderation' ? 'Analisar avaliação' : 'Ver detalhes')}</article>`).join('') || '<p>Nenhuma notificação no momento.</p>';
  }
  async function refresh() {
    if (busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const data = await reviewRequest(`${audience}/notifications`);
      recipient = data.recipient || 'demo';
      const extra = await localEvents(data);
      const demoOrderIds = new Set(extra.map((event) => event.orderId).filter(Boolean));
      const seen = new Set(localReads());
      events = [...data.events.filter((event) => !demoOrderIds.has(event.orderId)), ...extra.map((event) => ({ ...event, demo: true, local: true, read: seen.has(event.id) }))].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      error.textContent = ''; render();
    } catch { error.textContent = 'Não foi possível atualizar os avisos. Tentaremos novamente automaticamente.'; }
    finally { busy = false; }
  }
  async function markRead(selected) {
    const remote = selected.filter((event) => !event.local);
    if (remote.length) await reviewRequest(`${audience}/notifications`, { method: 'POST', body: JSON.stringify({ ids: remote.map((event) => event.id) }) });
    const local = selected.filter((event) => event.local);
    if (local.length) localStorage.setItem(readKey(), JSON.stringify([...new Set([...localReads(), ...local.map((event) => event.id)])]));
    selected.forEach((event) => { event.read = true; }); render();
  }
  mount.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-notification], [data-read-all]'); if (!button) return;
    const selected = button.hasAttribute('data-read-all') ? events.filter((event) => !event.read) : events.filter((event) => event.id === button.dataset.notification);
    try { await markRead(selected); } catch { error.textContent = 'Não foi possível marcar como lida. O aviso continuará disponível.'; }
    if (!button.hasAttribute('data-read-all') && selected[0]) { mount.querySelector('details').open = false; await onOpen(selected[0]); }
  });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('storage', refresh);
  window.addEventListener('notificationschange', refresh);
  setInterval(refresh, 15000);
  refresh();
  return refresh;
}
