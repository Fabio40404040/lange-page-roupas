// Toda conversa pertence ao e-mail da sessão autenticada, nunca ao corpo enviado.
export async function handleSupport(context, path, { reply, requireCustomer, requireAdmin }) {
  const match = path.match(/^(customer|admin)\/support(?:\/([a-f0-9-]{36}))?(?:\/(read|status))?$/);
  if (!match) return null;
  const { request, env } = context, own = match[1] === 'customer';
  const access = await (own ? requireCustomer : requireAdmin)(context);
  if (access.response) return access.response;
  if (!own && access.session.access === 'demo') return reply({ error: 'O suporte demonstrativo fica somente neste navegador.' }, 403);
  const email = own ? access.customer.email.toLowerCase() : null;
  const url = new URL(request.url), id = match[2], action = match[3];
  if (own && id) return reply({ error: 'Conversa não encontrada.' }, 404);
  try {
    if (!own && !id && request.method === 'GET') {
      const filter = url.searchParams.get('status') || 'all';
      if (!['all', 'open', 'resolved', 'unread'].includes(filter)) return reply({ error: 'Filtro inválido.' }, 400);
      const threads = await env.DB.prepare(`SELECT t.*, (SELECT count(*) FROM support_messages m WHERE m.thread_id = t.id AND m.sender_role = 'customer' AND m.id > t.admin_read_id) AS unread_count FROM support_threads t ORDER BY t.updated_at DESC LIMIT 200`).all();
      const search = (url.searchParams.get('search') || '').trim().toLowerCase().slice(0, 100);
      return reply({ threads: threads.results.filter((t) => (filter === 'all' || (filter === 'unread' ? t.unread_count > 0 : t.status === filter)) && (!search || `${t.customer_name} ${t.customer_email}`.toLowerCase().includes(search))) });
    }
    let thread = own ? await env.DB.prepare('SELECT * FROM support_threads WHERE customer_email = ?').bind(email).first() : id ? await env.DB.prepare('SELECT * FROM support_threads WHERE id = ?').bind(id).first() : null;
    if (own && !thread && request.method === 'GET') return reply({ thread: null, messages: [], hasMore: false });
    if (request.method === 'POST' && !action) {
      if (!own && !thread) return reply({ error: 'Conversa não encontrada.' }, 404);
      const body = await request.json().catch(() => null);
      if (typeof body?.message !== 'string' || !body.message.trim() || body.message.trim().length > 2000) return reply({ error: 'Escreva uma mensagem com até 2.000 caracteres.' }, 400);
      const now = new Date().toISOString();
      if (own && thread) {
        const recent = await env.DB.prepare("SELECT count(*) AS count FROM support_messages WHERE thread_id = ? AND sender_role = 'customer' AND created_at > ?").bind(thread.id, new Date(Date.now() - 60000).toISOString()).first();
        if (recent.count >= 10) return reply({ error: 'Você enviou várias mensagens. Aguarde um minuto antes de continuar.' }, 429);
      }
      if (!thread) {
        await env.DB.prepare('INSERT OR IGNORE INTO support_threads (id, customer_email, customer_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), email, access.customer.name, now, now).run();
        thread = await env.DB.prepare('SELECT * FROM support_threads WHERE customer_email = ?').bind(email).first();
      }
      // Uma nova mensagem reabre a conversa. O histórico nunca é apagado ao resolver.
      await env.DB.batch([
        env.DB.prepare('INSERT INTO support_messages (thread_id, sender_role, body, created_at) VALUES (?, ?, ?, ?)').bind(thread.id, own ? 'customer' : 'admin', body.message.trim(), now),
        env.DB.prepare("UPDATE support_threads SET status = 'open', updated_at = ? WHERE id = ?").bind(now, thread.id),
      ]);
      return reply({ ok: true, threadId: thread.id }, 201);
    }
    if (!thread) return reply({ error: 'Conversa não encontrada.' }, 404);
    if (request.method === 'GET' && !action) {
      const before = Number(url.searchParams.get('before') || Number.MAX_SAFE_INTEGER);
      if (!Number.isSafeInteger(before) || before < 1) return reply({ error: 'Página inválida.' }, 400);
      const rows = await env.DB.prepare('SELECT id, sender_role, body, created_at FROM support_messages WHERE thread_id = ? AND id < ? ORDER BY id DESC LIMIT 51').bind(thread.id, before).all();
      return reply({ thread, messages: rows.results.slice(0, 50).reverse(), hasMore: rows.results.length > 50 });
    }
    if (request.method === 'POST' && action === 'read') {
      const body = await request.json().catch(() => null), through = Number(body?.throughId);
      if (!Number.isSafeInteger(through) || through < 0) return reply({ error: 'Leitura inválida.' }, 400);
      const last = await env.DB.prepare('SELECT max(id) AS id FROM support_messages WHERE thread_id = ?').bind(thread.id).first();
      const field = own ? 'customer_read_id' : 'admin_read_id';
      await env.DB.prepare(`UPDATE support_threads SET ${field} = max(${field}, ?) WHERE id = ?`).bind(Math.min(through, last?.id || 0), thread.id).run();
      return reply({ ok: true });
    }
    if (!own && request.method === 'PATCH' && action === 'status') {
      const body = await request.json().catch(() => null);
      if (!['open', 'resolved'].includes(body?.status)) return reply({ error: 'Status inválido.' }, 400);
      await env.DB.prepare('UPDATE support_threads SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, new Date().toISOString(), thread.id).run();
      return reply({ ok: true });
    }
    return reply({ error: 'Método inválido.' }, 405);
  } catch (error) {
    if (/no such table.*support_/i.test(error.message || '')) return reply({ error: 'O suporte precisa da atualização do banco de dados. Solicite à loja aplicar as migrações.' }, 503);
    throw error;
  }
}

export async function supportEvents(env, { audience, recipient }) {
  const own = audience === 'customer';
  const rows = await env.DB.prepare(`SELECT t.id, t.customer_name, m.id AS message_id, m.created_at FROM support_threads t JOIN support_messages m ON m.id = (SELECT max(s.id) FROM support_messages s WHERE s.thread_id = t.id AND s.sender_role = ? AND s.id > ${own ? 't.customer_read_id' : 't.admin_read_id'}) ${own ? 'WHERE t.customer_email = ?' : ''} ORDER BY m.id DESC LIMIT 100`).bind(...(own ? ['admin', recipient] : ['customer'])).all();
  return rows.results.map(row => ({ id: `support:${row.id}:${row.message_id}`, kind: 'support', threadId: row.id, title: own ? 'A loja respondeu sua mensagem' : 'Nova mensagem de cliente', text: own ? 'Abra o suporte para ler a resposta da loja.' : `${row.customer_name} está aguardando atendimento.`, createdAt: row.created_at }));
}
