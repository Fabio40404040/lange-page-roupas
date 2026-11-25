export function archiveCondition(scope, alias = '') {
  const column = `${alias ? `${alias}.` : ''}archived_at`;
  return scope === 'archived' ? `${column} IS NOT NULL` : scope === 'all' ? '1 = 1' : `${column} IS NULL`;
}

export async function handleAdminArchives(context, path, { reply, requireAdmin }) {
  const action = path.match(/^admin\/(orders|customers)\/([^/]+)\/archive$/);
  if (!action && path !== 'admin/customers') return null;
  const access = await requireAdmin(context);
  if (access.response) return access.response;
  if (access.session.access === 'demo') return reply({ error: 'Na demonstração, o arquivamento é salvo somente no navegador.' }, 403);
  const { request, env } = context;
  if (action && request.method === 'PATCH') {
    const body = await request.json().catch(() => null);
    if (typeof body?.archived !== 'boolean') return reply({ error: 'Informe se deseja arquivar ou restaurar.' }, 400);
    const table = action[1];
    const key = table === 'orders' ? 'id' : 'email';
    let id;
    try { id = decodeURIComponent(action[2]); } catch { return reply({ error: 'Identificador inválido.' }, 400); }
    const result = await env.DB.prepare(`UPDATE ${table} SET archived_at = ? WHERE ${key} = ?`).bind(body.archived ? new Date().toISOString() : null, table === 'customers' ? id.toLowerCase() : id).run();
    return result.meta.changes ? reply({ ok: true }) : reply({ error: 'Registro não encontrado.' }, 404);
  }
  if (path === 'admin/customers' && request.method === 'GET') {
    const url = new URL(request.url);
    const search = String(url.searchParams.get('search') || '').trim().slice(0, 100);
    const offsetValue = Number(url.searchParams.get('offset'));
    const offset = Number.isSafeInteger(offsetValue) && offsetValue > 0 ? Math.min(offsetValue, 1000000) : 0;
    const where = `${archiveCondition(url.searchParams.get('archive'), 'c')}${search ? ' AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)' : ''}`;
    const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const [rows, count, summary] = await Promise.all([
      env.DB.prepare(`SELECT c.email, c.name, c.phone, c.verified, c.created_at, c.archived_at,
        (SELECT count(*) FROM orders o WHERE lower(o.customer_email) = c.email OR lower(json_extract(o.customer, '$.email')) = c.email) AS order_count
        FROM customers c WHERE ${where} ORDER BY c.created_at DESC, c.email LIMIT 50 OFFSET ?`).bind(...params, offset).all(),
      env.DB.prepare(`SELECT count(*) AS total FROM customers c WHERE ${where}`).bind(...params).first(),
      env.DB.prepare('SELECT count(*) AS total, count(CASE WHEN archived_at IS NULL THEN 1 END) AS active, count(CASE WHEN archived_at IS NOT NULL THEN 1 END) AS archived FROM customers').first(),
    ]);
    return reply({ customers: rows.results, total: count.total, summary });
  }
  return reply({ error: 'Método inválido.' }, 405);
}
