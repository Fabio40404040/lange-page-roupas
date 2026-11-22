// Catálogo inicial de demonstração. Cada foto já pertence ao produto correto.
// O administrador pode substituir ou remover qualquer foto pelo painel.

const palette = {
  black: { name: 'Preto', hex: '#15141b' },
  white: { name: 'Branco', hex: '#efe9dc' },
  beige: { name: 'Bege', hex: '#d8c9a3' },
  caramel: { name: 'Caramelo', hex: '#a5652f' },
  green: { name: 'Verde', hex: '#36594a' },
  wine: { name: 'Vinho', hex: '#6f263d' },
  gold: { name: 'Dourado', hex: '#c9a227' },
};

const makeProduct = (id, name, category, price, image, sizes, colors, tag = '') => ({
  id,
  name,
  category,
  price,
  sizes,
  colors: colors.map((color, index) => ({
    ...color,
    image: index === 0 ? `/products-demo/${image}.webp` : `/products-demo/variants/${image}-${index + 1}.webp`,
  })),
  image: `/products-demo/${image}.webp`,
  tag,
  stock: 12,
  active: true,
  featured: Boolean(tag),
});

export const CATEGORIES = ['Tudo', 'Vestidos', 'Camisas', 'Calças', 'Calçados', 'Bolsas', 'Acessórios'];

export const PRODUCTS = [
  makeProduct('p1', 'Vestido Midi Esmeralda', 'Vestidos', 159.9, 'vestido-midi-esmeralda', ['P', 'M', 'G'], [palette.green, palette.black], 'novo'),
  makeProduct('p2', 'Vestido Envelope Terracota', 'Vestidos', 169.9, 'vestido-envelope-terracota', ['P', 'M', 'G'], [{ name: 'Terracota', hex: '#b5563f' }, palette.beige]),
  makeProduct('p3', 'Vestido de Festa Preto', 'Vestidos', 229.9, 'vestido-festa-preto', ['P', 'M', 'G'], [palette.black, palette.wine], 'mais vendido'),
  makeProduct('p4', 'Vestido de Linho Creme', 'Vestidos', 179.9, 'vestido-linho-creme', ['P', 'M', 'G'], [{ name: 'Creme', hex: '#eee1c9' }, palette.white]),

  makeProduct('p5', 'Camisa de Linho Branca', 'Camisas', 109.9, 'camisa-linho-branca', ['P', 'M', 'G', 'GG'], [palette.white, palette.beige]),
  makeProduct('p6', 'Blusa Cropped Ferrugem', 'Camisas', 79.9, 'blusa-cropped-ferrugem', ['P', 'M', 'G'], [{ name: 'Ferrugem', hex: '#a94f32' }, palette.black], 'novo'),
  makeProduct('p7', 'Top de Cetim Preto', 'Camisas', 89.9, 'top-cetim-preto', ['P', 'M', 'G'], [palette.black, palette.wine]),
  makeProduct('p8', 'Suéter de Tricô Verde', 'Camisas', 139.9, 'sueter-trico-verde', ['P', 'M', 'G'], [palette.green, palette.beige]),

  makeProduct('p9', 'Calça Jeans Reta', 'Calças', 129.9, 'calca-jeans-reta', ['36', '38', '40', '42'], [{ name: 'Jeans', hex: '#42647a' }, palette.black], 'mais vendido'),
  makeProduct('p10', 'Calça Alfaiataria Caramelo', 'Calças', 149.9, 'calca-alfaiataria-caramelo', ['36', '38', '40', '42'], [palette.caramel, palette.black]),
  makeProduct('p11', 'Saia Midi Preta', 'Calças', 119.9, 'saia-midi-preta', ['P', 'M', 'G'], [palette.black, palette.beige]),
  makeProduct('p12', 'Short de Linho Creme', 'Calças', 89.9, 'short-linho-creme', ['P', 'M', 'G'], [{ name: 'Creme', hex: '#eee1c9' }, palette.caramel]),

  makeProduct('p13', 'Tênis Chunky Branco', 'Calçados', 219.9, 'tenis-chunky-branco', ['35', '36', '37', '38', '39'], [palette.white, palette.black], 'mais vendido'),
  makeProduct('p14', 'Tênis Casual Preto', 'Calçados', 189.9, 'tenis-casual-preto', ['36', '37', '38', '39', '40'], [palette.black, palette.white]),
  makeProduct('p15', 'Tênis Esportivo Bege', 'Calçados', 239.9, 'tenis-esportivo-bege', ['35', '36', '37', '38', '39'], [palette.beige, palette.white], 'novo'),
  makeProduct('p16', 'Tênis de Lona Verde', 'Calçados', 159.9, 'tenis-lona-verde', ['36', '37', '38', '39', '40'], [palette.green, palette.white]),

  makeProduct('p17', 'Bota de Cano Curto', 'Calçados', 259.9, 'bota-cano-curto', ['35', '36', '37', '38', '39'], [palette.black, palette.caramel]),
  makeProduct('p18', 'Sandália Caramelo', 'Calçados', 129.9, 'sandalia-caramelo', ['35', '36', '37', '38', '39'], [palette.caramel, palette.beige]),
  makeProduct('p19', 'Sapatilha Nude', 'Calçados', 119.9, 'sapatilha-nude', ['35', '36', '37', '38', '39'], [{ name: 'Nude', hex: '#d9b99b' }, palette.black]),
  makeProduct('p20', 'Salto Bloco Vinho', 'Calçados', 169.9, 'salto-bloco-vinho', ['35', '36', '37', '38', '39'], [palette.wine, palette.black]),

  makeProduct('p21', 'Bolsa Transversal Caramelo', 'Bolsas', 139.9, 'bolsa-transversal-caramelo', ['Único'], [palette.caramel, palette.black], 'mais vendido'),
  makeProduct('p22', 'Bolsa Estruturada Preta', 'Bolsas', 179.9, 'bolsa-estruturada-preta', ['Único'], [palette.black, palette.caramel]),
  makeProduct('p23', 'Bolsa Tote Creme', 'Bolsas', 159.9, 'bolsa-tote-creme', ['Único'], [{ name: 'Creme', hex: '#eee1c9' }, palette.caramel]),
  makeProduct('p24', 'Mini Bolsa Verde', 'Bolsas', 119.9, 'mini-bolsa-verde', ['Único'], [palette.green, palette.black], 'novo'),

  makeProduct('p25', 'Brinco de Argola', 'Acessórios', 49.9, 'brinco-argola', ['Único'], [palette.gold, { name: 'Prata', hex: '#b8b8b8' }]),
  makeProduct('p26', 'Cinto Trançado', 'Acessórios', 59.9, 'cinto-trancado', ['P', 'M', 'G'], [palette.caramel, palette.black]),
  makeProduct('p27', 'Óculos Redondo', 'Acessórios', 69.9, 'oculos-redondo', ['Único'], [palette.black, { name: 'Tartaruga', hex: '#6b4a2f' }]),
  makeProduct('p28', 'Lenço de Seda', 'Acessórios', 54.9, 'lenco-seda', ['Único'], [palette.wine, palette.green]),
  makeProduct('p29', 'Chapéu Panamá', 'Acessórios', 79.9, 'chapeu-panama', ['Único'], [palette.beige, palette.black]),
  makeProduct('p30', 'Carteira de Couro', 'Acessórios', 89.9, 'carteira-couro', ['Único'], [palette.caramel, palette.black]),
  makeProduct('p31', 'Colar Dourado', 'Acessórios', 64.9, 'colar-dourado', ['Único'], [palette.gold], 'novo'),
  makeProduct('p32', 'Chinelo Slide Bege', 'Calçados', 79.9, 'chinelo-slide-bege', ['35/36', '37/38', '39/40'], [palette.beige, palette.black]),
];
