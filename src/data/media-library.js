const groups = [
  ['Vestidos', '/image-library/vestidos.png', ['Vestido midi esmeralda', 'Vestido envelope terracota', 'Vestido de festa preto', 'Vestido de linho creme']],
  ['Blusas', '/image-library/blusas.png', ['Camisa de linho branca', 'Blusa cropped ferrugem', 'Top de cetim preto', 'Suéter de tricô verde']],
  ['Calças & saias', '/image-library/calcas-saias.png', ['Calça jeans reta', 'Calça alfaiataria caramelo', 'Saia midi preta', 'Short de linho creme']],
  ['Tênis', '/image-library/tenis.png', ['Tênis chunky branco', 'Tênis casual preto', 'Tênis esportivo bege', 'Tênis lona verde']],
  ['Calçados', '/image-library/calcados.png', ['Bota de cano curto', 'Sandália caramelo', 'Sapatilha nude', 'Salto bloco vinho']],
  ['Bolsas', '/image-library/bolsas.png', ['Bolsa transversal caramelo', 'Bolsa estruturada preta', 'Bolsa tote creme', 'Mini bolsa verde']],
  ['Acessórios', '/image-library/acessorios.png', ['Brinco de argola', 'Cinto trançado', 'Óculos redondo', 'Lenço de seda']],
  ['Mix', '/image-library/mix.png', ['Chapéu panamá', 'Carteira de couro', 'Colar dourado', 'Chinelo slide bege']],
];

export const MEDIA_LIBRARY = groups.flatMap(([group, sheet, labels], groupIndex) => labels.map((label, index) => ({
  id: `acervo-${groupIndex + 1}-${index + 1}`,
  group,
  label,
  sheet,
  column: index % 2,
  row: Math.floor(index / 2),
})));

export const MEDIA_GROUPS = groups.map(([group]) => group);
