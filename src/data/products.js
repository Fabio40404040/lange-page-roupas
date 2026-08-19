// *produtos (o campo "image" aponta pra cá ↓)

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
// ============================================================

import camisaLinhoAreia from '../assets/produtos/camisa-linho-areia.svg';
import calcaWideLegTerracota from '../assets/produtos/calca-wide-leg-terracota.svg';
import vestidoMidiMusgo from '../assets/produtos/vestido-midi-musgo.svg';
import camisaXadrezVinho from '../assets/produtos/camisa-xadrez-vinho.svg';
import calcaAlfaiatariaPreta from '../assets/produtos/calca-alfaiataria-preta.svg';
import bolsaTransversalCouro from '../assets/produtos/bolsa-transversal-couro.svg';
import vestidoLongoEstampado from '../assets/produtos/vestido-longo-estampado.svg';
import cintoTrancadoCaramelo from '../assets/produtos/cinto-trancado-caramelo.svg';
import tshirt from '../assets/produtos/t-shirt.svg';
import blusa  from '../assets/produtos/blusa.svg';
import bone from '../assets/produtos/bone.svg';
import calca from '../assets/produtos/calca.svg';
import conjunto from '../assets/produtos/conjunto.svg';
import cueca from '../assets/produtos/cueca.svg';
import gorro from '../assets/produtos/gorro.svg';
import langerry from '../assets/produtos/langerry.svg';
import regata from '../assets/produtos/regata.svg';
import tenis from '../assets/produtos/tenis.svg';


export const CATEGORIES = ['Tudo', 'Camisas', 'Calças', 'Vestidos', 'Calçados', 'Acessórios'];

export const PRODUCTS = [
  {
    id: 'p1',
    name: 'Camisa Linho Areia',
    category: 'Camisas',
    price: 89.9,
    sizes: ['P', 'M', 'G'],
    image: camisaLinhoAreia,
    tag: 'novo',
  },
  {
    id: 'p2',
    name: 'Calça Wide Leg Terracota',
    category: 'Calças',
    price: 129.9,
    sizes: ['36', '38', '40', '42'],
    image: calcaWideLegTerracota,
    tag: '',
  },
  {
    id: 'p3',
    name: 'Vestido Midi Musgo',
    category: 'Vestidos',
    price: 149.9,
    sizes: ['P', 'M', 'G'],
    image: vestidoMidiMusgo,
    tag: 'mais vendido',
  },
  {
    id: 'p4',
    name: 'Camisa Xadrez Vinho',
    category: 'Camisas',
    price: 99.9,
    sizes: ['P', 'M', 'G', 'GG'],
    image: camisaXadrezVinho,
    tag: '',
  },
  {
    id: 'p5',
    name: 'Calça Alfaiataria Preta',
    category: 'Calças',
    price: 139.9,
    sizes: ['36', '38', '40'],
    image: calcaAlfaiatariaPreta,
    tag: '',
  },
  {
    id: 'p6',
    name: 'Bolsa Transversal Couro',
    category: 'Acessórios',
    price: 79.9,
    sizes: ['Único'],
    image: bolsaTransversalCouro,
    tag: 'novo',
  },
  {
    id: 'p7',
    name: 'Vestido Longo Estampado',
    category: 'Vestidos',
    price: 169.9,
    sizes: ['P', 'M', 'G'],
    image: vestidoLongoEstampado,
    tag: '',
  },
  {
    id: 'p8',
    name: 'Cinto Trançado Caramelo',
    category: 'Acessórios',
    price: 49.9,
    sizes: ['Único'],
    image: cintoTrancadoCaramelo,
    tag: '',
  },
   {
    id: 'p9',
    name: 'T-shirt',
    category: 'Camisas',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: tshirt,
    tag: '',
  },
  {
    id: 'p10',
    name: 'Blusa',
    category: 'Camisas',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: blusa,
    tag: '',
  },
  {
    id: 'p11',
    name: 'Boné',
    category: 'Acessórios',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: bone,
    tag: '',
  },
  {
    id: 'p12',
    name: 'Calca',
    category: 'Calças',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: calca,
    tag: '',
  },
  {
    id: 'p13',
    name: 'Conjunto',
    category: 'Vestidos',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: conjunto,
    tag: '',
  },
  {
    id: 'p14',
    name: 'Cueca',
    category: 'Acessórios',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: cueca,
    tag: '',
  },
  {
    id: 'p15',
    name: 'Gorro',
    category: 'Acessórios',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: gorro,
    tag: '',
  },
  {
    id: 'p16',
    name: 'Langerry',
    category: 'Acessórios',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: langerry,
    tag: '',
  },
  {
    id: 'p17',
    name: 'Regata',
    category: 'Camisas',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: regata,
    tag: '',
  },
  {
    id: 'p18',
    name: 'Tênis',
    category: 'Calçados',
    price: 49.9,
    sizes: ['36', '38', '40'],
    image: tenis,
    tag: '',
  },
];

