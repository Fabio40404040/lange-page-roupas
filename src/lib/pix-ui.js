import { setPaymentMethod } from './cart.js';
import { openCart, renderPaymentMethod } from './cart-ui.js';

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

export async function renderPaymentFooter() {
  bindTabs();
  document.getElementById('pixCheckoutButton').addEventListener('click', () => useInCheckout('pix'));
  document.getElementById('cardCheckoutButton').addEventListener('click', () => useInCheckout('cartao'));
}
