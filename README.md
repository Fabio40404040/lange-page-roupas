# FRS-Wear

Loja mobile-first com catálogo, checkout e painel administrativo, inteiramente no Cloudflare.

- **Frontend e backend:** Cloudflare Pages + Pages Functions.
- **Banco:** Cloudflare D1.
- **Imagens:** Cloudflare R2.
- **E-mail:** Brevo Transactional Email.

## Rodar localmente

```bash
npm install
npm run build
npm run db:migrate
npm run cloudflare:dev
```

Loja: `http://localhost:8788`

Painel: `http://localhost:8788/admin`

Login provisório local:

- E-mail: `admin@frswear.local`
- Senha: `frs1234`

As credenciais fake funcionam somente em `localhost` ou `127.0.0.1`.

## Configuração no Cloudflare Pages

Os bindings já estão declarados em `wrangler.jsonc`:

- D1: `DB` → `frs-wear-db`
- R2: `UPLOADS` → `frs-wear-assets`

Cadastre como segredos do projeto Pages:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` — use uma chave aleatória longa
- `CUSTOMER_AUTH_SECRET` — chave longa usada para proteger os códigos de acesso das clientes
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL` — remetente verificado na Brevo
- `BREVO_SENDER_NAME`
- `STORE_NOTIFICATION_EMAIL`

Build command: `npm run build`

Output directory: `dist`

## Publicação

Antes da primeira publicação, aplique a migração remota:

```bash
npm run db:migrate:remote
```

Depois, o repositório conectado ao Cloudflare Pages publica automaticamente cada push:

```bash
git add -A
git commit -m "feat: finaliza loja com backend Cloudflare"
git push origin main
```

## Funcionalidades

- Login administrativo com cookie HTTP-only.
- Produtos, preços, estoque, tamanhos, cores e visibilidade.
- Banner e fotos convertidos para WebP e armazenados no R2.
- Dados da loja, contatos, redes sociais e Pix.
- Checkout dentro do site, sem finalizar pelo WhatsApp.
- Pedido com número de confirmação e baixa automática de estoque.
- Confirmação para cliente e loja pela Brevo.
- Pedidos recentes no painel administrativo.
- Área da cliente com cadastro completo, confirmação por código enviado pela Brevo e login com e-mail e senha.
- Histórico de pedidos, detalhes, pagamento e rastreio individual.
- Atualização de status, transportadora e código de rastreio pelo admin.
- PWA instalável no computador, Android e iPhone, com ícones e navegação básica offline.
- Backup e importação JSON.
