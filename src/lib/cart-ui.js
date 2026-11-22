// ============================================================
// CART-UI — desenha a gaveta do carrinho na tela e controla
// abrir/fechar. A lógica de estado (somar, remover, total) vem
// de src/lib/cart.js; aqui só existe DOM.
// ============================================================

// import { cart, changeQty, removeItem, cartTotal, cartItemCount, formatPrice, paymentMethod, setPaymentMethod } from './cart.js';

// // Textos de apoio, mostrados embaixo do seletor conforme a escolha
// const PAYMENT_HINTS = {
//   retirada: 'Você paga pessoalmente ao buscar as peças na loja — dá tempo de experimentar antes.',
//   pix: 'O código Pix está no rodapé do site. Pague, tire um print e manda pra gente aqui no WhatsApp.',
//   cartao: 'Depois de finalizar, a gente te manda um link seguro de pagamento por cartão aqui no WhatsApp.',
// };

// export function renderPaymentMethod() {
//   const wrap = document.getElementById('paymentMethod');
//   const hint = document.getElementById('paymentMethodHint');

//   wrap.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
//     input.checked = input.value === paymentMethod;
//   });
//   hint.textContent = PAYMENT_HINTS[paymentMethod] || '';
// }

// export function bindPaymentMethod() {
//   const wrap = document.getElementById('paymentMethod');
//   wrap.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
//     input.addEventListener('change', () => {
//       setPaymentMethod(input.value);
//       renderPaymentMethod();
//     });
//   });
// }

// export function renderCartCount() {
//   const n = cartItemCount();
//   document.getElementById('cartCount').textContent = n;
//   document.getElementById('fabCount').textContent = n;
// }

// export function renderCartItems() {
//   const wrap = document.getElementById('cartItems');
//   wrap.innerHTML = '';

//   if (cart.length === 0) {
//     const empty = document.createElement('p');
//     empty.className = 'cartEmpty';
//     empty.textContent = 'Seu carrinho está vazio. Escolha algo bonito ali em cima ✨';
//     wrap.appendChild(empty);
//   } else {
//     cart.forEach((item) => {
//       const row = document.createElement('div');
//       row.className = 'cartItem';
//       row.innerHTML = `
//         <div class="cartItem__swatch"></div>
//         <div class="cartItem__info">
//           <p class="cartItem__name">${item.name}</p>
//           <p class="cartItem__meta">Tam. ${item.size} · ${formatPrice(item.price)}</p>
//           <button class="cartItem__remove" data-key="${item.key}">remover</button>
//         </div>
//         <div class="cartItem__qty">
//           <button data-key="${item.key}" data-delta="-1">−</button>
//           <span>${item.qty}</span>
//           <button data-key="${item.key}" data-delta="1">+</button>
//         </div>
//       `;
//       wrap.appendChild(row);
//     });

//     wrap.querySelectorAll('[data-delta]').forEach((btn) => {
//       btn.addEventListener('click', () => {
//         changeQty(btn.dataset.key, Number(btn.dataset.delta));
//         renderCart();
//       });
//     });
//     wrap.querySelectorAll('.cartItem__remove').forEach((btn) => {
//       btn.addEventListener('click', () => {
//         removeItem(btn.dataset.key);
//         renderCart();
//       });
//     });
//   }

//   document.getElementById('cartTotal').textContent = formatPrice(cartTotal());
// }

// // Atalho: atualiza contador + itens + forma de pagamento de uma vez
// export function renderCart() {
//   renderCartCount();
//   renderCartItems();
//   renderPaymentMethod();
// }

// export function openCart() {
//   document.getElementById('cartDrawer').classList.add('open');
//   document.getElementById('cartOverlay').classList.add('open');
// }

// export function closeCart() {
//   document.getElementById('cartDrawer').classList.remove('open');
//   document.getElementById('cartOverlay').classList.remove('open');
// }



// ============================================================
// CART-UI — desenha a gaveta do carrinho na tela e controla
// abrir/fechar. A lógica de estado (somar, remover, total) vem
// de src/lib/cart.js; aqui só existe DOM.
// ============================================================

import { cart, changeQty, removeItem, cartTotal, cartItemCount, formatPrice, paymentMethod, setPaymentMethod } from './cart.js';
import { getStore } from './store.js';

// Textos de apoio, mostrados embaixo do seletor conforme a escolha
const PAYMENT_HINTS = {
  retirada: 'Pagamento normal no momento da retirada do pedido.',
  pix: 'Pagamento real via Pix. O QR Code será mostrado após finalizar o pedido.',
  cartao: 'Demonstração: nenhum dado do cartão será solicitado ou cobrado.',
};

export function renderPaymentMethod() {
  const wrap = document.getElementById('paymentMethod');
  const hint = document.getElementById('paymentMethodHint');
  const pixAvailable = Boolean(getStore().pixKey);
  if (paymentMethod === 'pix' && !pixAvailable) setPaymentMethod('retirada');

  wrap.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.disabled = input.value === 'pix' && !pixAvailable;
    input.checked = input.value === paymentMethod;
  });
  hint.textContent = !pixAvailable && paymentMethod !== 'pix'
    ? `${PAYMENT_HINTS[paymentMethod] || ''} Pix ficará disponível após cadastrar uma chave no painel.`
    : PAYMENT_HINTS[paymentMethod] || '';
}

export function bindPaymentMethod() {
  const wrap = document.getElementById('paymentMethod');
  wrap.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener('change', () => {
      setPaymentMethod(input.value);
      renderPaymentMethod();
    });
  });
}

export function renderCartCount() {
  const n = cartItemCount();
  document.getElementById('cartCount').textContent = n;
  document.getElementById('fabCount').textContent = n;
}

export function renderCartItems() {
  const wrap = document.getElementById('cartItems');
  wrap.innerHTML = '';

  if (cart.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'cartEmpty';
    empty.textContent = 'Seu carrinho está vazio. Escolha algo bonito ali em cima ✨';
    wrap.appendChild(empty);
  } else {
    cart.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'cartItem';
      const photo = item.image
        ? `<img src="${item.image}" alt="${item.name}" class="cartItem__swatch" />`
        : `<div class="cartItem__swatch"></div>`;
      row.innerHTML = `
        ${photo}
        <div class="cartItem__info">
          <p class="cartItem__name">${item.name}</p>
          <p class="cartItem__meta">Tam. ${item.size} · Cor ${item.color} · ${formatPrice(item.price)}</p>
          <button class="cartItem__remove" data-key="${item.key}">remover</button>
        </div>
        <div class="cartItem__qty">
          <button data-key="${item.key}" data-delta="-1">−</button>
          <span>${item.qty}</span>
          <button data-key="${item.key}" data-delta="1">+</button>
        </div>
      `;
      wrap.appendChild(row);
    });

    wrap.querySelectorAll('[data-delta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        changeQty(btn.dataset.key, Number(btn.dataset.delta));
        renderCart();
      });
    });
    wrap.querySelectorAll('.cartItem__remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        removeItem(btn.dataset.key);
        renderCart();
      });
    });
  }

  document.getElementById('cartTotal').textContent = formatPrice(cartTotal());
}

// Atalho: atualiza contador + itens + forma de pagamento de uma vez
export function renderCart() {
  renderCartCount();
  renderCartItems();
  renderPaymentMethod();
}

export function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
}

export function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}
