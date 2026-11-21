import { cart, clearCart, paymentMethod } from './cart.js';
import { closeCart, renderCart } from './cart-ui.js';
import { getStore } from './store.js';

const API_BASE = '';

function paymentMessage(method) {
  const store = getStore();
  if (method === 'pix') return `Seu pedido está reservado. Faça o Pix usando a chave ${store.pixKey || 'informada no rodapé'} para confirmarmos o pagamento.`;
  if (method === 'cartao') return 'Seu pedido foi recebido. Você receberá por e-mail as instruções seguras para o pagamento com cartão.';
  return 'Seu pedido foi reservado. O pagamento será feito no momento da retirada.';
}

function showConfirmation(order) {
  const dialog = document.getElementById('orderDialog');
  document.getElementById('confirmedOrderId').textContent = `#${order.id.split('-')[0].toUpperCase()}`;
  document.getElementById('confirmedOrderMessage').textContent = paymentMessage(order.payment_method);
  dialog.showModal();
}

export async function checkoutOrder() {
  if (cart.length === 0) {
    document.getElementById('cartDrawer').classList.add('open');
    return;
  }
  const fields = ['checkoutName', 'checkoutEmail', 'checkoutPhone'].map((id) => document.getElementById(id));
  const invalid = fields.find((field) => !field.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return;
  }
  const button = document.getElementById('checkoutBtn');
  button.disabled = true;
  button.textContent = 'Confirmando pedido…';
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
    clearCart();
    renderCart();
    closeCart();
    fields.forEach((field) => { field.value = ''; });
    showConfirmation(data.order);
  } catch (error) {
    window.alert(`${error.message} Tente novamente.`);
  } finally {
    button.disabled = false;
    button.textContent = 'Confirmar pedido';
  }
}
