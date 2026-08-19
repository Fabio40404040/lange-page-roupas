// *monta a mensagem e abre o WhatsApp

// ============================================================
// WHATSAPP — monta a mensagem com os itens do carrinho e abre
// o WhatsApp já com o texto preenchido (o cliente só envia).
// ============================================================

import { STORE } from '../data/config.js';
import { cart, cartTotal, formatPrice, paymentMethod } from './cart.js';
import { openCart } from './cart-ui.js';

const PAYMENT_LABELS = {
  retirada: 'Retirada na loja (pago no local, depois de experimentar)',
  pix: 'Pix agora (já vou mandar o comprovante aqui)',
  cartao: 'Cartão via link (pode me mandar o link de pagamento?)',
};

function buildWhatsappMessage() {
  const lines = [STORE.whatsappGreeting, ''];
  cart.forEach((item) => {
    lines.push(`• ${item.qty}x ${item.name} (tam. ${item.size}) — ${formatPrice(item.price * item.qty)}`);
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
  const message = encodeURIComponent(buildWhatsappMessage());
  const url = `https://wa.me/${STORE.whatsappNumber}?text=${message}`;
  window.open(url, '_blank', 'noopener');
}
