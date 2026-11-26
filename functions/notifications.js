import { supportEvents } from './support.js';
import { customerEvents, adminEvents } from '../src/lib/notification-events.js';

export async function handleNotifications(context, path, { reply, requireCustomer, requireAdmin }) {
  const match = path.match(/^(customer|admin)\/notifications$/);
  if (!match) return null;
  const audience = match[1];
  const access = await (audience === 'customer' ? requireCustomer : requireAdmin)(context);
  if (access.response) return access.response;
  const { request, env } = context;
  if (audience === 'admin' && access.session.access === 'demo') return reply({ events: [], demo: true, recipient: 'demo' });
  const recipient = (audience === 'customer' ? access.customer.email : access.session.email).toLowerCase();
  const own = audience === 'customer';
  const [orders, reviews, reads] = await Promise.all([
    own ? env.DB.prepare("SELECT * FROM orders WHERE lower(customer_email) = ? OR lower(json_extract(customer, '$.email')) = ? ORDER BY created_at DESC LIMIT 100").bind(recipient, recipient).all() : env.DB.prepare('SELECT * FROM orders WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 100').all(),
    own ? env.DB.prepare('SELECT * FROM product_reviews WHERE customer_email = ? ORDER BY created_at DESC LIMIT 100').bind(recipient).all() : env.DB.prepare("SELECT * FROM product_reviews WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100").all(),
    env.DB.prepare('SELECT event_id, dismissed_at FROM notification_reads WHERE audience = ? AND recipient = ?').bind(audience, recipient).all(),
  ]);
  const parsed = orders.results.map((order) => ({ ...order, customer: JSON.parse(order.customer), items: JSON.parse(order.items) }));
  let support = [];
  try { support = await supportEvents(env, { audience, recipient }); }
  catch (error) { if (!/no such table.*support_/i.test(error.message || '')) throw error; }
  const events = [...(own ? customerEvents : adminEvents)(parsed, reviews.results), ...support].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 100);
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const action = body?.action || 'read';
    if (!['read', 'dismiss', 'restore'].includes(action) || !Array.isArray(body?.ids) || body.ids.length > 100 || body.ids.some((id) => typeof id !== 'string' || id.length > 512)) return reply({ error: 'Ação ou notificações inválidas.' }, 400);
    const ids = new Set(body.ids);
    const now = new Date().toISOString();
    for (const event of events.filter((event) => ids.has(event.id))) {
      if (action === 'dismiss') await env.DB.prepare('INSERT INTO notification_reads (audience, recipient, event_id, read_at, dismissed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(audience, recipient, event_id) DO UPDATE SET dismissed_at = excluded.dismissed_at').bind(audience, recipient, event.id, now, now).run();
      else if (action === 'restore') await env.DB.prepare('UPDATE notification_reads SET dismissed_at = NULL WHERE audience = ? AND recipient = ? AND event_id = ?').bind(audience, recipient, event.id).run();
      else await env.DB.prepare('INSERT OR IGNORE INTO notification_reads (audience, recipient, event_id, read_at) VALUES (?, ?, ?, ?)').bind(audience, recipient, event.id, now).run();
    }
    return reply({ ok: true });
  }
  if (request.method !== 'GET') return reply({ error: 'Método inválido.' }, 405);
  const seen = new Set(reads.results.map((row) => row.event_id));
  const dismissed = new Set(reads.results.filter((row) => row.dismissed_at).map((row) => row.event_id));
  return reply({ recipient, events: events.filter((event) => !dismissed.has(event.id)).map((event) => ({ ...event, read: seen.has(event.id) })) });
}
