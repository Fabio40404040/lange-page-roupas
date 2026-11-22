import QRCode from 'qrcode';
import { setPaymentMethod } from './cart.js';
import { openCart, renderPaymentMethod } from './cart-ui.js';
import { buildPixPayload } from './pix.js';
import { getStore } from './store.js';

function bindTabs() {
  const tabs = document.querySelectorAll('#payTabs .payTabs__btn');
  const panels = { pix: document.getElementById('payPanelPix'), cartao: document.getElementById('payPanelCard') };
  tabs.forEach((button) => button.addEventListener('click', () => {
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab === button)));
    Object.entries(panels).forEach(([key, panel]) => { panel.hidden = key !== button.dataset.tab; });
  }));
}

function useInCheckout(method) {
  setPaymentMethod(method);
  renderPaymentMethod();
  openCart();
}

export async function renderPixPanel() {
  const store = getStore();
  const unavailable = document.getElementById('pixUnavailable');
  const body = document.getElementById('pixBody');
  const button = document.getElementById('pixCheckoutButton');
  if (!store.pixKey) {
    unavailable.hidden = false;
    body.hidden = true;
    return;
  }
  const payload = buildPixPayload({ pixKey: store.pixKey, merchantName: store.name, merchantCity: store.pixCity, description: store.name });
  try {
    document.getElementById('pixQrImg').src = await QRCode.toDataURL(payload, { width: 240, margin: 1, color: { dark: '#15141b', light: '#f5f1e8' } });
  } catch {
    unavailable.textContent = 'Não foi possível carregar o QR Code. Você pode escolher Pix no carrinho para gerar o código do pedido.';
    unavailable.hidden = false;
    body.hidden = true;
    return;
  }
  unavailable.hidden = true;
  body.hidden = false;
  button.disabled = false;
}

export async function renderPaymentFooter() {
  bindTabs();
  document.getElementById('pixCheckoutButton').addEventListener('click', () => useInCheckout('pix'));
  document.getElementById('cardCheckoutButton').addEventListener('click', () => useInCheckout('cartao'));
  await renderPixPanel();
}
