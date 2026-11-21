# FRS-Wear

Loja mobile-first com catálogo, carrinho e painel administrativo. A arquitetura separa:

- **Frontend:** Vite publicado no Cloudflare Pages.
- **Backend:** Node.js/Express em qualquer hospedagem Node (Render, Railway ou VPS).
- **Banco:** PostgreSQL.
- **E-mail:** Brevo Transactional Email.
- **Imagens:** pasta persistente configurada por `UPLOAD_DIR`.

## Rodar localmente

```bash
npm install
cp .env.example .env
cp server/.env.example server/.env
npm run server
```

Em outro terminal:

```bash
npm run dev
```

Painel: `http://localhost:5173/admin`

Login provisório local:

- E-mail: `admin@frswear.local`
- Senha: `frs1234`

Sem `DATABASE_URL`, o backend usa memória temporária para desenvolvimento. Os dados são apagados quando o servidor reinicia.

## Variáveis do backend

Use [server/.env.example](./server/.env.example) como referência. Em produção, configure no provedor do backend:

- `NODE_ENV=production`
- `FRONTEND_ORIGIN=https://seu-projeto.pages.dev` (aceita vários domínios separados por vírgula)
- `DATABASE_URL` e `DATABASE_SSL=true`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET`
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` e `BREVO_SENDER_NAME`
- `STORE_NOTIFICATION_EMAIL`
- `PUBLIC_API_URL=https://api.seudominio.com`
- `UPLOAD_DIR=/caminho/do-volume/uploads`
- `ALLOW_DEMO_LOGIN=false`

O remetente de `BREVO_SENDER_EMAIL` precisa estar verificado na Brevo. O backend cria/atualiza as tabelas automaticamente ao iniciar.

## Variáveis do Cloudflare Pages

Configure antes do build:

```text
VITE_API_URL=https://url-do-seu-backend
VITE_SHOW_DEMO_LOGIN=false
```

Build command: `npm run build`

Output directory: `dist`

Depois que o GitHub estiver conectado ao Cloudflare Pages, cada `git push origin main` publica o frontend automaticamente. O backend deve estar conectado ao mesmo repositório no provedor Node, usando `npm run server` como comando de início e um volume persistente para `UPLOAD_DIR`.

## Funcionalidades atuais

- Login administrativo com cookie HTTP-only.
- Catálogo, preço, estoque, tamanhos, cores e visibilidade.
- Banner e imagens redimensionadas para WebP.
- Dados da loja, redes sociais, WhatsApp e Pix.
- Pedidos com baixa automática de estoque.
- Lista de pedidos no painel.
- Confirmação de pedido para cliente e loja pela Brevo.
- Backup e importação JSON.
