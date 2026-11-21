import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config, assertProductionConfig } from './config.js';
import { clearSessionCookie, isAuthenticated, requireAdmin, sessionCookie, validCredentials } from './auth.js';
import { createOrder, getState, initializeRepository, listOrders, saveState, usingMemory } from './repository.js';
import { sendOrderEmails } from './email.js';

assertProductionConfig();
await initializeRepository();
const root = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = config.uploadDirectory ? path.resolve(config.uploadDirectory) : path.join(root, 'uploads');
await mkdir(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) => {
    const extension = file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/jpeg' ? '.jpg' : '.webp';
    callback(null, `${randomUUID()}${extension}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2_500_000 }, fileFilter: (_request, file, callback) => callback(null, ['image/webp', 'image/png', 'image/jpeg'].includes(file.mimetype)) });
const app = express();
const orderAttempts = new Map();

function limitOrders(request, response, next) {
  const now = Date.now();
  const key = request.ip;
  const recent = (orderAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 5) return response.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
  recent.push(now);
  orderAttempts.set(key, recent);
  next();
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({ origin(origin, callback) { if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true); callback(new Error('Origem não autorizada.')); }, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDirectory, { immutable: true, maxAge: '1y' }));

app.get('/api/health', (_request, response) => response.json({ ok: true, database: usingMemory ? 'memory' : 'postgres', email: config.brevoApiKey ? 'brevo' : 'disabled' }));
app.get('/api/auth/session', (request, response) => isAuthenticated(request) ? response.json({ authenticated: true, demo: config.demoLogin }) : response.status(401).json({ authenticated: false }));
app.post('/api/auth/login', (request, response) => {
  if (!validCredentials(request.body?.email, request.body?.password)) return response.status(401).json({ error: 'E-mail ou senha incorretos.' });
  response.setHeader('Set-Cookie', sessionCookie());
  response.json({ ok: true, demo: config.demoLogin });
});
app.post('/api/auth/logout', (_request, response) => { response.setHeader('Set-Cookie', clearSessionCookie()); response.json({ ok: true }); });

app.get('/api/catalog', async (_request, response, next) => {
  try {
    const state = await getState();
    response.json({ initialized: Boolean(state), store: state?.store || null, products: (state?.products || []).filter((product) => product.active !== false) });
  } catch (error) { next(error); }
});
app.get('/api/admin/data', requireAdmin, async (_request, response, next) => { try { const state = await getState(); response.json({ initialized: Boolean(state), ...(state || {}) }); } catch (error) { next(error); } });
app.put('/api/admin/data', requireAdmin, async (request, response, next) => {
  try {
    const snapshot = request.body;
    if (!snapshot?.store || !Array.isArray(snapshot.products) || snapshot.products.length > 500) return response.status(400).json({ error: 'Catálogo inválido.' });
    await saveState({ store: snapshot.store, products: snapshot.products, activity: (snapshot.activity || []).slice(0, 50) });
    response.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});
app.post('/api/admin/upload', requireAdmin, upload.single('image'), (request, response) => {
  if (!request.file) return response.status(400).json({ error: 'Imagem inválida.' });
  response.status(201).json({ ok: true, url: `${config.publicApiUrl}/uploads/${request.file.filename}` });
});
app.get('/api/admin/orders', requireAdmin, async (_request, response, next) => { try { response.json({ orders: await listOrders() }); } catch (error) { next(error); } });

app.post('/api/orders', limitOrders, async (request, response, next) => {
  try {
    const state = await getState();
    if (!state) return response.status(503).json({ error: 'Catálogo ainda não configurado.' });
    const customer = request.body?.customer || {};
    const address = request.body?.address || {};
    const requestedItems = Array.isArray(request.body?.items) ? request.body.items : [];
    if (!customer.name || !customer.email || !requestedItems.length) return response.status(400).json({ error: 'Dados do pedido incompletos.' });
    let subtotalCents = 0;
    const items = requestedItems.map((requested) => {
      const product = state.products.find((item) => item.id === requested.id && item.active !== false);
      const quantity = Math.max(1, Math.floor(Number(requested.quantity) || 1));
      if (!product || product.stock < quantity) throw new Error(`Estoque insuficiente para ${product?.name || requested.id}.`);
      product.stock -= quantity;
      subtotalCents += Math.round(product.price * 100) * quantity;
      return { id: product.id, name: product.name, price_cents: Math.round(product.price * 100), quantity, size: requested.size || 'Único', color: requested.color || 'Única' };
    });
    const shippingCents = 0;
    const paymentMethod = ['retirada', 'pix', 'cartao'].includes(request.body?.paymentMethod) ? request.body.paymentMethod : 'retirada';
    const order = { id: randomUUID(), customer, address, items, subtotal_cents: subtotalCents, shipping_cents: shippingCents, total_cents: subtotalCents + shippingCents, payment_method: paymentMethod, status: 'pending', payment_status: 'pending', shipping_status: 'pending', created_at: new Date().toISOString() };
    await createOrder(order, state);
    sendOrderEmails(order).catch((error) => console.error('Falha ao enviar e-mail Brevo:', error));
    response.status(201).json({ order: { id: order.id, status: order.status, total_cents: order.total_cents } });
  } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error.message === 'Origem não autorizada.') return response.status(403).json({ error: error.message });
  response.status(error.message?.startsWith('Estoque insuficiente') ? 409 : 500).json({ error: error.message?.startsWith('Estoque insuficiente') ? error.message : 'Erro interno do servidor.' });
});

app.listen(config.port, () => console.log(`Backend FRS-Wear em http://localhost:${config.port} (${usingMemory ? 'memória local' : 'PostgreSQL'})`));
