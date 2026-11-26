import './support.css';
import { escapeReview as html } from './reviews.js';
import { demoSupportRequest, SUPPORT_DEMO_KEY } from './support-demo.js';

export function bindSupport({ mount, role, demo = false, email = '', name = '', onRead = () => {} }) {
  let selected = '', messages = [], hasMore = false, busy = false, dirtyStatus = 'open';
  mount.innerHTML = `<p class="supportMode">${demo ? 'Demonstração: conversa salva somente neste navegador. Abra o suporte do admin demonstrativo para responder.' : 'Fale com a loja sobre pedidos, produtos ou entregas. As respostas ficam neste atendimento.'} Não envie senhas ou dados de cartão.</p><div class="supportWorkspace ${role === 'admin' ? 'supportAdmin' : ''}">${role === 'admin' ? '<aside class="supportInbox"><label>Filtrar conversas<select data-support-filter><option value="all">Todas</option><option value="unread">Não lidas</option><option value="open">Em atendimento</option><option value="resolved">Resolvidas</option></select></label><div data-support-threads></div></aside>' : ''}<section class="supportConversation"><h3 data-support-title>${role === 'admin' ? 'Selecione uma conversa' : 'Seu atendimento com a loja'}</h3><button type="button" class="secondaryButton" data-support-older hidden>Carregar mensagens anteriores</button><div class="supportMessages" data-support-messages aria-label="Histórico de atendimento"></div><p data-support-status></p><form data-support-form><label>Sua mensagem<textarea name="message" maxlength="2000" rows="3" placeholder="Descreva como podemos ajudar. Se necessário, informe o número do pedido." required></textarea></label><div class="supportActions"><button class="primaryButton" type="submit">Enviar mensagem</button>${role === 'admin' ? '<button type="button" class="secondaryButton" data-support-resolve hidden>Marcar como resolvida</button>' : ''}</div></form></section></div><p data-support-feedback role="status" aria-live="polite"></p>`;
  const $ = (selector) => mount.querySelector(selector), form = $('[data-support-form]'), feedback = $('[data-support-feedback]');
  const visible = () => document.visibilityState !== 'hidden' && Boolean(mount.closest('.accountView.is-active, .adminView.is-active'));
  function path(action = '') { return `${role}/support${role === 'admin' && selected ? `/${selected}` : ''}${action ? `/${action}` : ''}`; }
  async function request(method = 'GET', body, query = {}, action = '', list = false) {
    if (demo) return demoSupportRequest(role, email, name, list ? '' : selected, method, { ...body, ...(action ? { action } : {}) }, query);
    const response = await fetch(`/api/${list ? `${role}/support` : path(action)}?${new URLSearchParams(query)}`, { method, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível acessar o suporte. Tente novamente.');
    return data;
  }
  function renderMessages() {
    $('[data-support-messages]').innerHTML = messages.length ? messages.map(m => `<article class="supportMessage ${m.sender_role === role ? 'supportOwn' : ''}"><strong>${m.sender_role === 'admin' ? 'Equipe da loja' : role === 'customer' ? 'Você' : 'Cliente'}</strong><p>${html(m.body)}</p><time>${html(new Date(m.created_at).toLocaleString('pt-BR'))}</time></article>`).join('') : '<p>Envie uma mensagem para iniciar o atendimento.</p>';
    $('[data-support-older]').hidden = !hasMore;
  }
  async function conversation(older = false) {
    if (role === 'admin' && !selected) { form.hidden = true; return; }
    form.hidden = false;
    const target = selected;
    const data = await request('GET', undefined, older && messages.length ? { before: String(messages[0].id) } : {});
    if (target !== selected) return;
    const oldLast = messages.at(-1)?.id;
    // Preserva mensagens antigas carregadas ao atualizar a conversa.
    messages = [...new Map([...(older ? data.messages : messages), ...(older ? messages : data.messages)].map(m => [m.id, m])).values()].sort((a,b) => a.id - b.id);
    hasMore = older ? data.hasMore : messages.length > 50 ? hasMore : data.hasMore;
    dirtyStatus = data.thread?.status || 'open';
    $('[data-support-title]').textContent = role === 'admin' ? `${data.thread?.customer_name || 'Cliente'} · ${data.thread?.customer_email || ''}` : 'Seu atendimento com a loja';
    $('[data-support-status]').textContent = dirtyStatus === 'resolved' ? 'Atendimento resolvido. Uma nova mensagem reabre a conversa.' : 'Em atendimento. A loja responderá assim que possível.';
    const resolve = $('[data-support-resolve]');
    if (resolve) { resolve.hidden = !data.thread; resolve.textContent = dirtyStatus === 'resolved' ? 'Reabrir atendimento' : 'Marcar como resolvida'; }
    renderMessages();
    if (!older && oldLast !== messages.at(-1)?.id) $('[data-support-messages]').scrollTop = $('[data-support-messages]').scrollHeight;
    if (visible() && messages.length) { await request('POST', { throughId: messages.at(-1).id }, {}, 'read'); onRead(); }
  }
  async function refresh() {
    if (busy || !visible()) return; busy = true; const refreshTarget = selected;
    try {
      if (role === 'admin') {
        const data = await request('GET', undefined, { status: $('[data-support-filter]').value }, '', true);
        $('[data-support-threads]').innerHTML = data.threads.map(t => `<button type="button" data-support-thread="${html(t.id)}" class="${t.id === selected ? 'is-selected' : ''}"><strong>${html(t.customer_name)}</strong><span>${html(t.customer_email)}</span><small>${t.status === 'resolved' ? 'Resolvida' : 'Em atendimento'}${t.unread_count ? ` · ${t.unread_count} nova(s)` : ''}</small></button>`).join('') || '<p>Nenhuma conversa para este filtro.</p>';
      }
      await conversation(); feedback.textContent = '';
    } catch (error) { feedback.textContent = error.message; }
    finally { busy = false; if (selected !== refreshTarget) setTimeout(refresh, 0); }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (busy) return;
    const text = form.elements.message.value; busy = true; form.querySelector('[type="submit"]').disabled = true;
    try { await request('POST', { message: text }); form.elements.message.value = ''; feedback.textContent = 'Mensagem enviada.'; }
    catch (error) { feedback.textContent = error.message; return; }
    finally { busy = false; form.querySelector('[type="submit"]').disabled = false; }
    await refresh();
  });
  mount.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-support-thread], [data-support-older], [data-support-resolve]');
    if (!button || busy) return;
    if (button.hasAttribute('data-support-thread')) {
      if (selected !== button.dataset.supportThread && form.elements.message.value.trim() && !confirm('Trocar de conversa descartará a mensagem ainda não enviada. Continuar?')) return;
      if (selected !== button.dataset.supportThread) { selected = button.dataset.supportThread; messages = []; hasMore = false; form.elements.message.value = ''; }
      await refresh(); return;
    }
    busy = true; button.disabled = true;
    try { if (button.hasAttribute('data-support-older')) await conversation(true); else await request('PATCH', { status: dirtyStatus === 'resolved' ? 'open' : 'resolved' }, {}, 'status'); }
    catch (error) { feedback.textContent = error.message; }
    finally { busy = false; button.disabled = false; }
    if (button.hasAttribute('data-support-resolve')) await refresh();
  });
  $('[data-support-filter]')?.addEventListener('change', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('storage', event => { if (event.key === SUPPORT_DEMO_KEY) refresh(); });
  window.addEventListener('supportchange', refresh);
  setInterval(refresh, 10000);
  form.hidden = role === 'admin';
  return { refresh, open: async (id = '') => { if (role === 'admin') { selected = id; messages = []; hasMore = false; } await refresh(); } };
}
