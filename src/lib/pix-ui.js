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

async function renderPixPanel() {
  const store = getStore();
  const unavailable = document.getElementById('pixUnavailable');
  const body = document.getElementById('pixBody');
  if (!store.pixKey) {
    unavailable.hidden = false;
    body.hidden = true;
    document.querySelector('#payTabs [data-tab="cartao"]').click();
    document.querySelector('#payTabs [data-tab="pix"]').disabled = true;
    return;
  }
  const payload = buildPixPayload({ pixKey: store.pixKey, merchantName: store.name, merchantCity: store.pixCity, description: store.name });
  try {
    document.getElementById('pixQrImg').src = await QRCode.toDataURL(payload, {
      width: 240, margin: 1, color: { dark: '#15141b', light: '#f5f1e8' },
    });
  } catch (error) {
    console.error('Não foi possível gerar o QR do Pix:', error);
    unavailable.hidden = false;
    unavailable.textContent = 'Não foi possível gerar o QR agora. Tente recarregar a página.';
    body.hidden = true;
    return;
  }
  document.getElementById('pixKeyText').textContent = store.pixKey;
  body.hidden = false;
  const copyButton = document.getElementById('pixCopyBtn');
  copyButton.addEventListener('click', async () => {
    const original = copyButton.textContent;
    try { await navigator.clipboard.writeText(payload); copyButton.textContent = 'Código copiado ✓'; }
    catch { copyButton.textContent = 'Não foi possível copiar'; }
    setTimeout(() => { copyButton.textContent = original; }, 2200);
  });
}

export async function renderPaymentFooter() {
  bindTabs();
  document.getElementById('pixCheckoutButton').addEventListener('click', () => useInCheckout('pix'));
  document.getElementById('cardCheckoutButton').addEventListener('click', () => useInCheckout('cartao'));
  await renderPixPanel();
}
