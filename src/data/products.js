
// ============================================================
// PRODUTOS
//
// AS FOTOS SÃO IMPORTADAS AQUI EM CIMA (não são um caminho de texto
// tipo '/produtos/foto.jpg'). Isso é de propósito: importando como
// módulo, o Vite processa o arquivo e garante que ele existe — se
// faltar, o build QUEBRA na hora de gerar o site, então você percebe
// o erro antes de publicar no Vercel, e não depois (link quebrado
// pro cliente ver).
//
// COMO TROCAR POR UMA FOTO DE VERDADE:
// 1. Salve a foto em src/assets/produtos/ (jpg, png ou webp).
// 2. Troque a linha de import correspondente, apontando pro novo
//    arquivo. Pode manter o mesmo nome de arquivo pra não precisar
//    mexer em mais nada, ou usar um nome novo — só ajuste os dois
//    lugares (import + nome do arquivo salvo).
// 3. Fotos verticais (proporção 3:4, ex: 900x1200px) encaixam melhor.
//
// PRA CADASTRAR UM PRODUTO NOVO:
// 1. Importe a foto dele aqui em cima, seguindo o mesmo padrão.
// 2. Copie um bloco { ... } lá embaixo e troque os dados.
//
// CORES: cada cor é { name: 'Nome que aparece', hex: '#rrggbb' }.
// O "hex" é só pra desenhar a bolinha colorida no card — não muda
// a imagem do produto. Se o produto não tem variação de cor, deixe
// só uma cor na lista (ex: produto estampado).
// ============================================================

// import camisaLinhoAreia from '../assets/produtos/camisa-linho-areia.svg';
// import calcaWideLegTerracota from '../assets/produtos/calca-wide-leg-terracota.svg';
// import vestidoMidiMusgo from '../assets/produtos/vestido-midi-musgo.svg';
// import camisaXadrezVinho from '../assets/produtos/camisa-xadrez-vinho.svg';
// import calcaAlfaiatariaPreta from '../assets/produtos/calca-alfaiataria-preta.svg';
// import bolsaTransversalCouro from '../assets/produtos/bolsa-transversal-couro.svg';
// import vestidoLongoEstampado from '../assets/produtos/vestido-longo-estampado.svg';
// import cintoTrancadoCaramelo from '../assets/produtos/cinto-trancado-caramelo.svg';

// export const CATEGORIES = ['Tudo', 'Camisas', 'Calças', 'Vestidos', 'Acessórios'];

// export const PRODUCTS = [
//   {
//     id: 'p1',
//     name: 'Camisa Linho Areia',
//     category: 'Camisas',
//     price: 89.9,
//     sizes: ['P', 'M', 'G'],
//     colors: [
//       { name: 'Areia', hex: '#c9a97a' },
//       { name: 'Off-white', hex: '#efe9dc' },
//     ],
//     image: camisaLinhoAreia,
//     tag: 'novo',
//   },
//   {
//     id: 'p2',
//     name: 'Calça Wide Leg Terracota',
//     category: 'Calças',
//     price: 129.9,
//     sizes: ['36', '38', '40', '42'],
//     colors: [
//       { name: 'Terracota', hex: '#b5563f' },
//       { name: 'Preto', hex: '#15141b' },
//     ],
//     image: calcaWideLegTerracota,
//     tag: '',
//   },
//   {
//     id: 'p3',
//     name: 'Vestido Midi Musgo',
//     category: 'Vestidos',
//     price: 149.9,
//     sizes: ['P', 'M', 'G'],
//     colors: [
//       { name: 'Musgo', hex: '#4a5d3a' },
//       { name: 'Preto', hex: '#15141b' },
//     ],
//     image: vestidoMidiMusgo,
//     tag: 'mais vendido',
//   },
//   {
//     id: 'p4',
//     name: 'Camisa Xadrez Vinho',
//     category: 'Camisas',
//     price: 99.9,
//     sizes: ['P', 'M', 'G', 'GG'],
//     colors: [
//       { name: 'Vinho', hex: '#5c1f2e' },
//       { name: 'Azul', hex: '#2f4d5d' },
//     ],
//     image: camisaXadrezVinho,
//     tag: '',
//   },
//   {
//     id: 'p5',
//     name: 'Calça Alfaiataria Preta',
//     category: 'Calças',
//     price: 139.9,
//     sizes: ['36', '38', '40'],
//     colors: [{ name: 'Preto', hex: '#15141b' }],
//     image: calcaAlfaiatariaPreta,
//     tag: '',
//   },
//   {
//     id: 'p6',
//     name: 'Bolsa Transversal Couro',
//     category: 'Acessórios',
//     price: 79.9,
//     sizes: ['Único'],
//     colors: [
//       { name: 'Caramelo', hex: '#a5652f' },
//       { name: 'Preto', hex: '#15141b' },
//     ],
//     image: bolsaTransversalCouro,
//     tag: 'novo',
//   },
//   {
//     id: 'p7',
//     name: 'Vestido Longo Estampado',
//     category: 'Vestidos',
//     price: 169.9,
//     sizes: ['P', 'M', 'G'],
//     colors: [{ name: 'Estampado', hex: '#8a6a4f' }],
//     image: vestidoLongoEstampado,
//     tag: '',
//   },
//   {
//     id: 'p8',
//     name: 'Cinto Trançado Caramelo',
//     category: 'Acessórios',
//     price: 49.9,
//     sizes: ['Único'],
//     colors: [
//       { name: 'Caramelo', hex: '#a5652f' },
//       { name: 'Preto', hex: '#15141b' },
//     ],
//     image: cintoTrancadoCaramelo,
//     tag: '',
//   },
// ];


// ============================================================
// PRODUTOS
//
// AS FOTOS SÃO IMPORTADAS AQUI EM CIMA (não são um caminho de texto
// tipo '/produtos/foto.jpg'). Isso é de propósito: importando como
// módulo, o Vite processa o arquivo e garante que ele existe — se
// faltar, o build QUEBRA na hora de gerar o site, então você percebe
// o erro antes de publicar no Vercel, e não depois (link quebrado
// pro cliente ver).
//
// COMO TROCAR POR UMA FOTO DE VERDADE:
// 1. Salve a foto em src/assets/produtos/ (jpg, png ou webp).
// 2. Troque a linha de import correspondente, apontando pro novo
//    arquivo. Pode manter o mesmo nome de arquivo pra não precisar
//    mexer em mais nada, ou usar um nome novo — só ajuste os dois
//    lugares (import + nome do arquivo salvo).
// 3. Fotos verticais (proporção 3:4, ex: 900x1200px) encaixam melhor.
//
// PRA CADASTRAR UM PRODUTO NOVO:
// 1. Importe a foto dele aqui em cima, seguindo o mesmo padrão.
// 2. Copie um bloco { ... } lá embaixo e troque os dados.
//
// CORES: cada cor é { name: 'Nome que aparece', hex: '#rrggbb' }.
// O "hex" é só pra desenhar a bolinha colorida no card — não muda
// a imagem do produto. Se o produto não tem variação de cor, deixe
// só uma cor na lista (ex: produto estampado).
// ============================================================

import tenisCasualBranco from '../assets/produtos/tenis-casual-branco.svg';
import tenisChunkyPreto from '../assets/produtos/tenis-chunky-preto.svg';
import sandaliaRasteiraTrancada from '../assets/produtos/sandalia-rasteira-trancada.svg';
import botaCoturnoPreta from '../assets/produtos/bota-coturno-preta.svg';
import sapatilhaBicoFino from '../assets/produtos/sapatilha-bico-fino.svg';
import chineloSlideConfort from '../assets/produtos/chinelo-slide-confort.svg';


import camisaLinhoAreia from '../assets/produtos/camisa-linho-areia.svg';
import calcaWideLegTerracota from '../assets/produtos/calca-wide-leg-terracota.svg';
import vestidoMidiMusgo from '../assets/produtos/vestido-midi-musgo.svg';
import camisaXadrezVinho from '../assets/produtos/camisa-xadrez-vinho.svg';
import calcaAlfaiatariaPreta from '../assets/produtos/calca-alfaiataria-preta.svg';
import bolsaTransversalCouro from '../assets/produtos/bolsa-transversal-couro.svg';
import vestidoLongoEstampado from '../assets/produtos/vestido-longo-estampado.svg';
import cintoTrancadoCaramelo from '../assets/produtos/cinto-trancado-caramelo.svg';

import blusaCroppedTerracota from '../assets/produtos/blusa-cropped-terracota.svg';
import camisaSocialBranca from '../assets/produtos/camisa-social-branca.svg';
import calcaJeansReta from '../assets/produtos/calca-jeans-reta.svg';
import calcaJoggerBege from '../assets/produtos/calca-jogger-bege.svg';
import vestidoCurtoFloral from '../assets/produtos/vestido-curto-floral.svg';
import vestidoLongoListrado from '../assets/produtos/vestido-longo-listrado.svg';
import bermudaSarjaCaqui from '../assets/produtos/bermuda-sarja-caqui.svg';
import oculosSolRedondo from '../assets/produtos/oculos-sol-redondo.svg';
import brincoArgolaDourado from '../assets/produtos/brinco-argola-dourado.svg';
import chapeuPanama from '../assets/produtos/chapeu-panama.svg';

export const CATEGORIES = ['Tudo', 'Camisas', 'Calças','Calçados', 'Vestidos', 'Acessórios'];

export const PRODUCTS = [
  {
    id: 'p1',
    name: 'Camisa Linho Areia',
    category: 'Camisas',
    price: 89.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Areia', hex: '#c9a97a' },
      { name: 'Vermelho', hex: '#c20707' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: camisaLinhoAreia,
    tag: 'novo',
  },
  {
    id: 'p2',
    name: 'Calça Wide Leg Terracota',
    category: 'Calças',
    price: 129.9,
    sizes: ['36', '38', '40', '42'],
    colors: [
      { name: 'Terracota', hex: '#b5563f' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: calcaWideLegTerracota,
    tag: '',
  },
  {
    id: 'p3',
    name: 'Vestido Midi Musgo',
    category: 'Vestidos',
    price: 149.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Musgo', hex: '#4a5d3a' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: vestidoMidiMusgo,
    tag: 'mais vendido',
  },
  {
    id: 'p4',
    name: 'Camisa Xadrez Vinho',
    category: 'Camisas',
    price: 99.9,
    sizes: ['P', 'M', 'G', 'GG'],
    colors: [
      { name: 'Vinho', hex: '#5c1f2e' },
      { name: 'Azul', hex: '#2f4d5d' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: camisaXadrezVinho,
    tag: '',
  },
  {
    id: 'p5',
    name: 'Calça Alfaiataria Preta',
    category: 'Calças',
    price: 139.9,
    sizes: ['36', '38', '40'],
    colors: [
      { name: 'Preto', hex: '#15141b' },
      { name: 'Azul', hex: '#2f4d5d' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: calcaAlfaiatariaPreta,
    tag: '',
  },
  {
    id: 'p6',
    name: 'Blusa Cropped Terracota',
    category: 'Camisas',
    price: 69.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Terracota', hex: '#b5563f' },
      { name: 'Branco', hex: '#efe9dc' },
      { name: 'Marron', hex: 'brown' },
    ],
    image: blusaCroppedTerracota,
    tag: 'novo',
  },
  {
    id: 'p7',
    name: 'Camisa Social Branca',
    category: 'Camisas',
    price: 109.9,
    sizes: ['P', 'M', 'G', 'GG'],
    colors: [
      { name: 'Branco', hex: '#efe9dc' },
      { name: 'Azul', hex: '#2f4d5d' },
      { name: 'Preto', hex: '#15141b' },
    ],
    image: camisaSocialBranca,
    tag: '',
  },
  {
    id: 'p8',
    name: 'Calça Jeans Reta',
    category: 'Calças',
    price: 119.9,
    sizes: ['36', '38', '40', '42'],
    colors: [
      { name: 'Azul', hex: '#2f4d5d' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: calcaJeansReta,
    tag: 'mais vendido',
  },
  {
    id: 'p9',
    name: 'Calça Jogger Bege',
    category: 'Calças',
    price: 99.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Bege', hex: '#d8c9a3' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: calcaJoggerBege,
    tag: '',
  },
  {
    id: 'p10',
    name: 'Vestido Curto Floral',
    category: 'Vestidos',
    price: 119.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Floral', hex: '#c96a7a' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },

    ],
    image: vestidoCurtoFloral,
    tag: 'novo',
  },
  {
    id: 'p11',
    name: 'Vestido Longo Listrado',
    category: 'Vestidos',
    price: 159.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Listrado', hex: '#8a6a4f' },
      { name: 'Caqui', hex: '#9c8b5e' },
      { name: 'Preto', hex: '#15141b' },
    ],
    image: vestidoLongoListrado,
    tag: '',
  },
  {
    id: 'p12',
    name: 'Bermuda Sarja Caqui',
    category: 'Calças',
    price: 89.9,
    sizes: ['36', '38', '40'],
    colors: [
      { name: 'Caqui', hex: '#9c8b5e' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: bermudaSarjaCaqui,
    tag: '',
  },
  {
    id: 'p13',
    name: 'Tênis Casual Branco',
    category: 'Calçados',
    price: 179.9,
    sizes: ['37', '38', '39', '40'],
    colors: [
      { name: 'Branco', hex: '#efe9dc' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Dourado', hex: '#c9a227' },
    ],
    image: tenisCasualBranco,
    tag: 'mais vendido',
  },
  {
    id: 'p14',
    name: 'Tênis Chunky Preto',
    category: 'Calçados',
    price: 219.9,
    sizes: ['36', '37', '38', '39', '40', '41'],
    colors: [
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
      { name: 'Caqui', hex: '#9c8b5e' },
    ],
    image: tenisChunkyPreto,
    tag: 'novo',
  },
  {
    id: 'p15',
    name: 'Sandália Rasteira Trançada',
    category: 'Calçados',
    price: 99.9,
    sizes: ['35', '36', '37', '38', '39'],
    colors: [
      { name: 'Caramelo', hex: '#a5652f' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Bege', hex: '#d8c9a3' },
    
    ],
    image: sandaliaRasteiraTrancada,
    tag: '',
  },
  {
    id: 'p16',
    name: 'Bota Coturno Preta',
    category: 'Calçados',
    price: 249.9,
    sizes: ['36', '37', '38', '39', '40'],
    colors: [
      { name: 'Preto', hex: '#15141b' },
      { name: 'Caramelo', hex: '#a5652f' },
      { name: 'Bege', hex: '#d8c9a3' },
    ],
    image: botaCoturnoPreta,
    tag: '',
  },
  {
    id: 'p17',
    name: 'Sapatilha Bico Fino',
    category: 'Calçados',
    price: 129.9,
    sizes: ['35', '36', '37', '38', '39'],
    colors: [
      { name: 'Nude', hex: '#d9b99b' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Bege', hex: '#d8c9a3' },
    ],
    image: sapatilhaBicoFino,
    tag: '',
  },
  {
    id: 'p18',
    name: 'Chinelo Slide Confort',
    category: 'Calçados',
    price: 69.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Preto', hex: '#15141b' },
      { name: 'Bege', hex: '#d8c9a3' },
      { name: 'Bege', hex: '#d8c9a3' },
    ],
    image: chineloSlideConfort,
    tag: '',
  },
  {
    id: 'p19',
    name: 'Vestido Longo Estampado',
    category: 'Vestidos',
    price: 169.9,
    sizes: ['P', 'M', 'G'],
    colors: [
      { name: 'Estampado', hex: '#8a6a4f' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Laranja', hex: 'orange' },
    ],
    image: vestidoLongoEstampado,
    tag: '',
  },
  {
    id: 'p20',
    name: 'Chapéu Panamá',
    category: 'Acessórios',
    price: 69.9,
    sizes: ['Único'],
    colors: [
      { name: 'Bege', hex: '#d8c9a3' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: chapeuPanama,
    tag: '',
  },
  {
    id: 'p21',
    name: 'Brinco Argola Dourado',
    category: 'Acessórios',
    price: 39.9,
    sizes: ['Único'],
    colors: [
      { name: 'Dourado', hex: '#c9a227' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: brincoArgolaDourado,
    tag: 'novo',
  },
  {
    id: 'p22',
    name: 'Cinto Trançado Caramelo',
    category: 'Acessórios',
    price: 49.9,
    sizes: ['Único'],
    colors: [
      { name: 'Caramelo', hex: '#a5652f' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Marron', hex: 'brown' },
    ],
    image: cintoTrancadoCaramelo,
    tag: '',
  },
  {
    id: 'p23',
    name: 'Óculos de Sol Redondo',
    category: 'Acessórios',
    price: 59.9,
    sizes: ['Único'],
    colors: [
      { name: 'Preto', hex: '#15141b' },
      { name: 'Tartaruga', hex: '#6b4a2f' },
      { name: 'Branco', hex: '#efe9dc' },
    ],
    image: oculosSolRedondo,
    tag: '',
  },
  {
    id: 'p22',
    name: 'Bolsa Trasnversal de couro',
    category: 'Acessórios',
    price: 49.9,
    sizes: ['Único'],
    colors: [
      { name: 'Caramelo', hex: '#a5652f' },
      { name: 'Preto', hex: '#15141b' },
      { name: 'Marron', hex: 'brown' },
    ],
    image: bolsaTransversalCouro,
    tag: '',
  },
];


