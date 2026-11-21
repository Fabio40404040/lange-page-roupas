import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { config } from './config.js';

const pool = config.databaseUrl ? new pg.Pool({ connectionString: config.databaseUrl, ssl: config.databaseSsl ? { rejectUnauthorized: false } : false }) : null;
let memoryState = null;
const memoryOrders = [];
export const usingMemory = !pool;

export async function initializeRepository() {
  if (!pool) return;
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

export async function getState() {
  if (!pool) return memoryState;
  const result = await pool.query('SELECT value FROM app_state WHERE key = $1', ['catalog']);
  return result.rows[0]?.value || null;
}
export async function saveState(snapshot) {
  if (!pool) { memoryState = snapshot; return; }
  await pool.query(`INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, ['catalog', JSON.stringify(snapshot)]);
}
export async function listOrders() {
  if (!pool) return [...memoryOrders].reverse();
  return (await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100')).rows;
}
export async function createOrder(order, nextState) {
  if (!pool) { memoryOrders.push(order); memoryState = nextState; return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query('SELECT value FROM app_state WHERE key = $1 FOR UPDATE', ['catalog']);
    const currentState = locked.rows[0]?.value;
    if (!currentState) throw new Error('Catálogo ainda não configurado.');
    let subtotalCents = 0;
    order.items = order.items.map((requested) => {
      const product = currentState.products.find((item) => item.id === requested.id && item.active !== false);
      if (!product || product.stock < requested.quantity) throw new Error(`Estoque insuficiente para ${product?.name || requested.id}.`);
      product.stock -= requested.quantity;
      const priceCents = Math.round(product.price * 100);
      subtotalCents += priceCents * requested.quantity;
      return { ...requested, name: product.name, price_cents: priceCents };
    });
    order.subtotal_cents = subtotalCents;
    order.total_cents = subtotalCents + order.shipping_cents;
    await client.query(`INSERT INTO orders (id, customer, address, items, subtotal_cents, shipping_cents, total_cents, payment_method) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7, $8)`, [order.id, JSON.stringify(order.customer), JSON.stringify(order.address), JSON.stringify(order.items), order.subtotal_cents, order.shipping_cents, order.total_cents, order.payment_method]);
    await client.query('UPDATE app_state SET value = $2::jsonb, updated_at = NOW() WHERE key = $1', ['catalog', JSON.stringify(currentState)]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function closeRepository() { if (pool) await pool.end(); }
