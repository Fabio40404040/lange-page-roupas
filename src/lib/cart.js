// ============================================================
// CARRINHO — estado e regras, sem tocar no HTML.
// Guarda o carrinho, salva no navegador (localStorage) e expõe
// funções para adicionar, remover e calcular totais. Quem desenha
// a gaveta na tela é o src/lib/cart-ui.js, que importa daqui.
// ============================================================

// const CART_KEY = 'lojinha_cart_v1';

// export let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

// function persist() {
//   localStorage.setItem(CART_KEY, JSON.stringify(cart));
// }

// export function addToCart(product, size) {
//   const key = `${product.id}__${size}`;
//   const existing = cart.find((i) => i.key === key);
//   if (existing) {
//     existing.qty += 1;
//   } else {
//     cart.push({ key, id: product.id, name: product.name, price: product.price, size, qty: 1 });
//   }
//   persist();
// }

// export function changeQty(key, delta) {
//   const item = cart.find((i) => i.key === key);
//   if (!item) return;
//   item.qty += delta;
//   if (item.qty <= 0) cart = cart.filter((i) => i.key !== key);
//   persist();
// }

// export function removeItem(key) {
//   cart = cart.filter((i) => i.key !== key);
//   persist();
// }

// export function cartTotal() {
//   return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
// }

// export function cartItemCount() {
//   return cart.reduce((sum, i) => sum + i.qty, 0);
// }

// export function formatPrice(n) {
//   return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// }

// ============================================================
// FORMA DE PAGAMENTO — "retirada" (paga pessoalmente ao buscar,
// depois de experimentar) ou "pix" (paga antes, usando o QR do
// rodapé, e manda o comprovante no WhatsApp). Sem backend: é só
// um texto que muda na mensagem que vai pro WhatsApp.
// ============================================================

// const PAYMENT_KEY = 'lojinha_payment_method_v1';

// export let paymentMethod = localStorage.getItem(PAYMENT_KEY) || 'retirada';

// export function setPaymentMethod(method) {
//   paymentMethod = method;
//   localStorage.setItem(PAYMENT_KEY, method);
// }


// ============================================================
// CARRINHO — estado e regras, sem tocar no HTML.
// Guarda o carrinho, salva no navegador (localStorage) e expõe
// funções para adicionar, remover e calcular totais. Quem desenha
// a gaveta na tela é o src/lib/cart-ui.js, que importa daqui.
// ============================================================

const CART_KEY = 'lojinha_cart_v1';
import { variantProductName } from './product-variant.js';

export let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

export function reconcileCart(products) {
  const before = JSON.stringify(cart);
  cart = cart.flatMap((item) => {
    const product = products.find((product) => product.id === item.id && product.active !== false);
    if (!product || product.stock <= 0 || !product.sizes.includes(item.size)) return [];
    const variant = product.colors.find((color) => color.name === item.color);
    if (!variant) return [];
    return [{ ...item, name: variantProductName(product, variant), price: product.price,
      stock: product.stock, qty: Math.min(item.qty, product.stock), image: variant.image || product.image }];
  });
  if (before !== JSON.stringify(cart)) persist();
}

function persist() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(product, size, color) {
  const key = `${product.id}__${size}__${color}`;
  const selectedVariant = product.colors?.find((variant) => variant.name === color);
  const existing = cart.find((i) => i.key === key);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, product.stock);
    existing.image = selectedVariant?.image || product.image;
    existing.name = variantProductName(product, selectedVariant);
  } else {
    cart.push({
      key,
      id: product.id,
      name: variantProductName(product, selectedVariant),
      price: product.price,
      size,
      color,
      image: selectedVariant?.image || product.image,
      stock: product.stock,
      qty: 1,
    });
  }
  persist();
}

export function changeQty(key, delta) {
  const item = cart.find((i) => i.key === key);
  if (!item) return;
  item.qty = Math.min(item.qty + delta, item.stock || Infinity);
  if (item.qty <= 0) cart = cart.filter((i) => i.key !== key);
  persist();
}

export function removeItem(key) {
  cart = cart.filter((i) => i.key !== key);
  persist();
}

export function clearCart() {
  cart = [];
  persist();
}

export function cartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function cartItemCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

export function formatPrice(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============================================================
// FORMA DE PAGAMENTO — "retirada" (paga pessoalmente ao buscar,
// depois de experimentar) ou "pix" (paga antes, usando o QR do
// rodapé, e manda o comprovante no WhatsApp). Sem backend: é só
// um texto que muda na mensagem que vai pro WhatsApp.
// ============================================================

const PAYMENT_KEY = 'lojinha_payment_method_v1';

export let paymentMethod = localStorage.getItem(PAYMENT_KEY) || 'retirada';

export function setPaymentMethod(method) {
  paymentMethod = method;
  localStorage.setItem(PAYMENT_KEY, method);
}
