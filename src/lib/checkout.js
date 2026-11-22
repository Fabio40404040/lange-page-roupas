import QRCode from 'qrcode';
import { cart, clearCart, paymentMethod } from './cart.js';
import { closeCart, renderCart } from './cart-ui.js';
import { buildPixPayload } from './pix.js';

const API_BASE = '';
let customerAddress = {};

function showCheckoutError(message) {
  document.getElementById('checkoutErrorMessage').textContent = message;
  document.getElementById('checkoutErrorDialog').showModal();
}

export async function hydrateCheckoutCustomer() {
  try {
    const response = await fetch(`${API_BASE}/api/customer/profile`);
    if (!response.ok) return;
    const { profile } = await response.json();
    document.getElementById('checkoutName').value = profile.name || '';
    document.getElementById('checkoutEmail').value = profile.email || '';
    document.getElementById('checkoutEmail').readOnly = true;
    document.getElementById('checkoutPhone').value = profile.phone || '';
    customerAddress = { postal_code: profile.postal_code, street: profile.street, number: profile.address_number, complement: profile.complement, neighborhood: profile.neighborhood, city: profile.city, state: profile.state };
  } catch { /* visitante sem sessão continua preenchendo manualmente */ }
}

function paymentMessage(method) {
  if (method === 'pix') return 'Pedido registrado. Faça o Pix abaixo para confirmar o pagamento.';
  if (method === 'cartao') return 'Pedido registrado com cartão em modo demonstrativo.';
  return 'Pedido reservado. O pagamento será feito normalmente na retirada.';
}

const paymentLabels = { retirada: 'Na retirada', pix: 'Pix', cartao: 'Cartão' };

function formatPrice(cents) {
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function showConfirmation(order) {
  const dialog = document.getElementById('orderDialog');
  const detailsLink = dialog.querySelector('a[href^="/conta"]');
  detailsLink.href = order.payment_method === 'retirada' ? '/conta?view=pickup' : '/conta?view=tracking';
  detailsLink.textContent = order.payment_method === 'retirada' ? 'Acompanhar retirada na loja' : 'Ver pedido e rastreio';
  const qr = document.getElementById('confirmedPixQr');
  const copyPix = document.getElementById('confirmedPixCopy');
  const title = document.getElementById('confirmedPaymentTitle');
  const text = document.getElementById('confirmedPaymentText');
  document.getElementById('confirmedOrderId').textContent = `#${order.id.split('-')[0].toUpperCase()}`;
  document.getElementById('confirmedOrderMessage').textContent = paymentMessage(order.payment_method);
  document.getElementById('confirmedPaymentMethod').textContent = paymentLabels[order.payment_method] || 'A combinar';
  document.getElementById('confirmedOrderTotal').textContent = formatPrice(order.total_cents);
  qr.hidden = true;
  copyPix.hidden = true;
  if (order.payment_method === 'pix') {
    const store = order.pix;
    if (!store?.key) throw new Error('Pedido registrado, mas não foi possível obter os dados do Pix. Consulte a loja antes de pagar.');
    const shortId = order.id.split('-')[0].toUpperCase();
    const payload = buildPixPayload({ pixKey: store.key, merchantName: store.name, merchantCity: store.city, description: `Pedido ${shortId}`, amount: order.total_cents / 100, transactionId: shortId });
    qr.src = await QRCode.toDataURL(payload, { width: 300, margin: 1, color: { dark: '#15141b', light: '#f5f1e8' } });
    qr.hidden = false;
    copyPix.hidden = false;
    copyPix.onclick = async () => {
      await navigator.clipboard.writeText(payload);
      copyPix.textContent = 'Código Pix copiado';
      setTimeout(() => { copyPix.textContent = 'Copiar código Pix'; }, 2200);
    };
    title.textContent = 'Pix real — aguardando pagamento';
    text.textContent = 'Escaneie o QR Code para pagar. O pedido e o rastreio já estão disponíveis na Área da Cliente.';
  } else if (order.payment_method === 'cartao') {
    title.textContent = 'Cartão demonstrativo';
    text.textContent = 'Nenhum dado de cartão foi solicitado e nenhuma cobrança foi realizada.';
  } else {
    title.textContent = 'Pagamento na retirada';
    text.textContent = 'Nenhuma cobrança é feita agora. Pague normalmente quando retirar o pedido.';
  }
  dialog.showModal();
}

export async function checkoutOrder() {
  if (cart.length === 0) {
    document.getElementById('cartDrawer').classList.add('open');
    return;
  }
  if (paymentMethod === 'cartao') {
    document.getElementById('cardPaymentDialog').showModal();
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
  let registeredOrder = null;
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
    registeredOrder = data.order;
    try { localStorage.setItem('frswear_orders_updated', `${Date.now()}:${data.order.id}`); } catch { /* O pedido já está salvo no servidor. */ }
    clearCart();
    renderCart();
    closeCart();
    fields.forEach((field) => { field.value = ''; });
    await showConfirmation(data.order);
  } catch (error) {
    showCheckoutError(registeredOrder
      ? `Seu pedido #${registeredOrder.id.split('-')[0].toUpperCase()} foi registrado, mas não foi possível exibir a confirmação. Consulte a Área da Cliente ou entre em contato com a loja antes de pagar.`
      : error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Finalizar compra';
  }
}
