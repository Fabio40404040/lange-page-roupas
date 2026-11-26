export const SUPPORT_DEMO_KEY = 'frswear_demo_support_v1';
function read() { try { const rows = JSON.parse(localStorage.getItem(SUPPORT_DEMO_KEY) || '[]'); return Array.isArray(rows) ? rows : []; } catch { return []; } }
function save(threads) { localStorage.setItem(SUPPORT_DEMO_KEY, JSON.stringify(threads)); window.dispatchEvent(new Event('supportchange')); }
export function demoSupportEvents(role, email = '') {
  return read().filter((thread) => role === 'admin' || thread.customer_email === email.toLowerCase()).flatMap((thread) => {
    const last = thread.messages.filter((m) => m.sender_role !== role && m.id > (thread[`${role}_read_id`] || 0)).at(-1);
    return last ? [{ id: `support:${thread.id}:${last.id}`, kind: 'support', threadId: thread.id, title: role === 'admin' ? 'Nova mensagem de cliente' : 'A loja respondeu sua mensagem', text: 'Demonstração: abra o suporte para continuar a conversa.', createdAt: last.created_at }] : [];
  });
}
export function demoSupportRequest(role, email, name, id, method = 'GET', body = {}, query = {}) {
  const threads = read(); email = email.toLowerCase();
  if (role === 'admin' && !id) return { threads: threads.map((t) => ({ ...t, unread_count: t.messages.filter(m => m.sender_role === 'customer' && m.id > (t.admin_read_id || 0)).length })).filter((t) => (!query.status || query.status === 'all' || (query.status === 'unread' ? t.unread_count > 0 : t.status === query.status))) };
  let thread = role === 'admin' ? threads.find(t => t.id === id) : threads.find(t => t.customer_email === email);
  if (method === 'POST' && !body.action) {
    const message = String(body.message || '').trim();
    if (!message || message.length > 2000) throw new Error('Escreva uma mensagem com até 2.000 caracteres.');
    if (!thread) {
      if (role !== 'customer') throw new Error('Conversa não encontrada.');
      thread = { id: crypto.randomUUID(), customer_email: email, customer_name: name, status: 'open', messages: [], customer_read_id: 0, admin_read_id: 0, created_at: new Date().toISOString() }; threads.unshift(thread);
    }
    thread.messages.push({ id: (thread.messages.at(-1)?.id || 0) + 1, sender_role: role, body: message, created_at: new Date().toISOString() });
    thread.status = 'open'; thread.updated_at = new Date().toISOString(); save(threads);
    return { ok: true, threadId: thread.id };
  }
  if (!thread) return { thread: null, messages: [], hasMore: false };
  if (body.action === 'read') {
    const key = `${role}_read_id`;
    thread[key] = Math.max(thread[key] || 0, Math.min(Number(body.throughId) || 0, thread.messages.at(-1)?.id || 0)); save(threads); return { ok: true };
  }
  if (body.action === 'status' && role === 'admin') { thread.status = body.status === 'resolved' ? 'resolved' : 'open'; save(threads); return { ok: true }; }
  const filtered = thread.messages.filter(m => m.id < Number(query.before || Number.MAX_SAFE_INTEGER));
  return { thread: { ...thread, messages: undefined }, messages: filtered.slice(-50), hasMore: filtered.length > 50 };
}
