

// ============================================================
// CATÁLOGO — desenha os chips de categoria e a grade de produtos.
// Lê os dados de src/data/products.js e usa src/lib/cart.js para
// adicionar itens ao carrinho.
// ============================================================

// import { CATEGORIES, PRODUCTS } from '../data/products.js';
// import { addToCart, formatPrice } from './cart.js';
// import { renderCart, openCart } from './cart-ui.js';

// let activeCategory = 'Tudo';
// const selectedSize = {}; // { productId: 'M' }
// const selectedColor = {}; // { productId: 'Areia' }

// export function renderChips() {
//   const wrap = document.getElementById('chips');
//   wrap.innerHTML = '';
//   CATEGORIES.forEach((cat) => {
//     const btn = document.createElement('button');
//     btn.className = 'chip';
//     btn.textContent = cat;
//     btn.setAttribute('aria-pressed', String(cat === activeCategory));
//     btn.addEventListener('click', () => {
//       activeCategory = cat;
//       renderChips();
//       renderCatalog();
//     });
//     wrap.appendChild(btn);
//   });
// }

// export function renderCatalog() {
//   const wrap = document.getElementById('catalogo');
//   wrap.innerHTML = '';
//   const list = activeCategory === 'Tudo' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

//   list.forEach((product) => {
//     if (!selectedSize[product.id]) selectedSize[product.id] = product.sizes[0];
//     if (!selectedColor[product.id]) selectedColor[product.id] = product.colors[0].name;

//     const card = document.createElement('article');
//     card.className = 'card';

//     const photo = document.createElement('div');
//     photo.className = 'card__photo';
//     if (product.image) {
//       const img = document.createElement('img');
//       img.src = product.image;
//       img.alt = product.name;
//       photo.appendChild(img);
//     } else {
//       photo.textContent = product.name.split(' ')[0];
//     }
//     card.appendChild(photo);

//     if (product.tag) {
//       const badge = document.createElement('span');
//       badge.className = 'card__tagBadge';
//       badge.textContent = product.tag;
//       card.appendChild(badge);
//     }

//     const price = document.createElement('span');
//     price.className = 'card__price';
//     price.textContent = formatPrice(product.price);
//     card.appendChild(price);

//     const body = document.createElement('div');
//     body.className = 'card__body';

//     const name = document.createElement('p');
//     name.className = 'card__name';
//     name.textContent = product.name;
//     body.appendChild(name);

//     if (product.sizes.length > 1 || product.sizes[0] !== 'Único') {
//       const sizesWrap = document.createElement('div');
//       sizesWrap.className = 'card__sizes';
//       product.sizes.forEach((size) => {
//         const sBtn = document.createElement('button');
//         sBtn.className = 'sizeBtn';
//         sBtn.textContent = size;
//         sBtn.setAttribute('aria-pressed', String(selectedSize[product.id] === size));
//         sBtn.addEventListener('click', () => {
//           selectedSize[product.id] = size;
//           renderCatalog();
//         });
//         sizesWrap.appendChild(sBtn);
//       });
//       body.appendChild(sizesWrap);
//     }

//     if (product.colors.length > 1) {
//       const colorsWrap = document.createElement('div');
//       colorsWrap.className = 'card__colors';
//       product.colors.forEach((color) => {
//         const cBtn = document.createElement('button');
//         cBtn.className = 'colorSwatch';
//         cBtn.style.setProperty('--swatch-color', color.hex);
//         cBtn.title = color.name;
//         cBtn.setAttribute('aria-label', color.name);
//         cBtn.setAttribute('aria-pressed', String(selectedColor[product.id] === color.name));
//         cBtn.addEventListener('click', () => {
//           selectedColor[product.id] = color.name;
//           renderCatalog();
//         });
//         colorsWrap.appendChild(cBtn);
//       });
//       body.appendChild(colorsWrap);
//     }

//     const addBtn = document.createElement('button');
//     addBtn.className = 'card__add';
//     addBtn.textContent = 'Adicionar';
//     addBtn.addEventListener('click', () => {
//       addToCart(product, selectedSize[product.id], selectedColor[product.id]);
//       renderCart();
//       openCart();
//     });
//     body.appendChild(addBtn);

//     card.appendChild(body);
//     wrap.appendChild(card);
//   });
// }


// ============================================================
// CATÁLOGO — desenha os chips de categoria e a grade de produtos.
// Lê os dados de src/data/products.js e usa src/lib/cart.js para
// adicionar itens ao carrinho.
// ============================================================

import { addToCart, formatPrice } from './cart.js';
import { renderCart, openCart } from './cart-ui.js';
import { getCategories, getProducts } from './store.js';

let activeCategory = 'Tudo';
const selectedSize = {}; // { productId: 'M' }
const selectedColor = {}; // { productId: 'Areia' }
const isDemoVariantImage = (source = '') => source.includes('/products-demo/variants/');
const normalizedVariantImages = new Map();

function loadCatalogImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function normalizeDemoVariant(source) {
  if (!isDemoVariantImage(source)) return source;
  if (normalizedVariantImages.has(source)) return normalizedVariantImages.get(source);

  const normalized = loadCatalogImage(source).then((sourceImage) => {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(sourceImage, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const samplePoints = [
      [0.02, 0.02], [0.5, 0.02], [0.98, 0.02],
      [0.02, 0.98], [0.5, 0.98], [0.98, 0.98],
      [0.03, 0.18], [0.97, 0.18], [0.03, 0.5], [0.97, 0.5], [0.03, 0.82], [0.97, 0.82],
    ];
    const replacement = [245, 241, 232];
    const toleranceSquared = 52 * 52;
    const pixelCount = canvas.width * canvas.height;
    const visited = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);

    samplePoints.forEach(([relativeX, relativeY], sampleIndex) => {
      const startX = Math.min(canvas.width - 1, Math.round(relativeX * canvas.width));
      const startY = Math.min(canvas.height - 1, Math.round(relativeY * canvas.height));
      const start = startY * canvas.width + startX;
      const startOffset = start * 4;
      const sample = [pixels[startOffset], pixels[startOffset + 1], pixels[startOffset + 2]];
      const marker = sampleIndex + 1;
      let head = 0;
      let tail = 1;
      queue[0] = start;
      visited[start] = marker;

      while (head < tail) {
        const index = queue[head++];
        const offset = index * 4;
        const redDiff = pixels[offset] - sample[0];
        const greenDiff = pixels[offset + 1] - sample[1];
        const blueDiff = pixels[offset + 2] - sample[2];
        if (redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff > toleranceSquared) continue;

        pixels[offset] = replacement[0];
        pixels[offset + 1] = replacement[1];
        pixels[offset + 2] = replacement[2];

        const x = index % canvas.width;
        if (x > 0 && visited[index - 1] !== marker) {
          visited[index - 1] = marker;
          queue[tail++] = index - 1;
        }
        if (x < canvas.width - 1 && visited[index + 1] !== marker) {
          visited[index + 1] = marker;
          queue[tail++] = index + 1;
        }
        if (index >= canvas.width && visited[index - canvas.width] !== marker) {
          visited[index - canvas.width] = marker;
          queue[tail++] = index - canvas.width;
        }
        if (index < pixelCount - canvas.width && visited[index + canvas.width] !== marker) {
          visited[index + canvas.width] = marker;
          queue[tail++] = index + canvas.width;
        }
      }
    });

    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/webp', 0.84);
  });
  normalizedVariantImages.set(source, normalized);
  return normalized;
}

async function applyCatalogImage(image, source, alt) {
  image.alt = alt;
  image.dataset.source = source;
  try {
    const normalizedSource = await normalizeDemoVariant(source);
    if (image.dataset.source === source) image.src = normalizedSource;
  } catch {
    if (image.dataset.source === source) image.src = source;
  }
}

export function renderChips() {
  const wrap = document.getElementById('chips');
  wrap.innerHTML = '';
  getCategories().forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = cat;
    btn.setAttribute('aria-pressed', String(cat === activeCategory));
    btn.addEventListener('click', () => setCategory(cat));
    wrap.appendChild(btn);
  });
}

// Troca a categoria ativa (usado pelos chips e pelo menu hambúrguer)
export function setCategory(cat) {
  activeCategory = cat;
  renderChips();
  renderCatalog();
  document.dispatchEvent(new CustomEvent('categorychange', { detail: cat }));
}

export function getActiveCategory() {
  return activeCategory;
}

export function renderCatalog() {
  const wrap = document.getElementById('catalogo');
  wrap.innerHTML = '';
  const PRODUCTS = getProducts();
  const list = activeCategory === 'Tudo' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

  list.forEach((product) => {
    if (!selectedSize[product.id]) selectedSize[product.id] = product.sizes[0];
    if (!selectedColor[product.id]) selectedColor[product.id] = product.colors[0].name;
    const activeColor = product.colors.find((color) => color.name === selectedColor[product.id]) || product.colors[0];
    const activeImage = activeColor?.image || product.image;

    const card = document.createElement('article');
    card.className = 'card';

    const photo = document.createElement('div');
    photo.className = 'card__photo';
    let img = null;
    if (activeImage) {
      photo.classList.add('card__photo--hasImage');
      img = document.createElement('img');
      photo.appendChild(img);
      applyCatalogImage(img, activeImage, `${product.name} na cor ${activeColor?.name || ''}`.trim());
    } else {
      photo.textContent = product.name.split(' ')[0];
    }

    const price = document.createElement('span');
    price.className = 'card__price';
    price.textContent = formatPrice(product.price);
    photo.appendChild(price);
    card.appendChild(photo);

    if (product.tag) {
      const badge = document.createElement('span');
      badge.className = 'card__tagBadge';
      badge.textContent = product.tag;
      card.appendChild(badge);
    }

    const body = document.createElement('div');
    body.className = 'card__body';

    const name = document.createElement('p');
    name.className = 'card__name';
    name.textContent = product.name;
    body.appendChild(name);

    const stock = document.createElement('span');
    stock.className = `card__stock${product.stock <= 3 ? ' card__stock--low' : ''}`;
    stock.textContent = product.stock === 0 ? 'Esgotado' : product.stock <= 3 ? `Últimas ${product.stock} peças` : `${product.stock} disponíveis`;
    body.appendChild(stock);

    if (product.sizes.length > 1 || product.sizes[0] !== 'Único') {
      const sizesLabel = document.createElement('span');
      sizesLabel.className = 'card__fieldLabel';
      sizesLabel.textContent = 'Tamanho';
      body.appendChild(sizesLabel);

      const sizesWrap = document.createElement('div');
      sizesWrap.className = 'card__sizes';
      product.sizes.forEach((size) => {
        const sBtn = document.createElement('button');
        sBtn.className = 'sizeBtn';
        sBtn.textContent = size;
        sBtn.setAttribute('aria-pressed', String(selectedSize[product.id] === size));
        sBtn.addEventListener('click', () => {
          selectedSize[product.id] = size;
          sizesWrap.querySelectorAll('.sizeBtn').forEach((button) => {
            button.setAttribute('aria-pressed', String(button === sBtn));
          });
        });
        sizesWrap.appendChild(sBtn);
      });
      body.appendChild(sizesWrap);
    }

    if (product.colors.length > 1) {
      const colorsLabel = document.createElement('span');
      colorsLabel.className = 'card__fieldLabel';
      colorsLabel.textContent = `Cores — ${selectedColor[product.id]}`;
      body.appendChild(colorsLabel);

      const colorsWrap = document.createElement('div');
      colorsWrap.className = 'card__colors';
      product.colors.forEach((color) => {
        const cBtn = document.createElement('button');
        cBtn.className = 'colorSwatch';
        cBtn.style.setProperty('--swatch-color', color.hex);
        cBtn.title = color.name;
        cBtn.setAttribute('aria-label', color.name);
        cBtn.setAttribute('aria-pressed', String(selectedColor[product.id] === color.name));
        cBtn.addEventListener('pointerdown', () => {
          cBtn.catalogScrollPosition = { x: window.scrollX, y: window.scrollY };
        });
        cBtn.addEventListener('click', () => {
          const scrollPosition = cBtn.catalogScrollPosition || { x: window.scrollX, y: window.scrollY };
          const restoreScroll = () => window.scrollTo(scrollPosition.x, scrollPosition.y);
          selectedColor[product.id] = color.name;
          colorsLabel.textContent = `Cores — ${color.name}`;
          colorsWrap.querySelectorAll('.colorSwatch').forEach((button) => {
            button.setAttribute('aria-pressed', String(button === cBtn));
          });

          const nextImage = color.image || product.image;
          if (nextImage) {
            if (!img) {
              photo.textContent = '';
              photo.classList.add('card__photo--hasImage');
              img = document.createElement('img');
              photo.appendChild(img);
            }
            applyCatalogImage(img, nextImage, `${product.name} na cor ${color.name}`).then(restoreScroll);
          }
          requestAnimationFrame(restoreScroll);
        });
        colorsWrap.appendChild(cBtn);
      });
      body.appendChild(colorsWrap);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'card__add';
    addBtn.textContent = product.stock === 0 ? 'Esgotado' : 'Adicionar';
    addBtn.disabled = product.stock === 0;
    addBtn.addEventListener('click', () => {
      addToCart(product, selectedSize[product.id], selectedColor[product.id]);
      renderCart();
      openCart();
    });
    body.appendChild(addBtn);

    card.appendChild(body);
    wrap.appendChild(card);
  });
}
