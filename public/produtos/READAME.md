# Lojinha Whats — landing page para o link da bio do Instagram

Site de uma página só: o cliente escolhe as peças, monta um carrinho, e um
toque envia o pedido pronto pro seu WhatsApp. Feito para rodar rápido no
celular, que é como quase todo mundo abre o link da bio.

## Estrutura

```
lojinha-whats/
├── index.html          → estrutura da página
├── src/
│   ├── config.js        → EDITE AQUI: nome da loja, WhatsApp, Instagram, endereço, Pix
│   ├── products.js       → EDITE AQUI: lista de produtos
│   ├── main.js            → lógica do carrinho e do checkout
│   └── style.css           → visual da loja
└── public/
    ├── favicon.svg
    └── produtos/           → coloque as fotos das peças aqui
```

## O que editar primeiro

1. **`src/config.js`** — nome da loja, número de WhatsApp (com DDI+DDD, só
   números), usuário do Instagram, endereço, horário e, se quiser, chave Pix.
2. **`src/products.js`** — troque os produtos de exemplo pelos seus. Duplique
   um bloco `{ ... }` para cada peça nova.
3. **Fotos** — salve as imagens em `public/produtos/` e aponte o campo
   `image` de cada produto para o arquivo, ex: `'/produtos/camisa-azul.jpg'`.
   Sem foto, o card mostra um bloco colorido no lugar (fica bonito também).

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Publicar (gerar o link pra colocar na bio)

```bash
npm run build
```

Isso gera a pasta `dist/` — é ela que sobe pro ar. Duas formas fáceis e
gratuitas de publicar:

- **Vercel**: crie conta em vercel.com, importe o projeto (ou arraste a
  pasta `dist` em "deploy manual") e pegue o link `.vercel.app`.
- **Netlify**: crie conta em netlify.com → "Add new site" → "Deploy manually"
  → arraste a pasta `dist`. Pegue o link `.netlify.app`.

Depois é só colar esse link no campo "Site" do seu perfil do Instagram.

## Ideias para evoluir depois

- **Domínio próprio** (ex: sualoja.com.br) apontando pro Vercel/Netlify —
  fica mais profissional que o link padrão.
- **Fotos reais em vez dos blocos coloridos** — o maior ganho de conversão
  costuma vir daqui.
- **Stories em destaque**: linkar seções específicas (ex: `#catalogo`) direto
  nos destaques do Instagram.
- **Pixel do Meta / Google Analytics**: para saber quantas pessoas entram
  vindas do Instagram e quantas chegam a clicar em "Finalizar no WhatsApp".
- **Contagem de estoque por tamanho**: hoje o site não checa estoque —
  se vender rápido, dá pra adicionar um campo `stock` no `products.js`.
- **Cupom de primeira compra**: um código simples (ex: "BIO10") citado na
  mensagem que cai no WhatsApp, pra você aplicar o desconto manualmente.
- **QR code** apontando pro mesmo link, para colar na loja física ou nas
  sacolinhas.
- **Catálogo do WhatsApp Business** como complemento — o site continua
  sendo o lugar pra montar o carrinho, mas o catálogo ajuda quem já entra
  direto pelo WhatsApp.
