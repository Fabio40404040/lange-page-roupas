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

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const PAYMENT_LABELS = {
  retirada: 'Retirada na loja (pago no local, depois de experimentar)',
  pix: 'Pix agora (já vou mandar o comprovante aqui)',
  cartao: 'Cartão via link (pode me mandar o link de pagamento?)',
};

function buildWhatsappMessage(orderId = '') {
  const STORE = getStore();
  const lines = [STORE.whatsappGreeting, ''];
  if (orderId) lines.push(`Pedido: ${orderId}`, '');
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

export async function goToWhatsapp() {
  if (cart.length === 0) {
    openCart();
    return;
  }
  const fields = ['checkoutName', 'checkoutEmail', 'checkoutPhone'].map((id) => document.getElementById(id));
  const invalid = fields.find((field) => !field.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return;
  }
  const button = document.getElementById('checkoutBtn');
  const whatsWindow = window.open('about:blank', '_blank');
  button.disabled = true;
  button.textContent = 'Registrando pedido…';
  let orderId = '';
  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: fields[0].value.trim(), email: fields[1].value.trim(), phone: fields[2].value.trim() },
        address: {},
        paymentMethod,
        items: cart.map((item) => ({ id: item.id, quantity: item.qty, size: item.size, color: item.color })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível registrar o pedido.');
    orderId = data.order.id;
  } catch (error) {
    whatsWindow?.close();
    window.alert(`${error.message} Tente novamente.`);
    return;
  } finally {
    button.disabled = false;
    button.textContent = 'Confirmar pedido no WhatsApp';
  }
  const STORE = getStore();
  const message = encodeURIComponent(buildWhatsappMessage(orderId));
  const url = `https://wa.me/${STORE.whatsappNumber}?text=${message}`;
  if (whatsWindow) whatsWindow.location.href = url;
  else window.location.href = url;
}
