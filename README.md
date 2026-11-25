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

Na Área da Cliente, o convite **Avaliar agora** aparece nas notificações para produtos de pedidos pagos e não cancelados da própria conta. O aviso abre um formulário com nota de 1 a 5 e comentário, já no produto comprado. Não há uma aba separada de avaliações. A cliente autoriza a publicação; a loja exibe apenas seu primeiro nome e a inicial do sobrenome. Editar uma avaliação a devolve para aprovação.

No admin, **Avaliações** permite filtrar por situação, nota e texto, aprovar, retirar da publicação ou devolver para análise. A página pública mostra até 12 avaliações aprovadas de compras que continuam pagas. O modo demonstração não publica nem modera avaliações reais.

O QR Code Pix, sozinho, não confirma o pagamento: a avaliação depende do status de pagamento confirmado no pedido.

## Notificações automáticas

Aplique a migração `0005_notification_reads.sql` com `npm run db:migrate:remote` antes de publicar. Ela guarda quais avisos foram lidos, por conta, para sincronizar entre dispositivos. Os avisos são derivados dos pedidos e avaliações existentes, incluindo compras anteriores, sem criar pedidos ou pagamentos fictícios.

O sino da cliente avisa sobre pedidos, pagamento confirmado, convite para avaliar e resultado da moderação. O sino do admin avisa sobre pedidos em andamento e avaliações pendentes. Os avisos atualizam a cada 15 segundos com a página visível, ao retornar à página e após alterações neste navegador. Marcar como lido não remove o aviso da lista. São notificações dentro do site, sem Web Push em segundo plano.

Na retirada, **Pronto para retirar** avisa a cliente, mas não confirma o pagamento. **Confirmar pagamento e retirada**, usado depois de entregar os produtos e receber, marca como pago/retirado e libera a avaliação. Pagamento antecipado também libera a avaliação, sem confirmar a retirada.

Com as credenciais Brevo já configuradas, alterações de status enviam email à cliente; a primeira confirmação de pagamento inclui o link direto para avaliar (com login obrigatório). Novas avaliações enviam aviso ao `STORE_NOTIFICATION_EMAIL`. Salvar novamente o mesmo status não repete o email. Falhas de envio são registradas no log da Function; os avisos dentro do site continuam disponíveis independentemente da Brevo.

Na demonstração, pagamento/retirada simulados liberam uma avaliação de teste local. Ela aparece no admin demonstrativo, pode ser aprovada na prévia do mesmo navegador e fica identificada como teste. Não confirma pagamentos, não envia emails nem publica depoimentos na loja real.

## Arquivamento de pedidos e clientes

Aplique a migração `0006_admin_archives.sql` com `npm run db:migrate:remote` antes de publicar. Ela adiciona a marcação de arquivamento aos pedidos e cadastros, sem excluir registros existentes.

Em **Pedidos**, abra **Gerenciar pedido → Arquivar pedido**. Confirme a ação e use o filtro **Exibir → Arquivados** para consultar ou restaurar. Arquivar altera somente a organização do admin: não cancela a compra, não estorna pagamento, não repõe estoque e não remove o pedido da conta da cliente. Pedidos arquivados deixam de gerar avisos de pedidos em andamento no admin. Avaliações e avisos da cliente continuam disponíveis.

A seção **Clientes** permite buscar nome, email ou telefone, consultar a quantidade de pedidos e arquivar/restaurar cadastros. Arquivar não bloqueia o login, não apaga os dados nem altera compras. A lista possui filtros de não arquivados/arquivados/todos, carrega 50 cadastros por vez e atualiza automaticamente a cada 15 segundos quando visível. Senhas e hashes não são retornados à listagem.

No modo demonstração, o arquivamento de pedidos e do cadastro da própria cliente é local ao navegador; nenhuma conta ou pedido real é modificado.

## Apagar notificações

A migração `0007_notification_dismissals.sql`, aplicada com `npm run db:migrate:remote`, permite dispensar avisos sem alterar seus pedidos ou avaliações. Cliente e admin têm **Apagar** em cada aviso, **Limpar notificações** para remover os avisos atuais e **Desfazer** para recuperar a última exclusão enquanto a página continuar aberta.

A remoção dos avisos reais é salva por conta no D1 e permanece após recarregar ou acessar em outro dispositivo. Novos eventos continuam gerando notificações normalmente. Na demonstração, a remoção dos avisos de teste é local ao navegador. Apagar um convite não cancela a compra nem remove a possibilidade de avaliar pelo pedido.

## Privacidade, ciência da política e autorização de avaliações

Aplique `0008_privacy_records.sql` com `npm run db:migrate:remote` antes de publicar. Em **Contato & redes → Privacidade e LGPD**, preencha o nome/razão social real do responsável e um email monitorado para solicitações de titulares. Esses dados alimentam a página pública `/privacidade.html`; os campos começam vazios para não atribuir a responsabilidade a uma pessoa ou empresa fictícia.

A política descreve os dados usados pelo site, finalidades, fornecedores, armazenamento necessário, conservação e direitos. Links ficam no rodapé, checkout e cadastro. O cadastro exige ciência da versão da política e registra versão/data no servidor; isso não constitui consentimento para marketing. Registros anteriores permanecem sem data retroativa inventada. A política e os processos de atendimento/conservação devem ser revisados pelo responsável conforme a operação real da loja.

Em **Meus dados**, a cliente pode exportar cadastro, pedidos e avaliações próprios em JSON. O endpoint autenticado não entrega hashes de senha, senhas, sessões nem dados de outras contas. Pedidos de correção, eliminação e outros direitos podem ser encaminhados pelo canal de privacidade configurado na política; arquivamento administrativo não atende uma solicitação de eliminação.

Ao enviar ou editar um depoimento, o servidor registra a autorização de publicação e sua versão. **Retirar autorização de publicação** remove o depoimento da vitrine e bloqueia a republicação pelo admin. Só uma nova autorização explícita da cliente permite voltar à aprovação. O fluxo de teste continua local.

O aviso **Sua avaliação foi aprovada** é informativo e se encerra ao abrir. Não solicita consentimento novamente. Avaliações existentes abrem em consulta; **Editar minha avaliação** inicia uma alteração voluntária. Repetir uma aprovação ou reenviar o mesmo comentário sem alterações não muda o status nem cria novo aviso.

## Melhor Envio — primeira etapa, somente Sandbox

Esta integração é um **simulador de cotação**, separado dos pedidos e pagamentos reais. A cliente informa o CEP no carrinho, consulta serviços e escolhe uma opção para visualizar o subtotal publicado mais o frete de teste. O valor não entra no Pix nem no pedido. Alterar CEP, quantidade, produtos ou configuração invalida a cotação anterior. Sem conexão autorizada, o site informa a indisponibilidade; não inventa preços.

O backend usa exclusivamente `https://sandbox.melhorenvio.com.br`, com o escopo OAuth `shipping-calculate`. Não existe rota de compra, geração de etiquetas, postagem ou ativação de produção nesta etapa. Os testes automatizados usam respostas simuladas, não uma conta autenticada do Melhor Envio.

### Preparação da conta e do aplicativo

1. Crie uma conta no [Melhor Envio Sandbox](https://sandbox.melhorenvio.com.br/), separada da conta de produção.
2. Em Integrações / Área Dev, cadastre o aplicativo e anote o Client ID e o Client Secret. Para o domínio atual, cadastre exatamente esta URL de retorno:

   `https://lange-page-roupas.pages.dev/api/admin/shipping/callback`

   Se usar domínio próprio ou outro ambiente, utilize a URL que aparece em **Admin → Frete (teste)** nesse domínio.
3. Configure os valores no Cloudflare, sem enviar segredos ao chat ou ao Git:

```bash
npx wrangler pages secret put MELHOR_ENVIO_CLIENT_ID --project-name lange-page-roupas
npx wrangler pages secret put MELHOR_ENVIO_CLIENT_SECRET --project-name lange-page-roupas
npx wrangler pages secret put MELHOR_ENVIO_CONTACT_EMAIL --project-name lange-page-roupas
```

`MELHOR_ENVIO_CONTACT_EMAIL` é um email real de contato técnico, exigido no cabeçalho das consultas. Os outros dois valores vêm do aplicativo Sandbox. Faça um novo deploy depois de cadastrar ou alterar esses segredos: Pages aplica os bindings no deployment.

4. Publique o código e abra **Admin → Frete (teste)** com acesso completo. Clique em **Conectar Melhor Envio Sandbox** e autorize a consulta de fretes. A demonstração pública não pode conectar contas externas.
5. Preencha o CEP de origem, confira peso e medidas padrão, marque **Mostrar o simulador no carrinho** e salve. Os valores iniciais de embalagem são exemplos para teste, não medições dos produtos.
6. Adicione um produto ao carrinho público e teste um CEP de destino. Dependendo da conta e dos serviços habilitados no aplicativo, o Sandbox pode retornar apenas algumas transportadoras ou nenhum serviço para um trecho.

### Credenciais e medidas

Client Secret e contato técnico ficam nos segredos do Cloudflare. Access/refresh tokens ficam criptografados no D1, em chaves separadas do catálogo; não entram na API pública, no backup de produtos ou no navegador. A autorização usa state aleatório, de uso único, com expiração e vinculado ao admin que iniciou. A renovação do acesso é automática enquanto o refresh token for válido; caso expire ou a autorização seja revogada, reconecte pelo painel. Trocar o Client Secret exige nova conexão.

Em **Produtos → Editar**, informe opcionalmente peso em kg e altura/largura/comprimento em cm de uma unidade embalada. Campos vazios usam o padrão de teste da loja. O servidor obtém preço, estoque e medidas do catálogo publicado e agrega quantidades; não aceita preços ou medidas enviados pelo navegador. O Melhor Envio faz o empacotamento por produtos. Valores e prazos customizados da API são respeitados.

**Desconectar neste site** remove os tokens locais da integração. A revogação da permissão externa, se desejada, é feita no painel do Melhor Envio. Não há nova migração de banco para esta etapa: o vínculo usa `app_state`, já existente.

Verificação local: `node scripts/check-shipping.mjs`, `npm run build` e `npx wrangler pages functions build --outdir /tmp/frs-shipping-functions`.

Referências oficiais: [Sandbox](https://docs.melhorenvio.com.br/docs/sandbox), [autenticação](https://docs.melhorenvio.com.br/docs/autenticacao), [cotação por produtos](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos) e [segredos do Cloudflare Pages](https://developers.cloudflare.com/pages/functions/bindings/#secrets).
