import './notifications.css';
import { reviewRequest, escapeReview as html } from './reviews.js';

export function startNotifications({ audience, mount, onOpen, localEvents = () => [], localOnly = false, localRecipient = 'demo' }) {
  mount.innerHTML = '<div class="notificationCenter"><details><summary aria-label="Abrir notificações"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg> Notificações <b class="notificationCount" hidden></b></summary><section class="notificationPanel" aria-label="Notificações"><div class="notificationHeading"><strong>Suas notificações</strong><div><button type="button" data-read-all>Marcar como lidas</button><button type="button" data-dismiss-all>Limpar notificações</button></div></div><p class="notificationError" role="status"></p><div class="notificationUndo" hidden><span>Notificações apagadas.</span><button type="button" data-undo-dismiss>Desfazer</button></div><div class="notificationList"></div></section></details><div class="notificationPrompt" aria-live="polite"></div></div>';
  const list = mount.querySelector('.notificationList');
  const badge = mount.querySelector('.notificationCount');
  const prompt = mount.querySelector('.notificationPrompt');
  const error = mount.querySelector('.notificationError');
  const disclosure = mount.querySelector('details');
  document.addEventListener('click', (event) => {
    if (disclosure.open && !disclosure.contains(event.target)) disclosure.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !disclosure.open) return;
    const focusInside = disclosure.contains(document.activeElement);
    disclosure.open = false;
    if (focusInside) disclosure.querySelector('summary').focus();
  });
  let events = [], recipient = '', busy = false, signature = '', removed = [], mutating = false, revision = 0;
  const readKey = () => `frswear_notification_reads_demo:${audience}:${recipient}`;
  const dismissKey = () => `frswear_notification_dismissed_demo:${audience}:${recipient}`;
  function localReads() { try { return JSON.parse(localStorage.getItem(readKey()) || '[]'); } catch { return []; } }
  function localDismissed() { try { return JSON.parse(localStorage.getItem(dismissKey()) || '[]'); } catch { return []; } }
  function signalChange() { try { localStorage.setItem('frswear_notifications_updated', `${Date.now()}:${Math.random()}`); } catch { /* Alteração já salva. */ } }
  function render() {
    mount.querySelector('.notificationUndo').hidden = !removed.length;
    mount.querySelector('[data-dismiss-all]').disabled = !events.length;
    mount.querySelector('[data-read-all]').disabled = !events.some((event) => !event.read);
    const next = JSON.stringify(events);
    if (next === signature) return;
    signature = next;
    const unread = events.filter((event) => !event.read);
    badge.hidden = !unread.length; badge.textContent = unread.length;
    const invitation = unread.find((event) => event.kind === 'review') || unread[0];
    const button = (event, label) => `<button type="button" data-notification="${html(event.id)}">${label}</button>`;
    prompt.innerHTML = invitation ? `<div><strong>${html(invitation.title)}${invitation.demo ? ' · Teste' : ''}</strong><span>${html(invitation.text)}</span></div>${button(invitation, invitation.kind === 'review' ? 'Avaliar agora' : 'Ver aviso')}` : '';
    prompt.hidden = !invitation;
    list.innerHTML = events.map((event) => `<article class="notificationItem ${event.read ? '' : 'is-unread'}"><strong>${html(event.title)}${event.demo ? ' · Teste' : ''}</strong><p>${html(event.text)}</p><div class="notificationActions">${button(event, event.kind === 'review' ? 'Avaliar produto' : event.kind === 'moderation' ? 'Analisar avaliação' : 'Ver detalhes')}<button class="notificationDelete" type="button" data-dismiss="${html(event.id)}" aria-label="Apagar notificação: ${html(event.title)}">Apagar</button></div></article>`).join('') || '<p>Nenhuma notificação no momento.</p>';
  }
  async function refresh() {
    if (busy || mutating || document.visibilityState === 'hidden') return;
    busy = true;
    const current = revision;
    try {
      const data = localOnly ? { recipient: localRecipient, events: [], demo: true } : await reviewRequest(`${audience}/notifications`);
      recipient = data.recipient || 'demo';
      const extra = await localEvents(data);
      if (current !== revision) return;
      const demoOrderIds = new Set(extra.map((event) => event.orderId).filter(Boolean));
      const seen = new Set(localReads());
      const dismissed = new Set(localDismissed());
      events = [...data.events.filter((event) => !demoOrderIds.has(event.orderId)), ...extra.filter((event) => !dismissed.has(event.id)).map((event) => ({ ...event, demo: true, local: true, read: seen.has(event.id) }))].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      error.textContent = ''; render();
    } catch { if (current === revision) error.textContent = 'Não foi possível atualizar os avisos. Tentaremos novamente automaticamente.'; }
    finally { busy = false; }
  }
  async function markRead(selected) {
    const remote = selected.filter((event) => !event.local);
    if (remote.length) await reviewRequest(`${audience}/notifications`, { method: 'POST', body: JSON.stringify({ ids: remote.map((event) => event.id) }) });
    const local = selected.filter((event) => event.local);
    if (local.length) localStorage.setItem(readKey(), JSON.stringify([...new Set([...localReads(), ...local.map((event) => event.id)])]));
    selected.forEach((event) => { event.read = true; }); render();
    signalChange();
  }
  async function dismiss(selected, restore = false) {
    const remote = selected.filter((event) => !event.local);
    if (remote.length) await reviewRequest(`${audience}/notifications`, { method: 'POST', body: JSON.stringify({ action: restore ? 'restore' : 'dismiss', ids: remote.map((event) => event.id) }) });
    const local = selected.filter((event) => event.local);
    if (local.length) {
      const ids = new Set(local.map((event) => event.id));
      localStorage.setItem(dismissKey(), JSON.stringify(restore ? localDismissed().filter((id) => !ids.has(id)) : [...new Set([...localDismissed(), ...ids])]));
      if (restore) localStorage.setItem(readKey(), JSON.stringify([...new Set([...localReads(), ...ids])]));
    }
    if (restore) {
      const existing = new Set(events.map((event) => event.id));
      events = [...events, ...selected.filter((event) => !existing.has(event.id)).map((event) => ({ ...event, read: true }))].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      removed = [];
    }
    else { removed = selected; const ids = new Set(selected.map((event) => event.id)); events = events.filter((event) => !ids.has(event.id)); }
    render(); signalChange();
  }
  mount.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-notification], [data-read-all], [data-dismiss], [data-dismiss-all], [data-undo-dismiss]'); if (!button || mutating) return;
    mutating = true; revision++; button.disabled = true;
    let refreshAfter = false;
    try {
      error.textContent = '';
      if (button.hasAttribute('data-undo-dismiss')) { await dismiss(removed, true); refreshAfter = true; }
      else if (button.hasAttribute('data-dismiss') || button.hasAttribute('data-dismiss-all')) {
        const selected = button.hasAttribute('data-dismiss-all') ? [...events] : events.filter((event) => event.id === button.dataset.dismiss);
        await dismiss(selected);
        mount.querySelector('summary').focus();
      } else {
        const selected = button.hasAttribute('data-read-all') ? events.filter((event) => !event.read) : events.filter((event) => event.id === button.dataset.notification);
        await markRead(selected);
        // Confirmações de avaliação são informativas: encerre o aviso ao abrir.
        if (audience === 'customer' && !button.hasAttribute('data-read-all') && selected[0]?.kind === 'review-status') await dismiss(selected);
        if (!button.hasAttribute('data-read-all') && selected[0]) { mount.querySelector('details').open = false; await onOpen(selected[0]); }
      }
    } catch { error.textContent = 'Não foi possível concluir a ação. Tente novamente; seus pedidos e avaliações continuam preservados.'; }
    finally { mutating = false; revision++; button.disabled = false; render(); }
    if (refreshAfter) await refresh();
  });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('storage', refresh);
  window.addEventListener('notificationschange', refresh);
  window.addEventListener('supportchange', refresh);
  setInterval(refresh, 15000);
  refresh();
  return refresh;
}
