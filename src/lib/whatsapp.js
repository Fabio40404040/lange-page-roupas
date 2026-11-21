// ============================================================
// WHATSAPP — monta a mensagem com os itens do carrinho e abre
// o WhatsApp já com o texto preenchido (o cliente só envia).
// ============================================================

// import { STORE } from '../data/config.js';
// import { cart, cartTotal, formatPrice, paymentMethod } from './cart.js';
// import { openCart } from './cart-ui.js';

// const PAYMENT_LABELS = {
//   retirada: 'Retirada na loja (pago no local, depois de experimentar)',
//   pix: 'Pix agora (já vou mandar o comprovante aqui)',
//   cartao: 'Cartão via link (pode me mandar o link de pagamento?)',
// };

// function buildWhatsappMessage() {
//   const lines = [STORE.whatsappGreeting, ''];
//   cart.forEach((item) => {
//     lines.push(`• ${item.qty}x ${item.name} (tam. ${item.size}) — ${formatPrice(item.price * item.qty)}`);
//   });
//   lines.push('', `Total: ${formatPrice(cartTotal())}`);
//   lines.push(`Forma de pagamento: ${PAYMENT_LABELS[paymentMethod] || paymentMethod}`);
//   return lines.join('\n');
// }

// export function goToWhatsapp() {
//   if (cart.length === 0) {
//     openCart();
//     return;
//   }
//   const message = encodeURIComponent(buildWhatsappMessage());
//   const url = `https://wa.me/${STORE.whatsappNumber}?text=${message}`;
//   window.open(url, '_blank', 'noopener');
// }


// ============================================================
// WHATSAPP — monta a mensagem com os itens do carrinho e abre
// o WhatsApp já com o texto preenchido (o cliente só envia).
// ============================================================

// import { STORE } from '../data/config.js';
// import { cart, cartTotal, formatPrice, paymentMethod } from './cart.js';
// import { openCart } from './cart-ui.js';

// const PAYMENT_LABELS = {
//   retirada: 'Retirada na loja (pago no local, depois de experimentar)',
//   pix: 'Pix agora (já vou mandar o comprovante aqui)',
//   cartao: 'Cartão via link (pode me mandar o link de pagamento?)',
// };

// function buildWhatsappMessage() {
//   const lines = [STORE.whatsappGreeting, ''];
//   cart.forEach((item) => {
//     lines.push(
//       `• ${item.qty}x ${item.name} (tam. ${item.size}, cor ${item.color}) — ${formatPrice(item.price * item.qty)}`
//     );
//     if (item.image) {
//       // Link direto da foto — só vira preview de imagem de verdade no WhatsApp
//       // depois que o site estiver publicado (Vercel já serve como link público,
//       // não precisa comprar domínio próprio pra isso funcionar).
//       lines.push(`  Foto: ${window.location.origin}${item.image}`);
//     }
//   });
//   lines.push('', `Total: ${formatPrice(cartTotal())}`);
//   lines.push(`Forma de pagamento: ${PAYMENT_LABELS[paymentMethod] || paymentMethod}`);
//   return lines.join('\n');
// }

// export function goToWhatsapp() {
//   if (cart.length === 0) {
//     openCart();
//     return;
//   }
//   const message = encodeURIComponent(buildWhatsappMessage());
//   const url = `https://wa.me/${STORE.whatsappNumber}?text=${message}`;
//   window.open(url, '_blank', 'noopener');
// }


// ============================================================
// WHATSAPP — monta a mensagem com os itens do carrinho e abre
// o WhatsApp já com o texto preenchido (o cliente só envia).
// ============================================================

import { cart, cartTotal, formatPrice, paymentMethod } from './cart.js';
import { openCart } from './cart-ui.js';
import { getStore } from './store.js';

const PAYMENT_LABELS = {
  retirada: 'Retirada na loja (pago no local, depois de experimentar)',
  pix: 'Pix agora (já vou mandar o comprovante aqui)',
  cartao: 'Cartão via link (pode me mandar o link de pagamento?)',
};

function buildWhatsappMessage() {
  const STORE = getStore();
  const lines = [STORE.whatsappGreeting, ''];
  cart.forEach((item) => {
    lines.push(
      `• ${item.qty}x ${item.name} (tam. ${item.size}, cor ${item.color}) — ${formatPrice(item.price * item.qty)}`
    );
    if (item.image) {
      // Link direto da foto — só vira preview de imagem de verdade no WhatsApp
      // depois que o site estiver publicado (Vercel já serve como link público,
      // não precisa comprar domínio próprio pra isso funcionar).
      lines.push(`  Foto: ${window.location.origin}${item.image}`);
    }
  });
  lines.push('', `Total: ${formatPrice(cartTotal())}`);
  lines.push(`Forma de pagamento: ${PAYMENT_LABELS[paymentMethod] || paymentMethod}`);
  return lines.join('\n');
}

export function goToWhatsapp() {
  if (cart.length === 0) {
    openCart();
    return;
  }
  const STORE = getStore();
  const message = encodeURIComponent(buildWhatsappMessage());
  const url = `https://wa.me/${STORE.whatsappNumber}?text=${message}`;
  window.open(url, '_blank', 'noopener');
}
