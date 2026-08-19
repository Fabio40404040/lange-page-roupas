// * desenha categorias e grade de produtos

// ============================================================
// CATÁLOGO — desenha os chips de categoria e a grade de produtos.
// Lê os dados de src/data/products.js e usa src/lib/cart.js para
// adicionar itens ao carrinho.
// ============================================================

import { CATEGORIES, PRODUCTS } from '../data/products.js';
import { addToCart, formatPrice } from './cart.js';
import { renderCart, openCart } from './cart-ui.js';

let activeCategory = 'Tudo';
const selectedSize = {}; // { productId: 'M' }

export function renderChips() {
  const wrap = document.getElementById('chips');
  wrap.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = cat;
    btn.setAttribute('aria-pressed', String(cat === activeCategory));
    btn.addEventListener('click', () => {
      activeCategory = cat;
      renderChips();
      renderCatalog();
    });
    wrap.appendChild(btn);
  });
}

export function renderCatalog() {
  const wrap = document.getElementById('catalogo');
  wrap.innerHTML = '';
  const list = activeCategory === 'Tudo' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

  list.forEach((product) => {
    if (!selectedSize[product.id]) selectedSize[product.id] = product.sizes[0];

    const card = document.createElement('article');
    card.className = 'card';

    const photo = document.createElement('div');
    photo.className = 'card__photo';
    if (product.image) {
      const img = document.createElement('img');
      img.src = product.image;
      img.alt = product.name;
      photo.appendChild(img);
    } else {
      photo.textContent = product.name.split(' ')[0];
    }
    card.appendChild(photo);

    if (product.tag) {
      const badge = document.createElement('span');
      badge.className = 'card__tagBadge';
      badge.textContent = product.tag;
      card.appendChild(badge);
    }

    const price = document.createElement('span');
    price.className = 'card__price';
    price.textContent = formatPrice(product.price);
    card.appendChild(price);

    const body = document.createElement('div');
    body.className = 'card__body';

    const name = document.createElement('p');
    name.className = 'card__name';
    name.textContent = product.name;
    body.appendChild(name);

    if (product.sizes.length > 1 || product.sizes[0] !== 'Único') {
      const sizesWrap = document.createElement('div');
      sizesWrap.className = 'card__sizes';
      product.sizes.forEach((size) => {
        const sBtn = document.createElement('button');
        sBtn.className = 'sizeBtn';
        sBtn.textContent = size;
        sBtn.setAttribute('aria-pressed', String(selectedSize[product.id] === size));
        sBtn.addEventListener('click', () => {
          selectedSize[product.id] = size;
          renderCatalog();
        });
        sizesWrap.appendChild(sBtn);
      });
      body.appendChild(sizesWrap);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'card__add';
    addBtn.textContent = 'Adicionar';
    addBtn.addEventListener('click', () => {
      addToCart(product, selectedSize[product.id]);
      renderCart();
      openCart();
    });
    body.appendChild(addBtn);

    card.appendChild(body);
    wrap.appendChild(card);
  });
}
