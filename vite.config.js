
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const DEMO_EMAIL = 'admin@frswear.local';
const DEMO_PASSWORD = 'frs1234';
const localSessions = new Set();

function localAdminApi(req, res, next) {
  if (!req.url?.startsWith('/api/auth/')) return next();
  const route = req.url.split('?')[0];
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((item) => item.trim().split('=')));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (route === '/api/auth/session' && req.method === 'GET') {
    const authenticated = localSessions.has(cookies.frs_admin_session);
    res.statusCode = authenticated ? 200 : 401;
    return res.end(JSON.stringify({ authenticated, demo: true }));
  }

  if (route === '/api/auth/logout' && req.method === 'POST') {
    if (cookies.frs_admin_session) localSessions.delete(cookies.frs_admin_session);
    res.setHeader('Set-Cookie', 'frs_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return res.end(JSON.stringify({ ok: true }));
  }

  if (route === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body || '{}');
        if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'E-mail ou senha incorretos.' }));
        }
        const token = randomUUID();
        localSessions.add(token);
        res.setHeader('Set-Cookie', `frs_admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
        return res.end(JSON.stringify({ ok: true, demo: true }));
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Dados de acesso inválidos.' }));
      }
    });
    return;
  }

  res.statusCode = 404;
  return res.end(JSON.stringify({ error: 'Rota não encontrada.' }));
}

function localAdminBackend() {
  return {
    name: 'frs-local-admin-backend',
    configureServer(server) { server.middlewares.use(localAdminApi); },
    configurePreviewServer(server) { server.middlewares.use(localAdminApi); },
  };
}

export default defineConfig({
  plugins: [localAdminBackend()],
  // Caminho absoluto (raiz do domínio) — é assim que Vercel/Netlify
  // servem o site, e simplifica montar o link público de cada foto.
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Sempre gera um arquivo de verdade pra cada imagem (nunca embute
    // como base64), pra garantir que toda imagem tenha um link público
    // — necessário pra mandar a foto do produto na mensagem do WhatsApp.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        loja: resolve(projectRoot, 'index.html'),
        admin: resolve(projectRoot, 'admin.html')
      }
    }
  }
});
