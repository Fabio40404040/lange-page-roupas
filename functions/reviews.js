const ownership = `(lower(customer_email) = ? OR lower(json_extract(customer, '$.email')) = ?)`;
const publicAuthor = (name) => {
  const words = String(name || 'Cliente').trim().split(/\s+/);
  return words.length > 1 ? `${words[0]} ${words.at(-1)[0]}.` : words[0];
};

export async function handleReviews(context, path, { reply, requireCustomer, requireAdmin, sendBrevoEmail }) {
  const { request, env } = context;
  if (path === 'reviews' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT r.id, r.product_name, r.author, r.rating, r.comment, r.created_at FROM product_reviews r
      JOIN orders o ON o.id = r.order_id WHERE r.status = 'approved' AND o.payment_status = 'paid' AND o.status <> 'cancelled'
      ORDER BY r.updated_at DESC LIMIT 12`).all();
    return reply({ reviews: result.results });
  }
  if (path === 'customer/reviews') {
    const access = await requireCustomer(context);
    if (access.response) return access.response;
    const email = access.customer.email.toLowerCase();
    if (request.method === 'GET') {
      const [purchases, existing] = await Promise.all([
        env.DB.prepare(`SELECT id, items FROM orders WHERE ${ownership} AND payment_status = 'paid' AND status <> 'cancelled' ORDER BY created_at DESC`).bind(email, email).all(),
        env.DB.prepare('SELECT * FROM product_reviews WHERE customer_email = ? ORDER BY created_at DESC').bind(email).all(),
      ]);
      const eligible = purchases.results.flatMap((order) => [...new Map(JSON.parse(order.items).map((item) => [item.id, item])).values()].map((item) => ({ orderId: order.id, productId: item.id, productName: item.name })));
      return reply({ eligible, reviews: existing.results });
    }
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const rating = Number(body.rating);
      const comment = String(body.comment || '').trim();
      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 10 || comment.length > 1000 || body.publicConsent !== true) return reply({ error: 'Escolha uma nota de 1 a 5, escreva de 10 a 1000 caracteres e autorize a publicação.' }, 400);
      const order = await env.DB.prepare(`SELECT id, items, payment_status, status FROM orders WHERE id = ? AND ${ownership}`).bind(String(body.orderId || ''), email, email).first();
      if (!order) return reply({ error: 'Pedido não encontrado na sua conta.' }, 404);
      if (order.payment_status !== 'paid' || order.status === 'cancelled') return reply({ error: 'A avaliação será liberada após a loja confirmar o pagamento do pedido.' }, 403);
      const item = JSON.parse(order.items).find((item) => item.id === body.productId);
      if (!item) return reply({ error: 'Este produto não pertence ao pedido.' }, 400);
      const now = new Date().toISOString();
      await env.DB.prepare(`INSERT INTO product_reviews (id, order_id, product_id, product_name, customer_email, author, rating, comment, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?) ON CONFLICT(order_id, product_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, status = 'pending', updated_at = excluded.updated_at`)
        .bind(crypto.randomUUID(), order.id, item.id, item.name, email, publicAuthor(access.customer.name), rating, comment, now, now).run();
      if (sendBrevoEmail && env.STORE_NOTIFICATION_EMAIL) {
        const link = new URL('/admin?view=reviews', request.url).href;
        context.waitUntil(sendBrevoEmail(env, { to: [{ email: env.STORE_NOTIFICATION_EMAIL }], subject: 'Nova avaliação aguardando aprovação', textContent: `Uma cliente enviou uma avaliação de ${rating} estrelas. Acesse o painel para analisar: ${link}`, htmlContent: `<p>Uma cliente enviou uma avaliação. Acesse o painel da loja para analisar e aprovar a publicação.</p><p><a href="${link}">Analisar avaliação</a></p>`, tags: ['review-pending'] }).catch((error) => console.error('Falha Brevo:', error)));
      }
      return reply({ ok: true, status: 'pending' }, 201);
    }
  }
  if (path === 'admin/reviews' || /^admin\/reviews\/[^/]+$/.test(path)) {
    const access = await requireAdmin(context);
    if (access.response) return access.response;
    const demo = access.session.access === 'demo';
    if (path === 'admin/reviews' && request.method === 'GET') {
      const url = new URL(request.url);
      const conditions = []; const params = [];
      if (demo) {
        const customer = await requireCustomer(context);
        if (customer.response) return reply({ reviews: [], total: 0, demo: true, message: 'Entre também na Área da Cliente para ver somente suas avaliações de teste. A demonstração não publica depoimentos.' });
        conditions.push('customer_email = ?'); params.push(customer.customer.email.toLowerCase());
      }
      const status = url.searchParams.get('status');
      const rating = Number(url.searchParams.get('rating'));
      const search = String(url.searchParams.get('search') || '').trim().slice(0, 100);
      if (['pending', 'approved', 'rejected'].includes(status)) { conditions.push('status = ?'); params.push(status); }
      if (Number.isInteger(rating) && rating >= 1 && rating <= 5) { conditions.push('rating = ?'); params.push(rating); }
      if (search) { conditions.push('(author LIKE ? OR product_name LIKE ? OR comment LIKE ?)'); params.push(...Array(3).fill(`%${search}%`)); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = Math.max(0, Math.floor(Number(url.searchParams.get('offset')) || 0));
      const [rows, count] = await Promise.all([
        env.DB.prepare(`SELECT * FROM product_reviews ${where} ORDER BY created_at DESC LIMIT 50 OFFSET ?`).bind(...params, offset).all(),
        env.DB.prepare(`SELECT count(*) AS total FROM product_reviews ${where}`).bind(...params).first(),
      ]);
      return reply({ reviews: rows.results, total: count.total, demo });
    }
    if (request.method === 'PATCH' && /^admin\/reviews\/[^/]+$/.test(path)) {
      if (demo) return reply({ error: 'A demonstração não altera avaliações reais. Use o acesso completo para moderar.' }, 403);
      const body = await request.json().catch(() => ({}));
      if (!['pending', 'approved', 'rejected'].includes(body.status)) return reply({ error: 'Status inválido.' }, 400);
      const result = await env.DB.prepare('UPDATE product_reviews SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, new Date().toISOString(), path.split('/')[2]).run();
      return result.meta.changes ? reply({ ok: true }) : reply({ error: 'Avaliação não encontrada.' }, 404);
    }
  }
  return null;
}
