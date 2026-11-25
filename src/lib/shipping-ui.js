import { cart, formatPrice } from './cart.js';
import { getProducts, getStore } from './store.js';

let signature = '', generation = 0;
const $ = (id) => document.getElementById(id);

export function renderShippingSimulator() {
  const panel = $('shippingTestPanel'); if (!panel) return;
  const store = getStore();
  panel.hidden = store.shippingSandboxEnabled !== true;
  const snapshot = JSON.stringify({ cart: cart.map(({ id, qty, price }) => ({ id, qty, price })), products: getProducts().map(({ id, price, stock, shippingWeight, shippingHeight, shippingWidth, shippingLength }) => ({ id, price, stock, shippingWeight, shippingHeight, shippingWidth, shippingLength })), origin: store.shippingOriginPostalCode, weight: store.shippingDefaultWeight, height: store.shippingDefaultHeight, width: store.shippingDefaultWidth, length: store.shippingDefaultLength, enabled: store.shippingSandboxEnabled });
  if (snapshot !== signature) {
    signature = snapshot; generation++;
    $('shippingTestOptions').replaceChildren(); $('shippingTestTotal').textContent = '';
    $('shippingTestFeedback').textContent = cart.length ? 'Informe o CEP para consultar as opções de teste.' : 'Adicione produtos antes de simular o frete.';
  }
}

export function bindShippingSimulator() {
  $('shippingTestPostalCode').addEventListener('input', () => { generation++; $('shippingTestOptions').replaceChildren(); $('shippingTestTotal').textContent = ''; $('shippingTestFeedback').textContent = 'Clique em Calcular frete para consultar este CEP.'; });
  $('shippingTestPostalCode').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); $('calculateShippingTest').click(); } });
  $('calculateShippingTest').addEventListener('click', async () => {
    const field = $('shippingTestPostalCode');
    const postalCode = field.value.replace(/\D/g, '');
    if (!/^\d{8}$/.test(postalCode) || /^(\d)\1{7}$/.test(postalCode)) { field.setCustomValidity('Digite um CEP válido com 8 números.'); field.reportValidity(); field.setCustomValidity(''); return; }
    if (!cart.length) { $('shippingTestFeedback').textContent = 'Adicione produtos ao carrinho para calcular.'; return; }
    const current = ++generation, button = $('calculateShippingTest'); button.disabled = true;
    $('shippingTestOptions').replaceChildren(); $('shippingTestTotal').textContent = ''; $('shippingTestFeedback').textContent = 'Consultando o Melhor Envio Sandbox…';
    try {
      const response = await fetch('/api/shipping/quote', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postalCode, items: cart.map((item) => ({ id: item.id, quantity: item.qty })) }) });
      const data = await response.json().catch(() => ({}));
      if (current !== generation) return;
      if (!response.ok) throw new Error(data.error || 'Não foi possível calcular. Tente novamente.');
      $('shippingTestFeedback').textContent = data.options.length ? `Selecione uma opção para visualizar o total de teste.${data.usesDefaultPackaging ? ' Alguns produtos usam a embalagem padrão de exemplo cadastrada pela loja.' : ''}` : data.message;
      for (const option of data.options) {
        const label = document.createElement('label'); label.className = 'shippingTestOption';
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'shippingTestOption'; radio.value = option.id;
        const text = document.createElement('span'); text.textContent = `${option.company} — ${option.service}: ${formatPrice(option.priceCents / 100)} · estimativa de ${option.deliveryDays} dia(s) útil(eis)`;
        radio.addEventListener('change', () => { $('shippingTestTotal').textContent = `Subtotal publicado: ${formatPrice(data.subtotalCents / 100)} + frete de teste: ${formatPrice(option.priceCents / 100)} = ${formatPrice(option.estimatedTotalCents / 100)}. Este valor é somente uma simulação e não é cobrado no pedido.`; });
        label.append(radio, text); $('shippingTestOptions').appendChild(label);
      }
    } catch (error) { if (current === generation) $('shippingTestFeedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
  renderShippingSimulator();
}
