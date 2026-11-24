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

O painel publicado mostra credenciais demonstrativas (`demo@frswear.com.br` / `DemoFRS2026!`). Nesse modo, produtos, preços, imagens e configurações são gravados apenas no navegador do visitante. O backend bloqueia acesso aos pedidos reais, uploads e qualquer alteração no D1/R2.

## Configuração no Cloudflare Pages

Os bindings já estão declarados em `wrangler.jsonc`:

- D1: `DB` → `frs-wear-db`
- R2: `UPLOADS` → `frs-wear-assets`

Cadastre como segredos do projeto Pages:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` — use uma chave aleatória longa
- `CLIENT_ADMIN_EMAIL` — opcional; e-mail do cliente após a liberação do acesso completo
- `CLIENT_ADMIN_PASSWORD` — opcional; senha do cliente após a liberação do acesso completo
- `CUSTOMER_AUTH_SECRET` — chave longa usada para proteger os códigos de acesso das clientes
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL` — remetente verificado na Brevo
- `BREVO_SENDER_NAME`
- `STORE_NOTIFICATION_EMAIL`

Build command: `npm run build`

Output directory: `dist`

## Publicação

Antes da publicação e sempre que houver novas migrações, aplique as migrações remotas:

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
- Modo demonstração isolado, com pedidos fictícios e prévia local da vitrine.
- Acervo visual com 32 imagens em 8 grupos, aplicação direta em produtos, exclusão e restauração.
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

## Avaliações de compras

A migração `0004_product_reviews.sql` cria o armazenamento das avaliações. Aplique-a com `npm run db:migrate:remote` antes de publicar esta funcionalidade.

Na Área da Cliente, **Minhas avaliações** libera nota de 1 a 5 e comentário para produtos de pedidos pagos e não cancelados da própria conta. A cliente autoriza a publicação; a loja exibe apenas seu primeiro nome e a inicial do sobrenome. Editar uma avaliação a devolve para aprovação.

No admin, **Avaliações** permite filtrar por situação, nota e texto, aprovar, retirar da publicação ou devolver para análise. A página pública mostra até 12 avaliações aprovadas de compras que continuam pagas. O modo demonstração não publica nem modera avaliações reais.

O QR Code Pix, sozinho, não confirma o pagamento: a avaliação depende do status de pagamento confirmado no pedido.
