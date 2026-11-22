import { cart, clearCart, paymentMethod } from './cart.js';
import { closeCart, renderCart } from './cart-ui.js';

const API_BASE = '';
let customerAddress = {};

export async function hydrateCheckoutCustomer() {
  try {
    const response = await fetch(`${API_BASE}/api/customer/profile`);
    if (!response.ok) return;
    const { profile } = await response.json();
    document.getElementById('checkoutName').value = profile.name || '';
    document.getElementById('checkoutEmail').value = profile.email || '';
    document.getElementById('checkoutPhone').value = profile.phone || '';
    customerAddress = { postal_code: profile.postal_code, street: profile.street, number: profile.address_number, complement: profile.complement, neighborhood: profile.neighborhood, city: profile.city, state: profile.state };
  } catch { /* visitante sem sessão continua preenchendo manualmente */ }
}

function paymentMessage(method) {
  if (method === 'pix') return 'Pedido registrado com preferência de pagamento via Pix.';
  if (method === 'cartao') return 'Pedido registrado com preferência de pagamento por cartão.';
  return 'Pedido registrado com preferência de pagamento na retirada.';
}

const paymentLabels = { retirada: 'Na retirada', pix: 'Pix', cartao: 'Cartão' };

function formatPrice(cents) {
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showConfirmation(order) {
  const dialog = document.getElementById('orderDialog');
  document.getElementById('confirmedOrderId').textContent = `#${order.id.split('-')[0].toUpperCase()}`;
  document.getElementById('confirmedOrderMessage').textContent = paymentMessage(order.payment_method);
  document.getElementById('confirmedPaymentMethod').textContent = paymentLabels[order.payment_method] || 'A combinar';
  document.getElementById('confirmedOrderTotal').textContent = formatPrice(order.total_cents);
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
  button.textContent = 'Finalizando compra…';
  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: fields[0].value.trim(), email: fields[1].value.trim(), phone: fields[2].value.trim() },
        address: customerAddress,
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
    button.textContent = 'Finalizar compra';
  }
}
