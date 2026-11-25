import { getStore, saveStore, syncStore } from './store.js';
import { reviewRequest } from './reviews.js';
const $ = (id) => document.getElementById(id);
let demo = false;

export async function loadAdminShipping() {
  const form = $('shippingSettingsForm'), store = getStore();
  // Não sobrescreva uma edição em andamento com a atualização de conexão.
  if (!form.dataset.dirty) {
    for (const name of ['shippingOriginPostalCode', 'shippingDefaultWeight', 'shippingDefaultWidth', 'shippingDefaultHeight', 'shippingDefaultLength']) form.elements[name].value = store[name] ?? '';
    form.elements.shippingSandboxEnabled.checked = store.shippingSandboxEnabled === true;
  }
  $('connectShippingButton').disabled = true; $('disconnectShippingButton').hidden = true;
  if (demo) { $('shippingConnectionStatus').textContent = 'Demonstração: ajustes de embalagem são locais. A conexão com o Melhor Envio é configurada pelo proprietário com acesso completo.'; return; }
  try {
    const data = await reviewRequest('admin/shipping/status');
    $('shippingCallback').textContent = data.callback;
    $('connectShippingButton').disabled = !data.configured;
    $('disconnectShippingButton').hidden = !data.connected;
    const result = new URLSearchParams(location.search).get('shipping');
    $('shippingConnectionStatus').textContent = !data.configured ? `Configure no Cloudflare: ${data.missing.join(', ')}.` : data.connected ? 'Melhor Envio Sandbox conectado. As cotações são de teste; a autorização é renovada automaticamente enquanto válida.' : result && result !== 'connected' ? 'A autorização não foi concluída. Clique em Conectar para tentar novamente.' : 'Credenciais configuradas. Clique em Conectar Melhor Envio Sandbox para autorizar as consultas.';
  } catch (error) { $('shippingConnectionStatus').textContent = error.message; }
}

export function bindAdminShipping(isDemo) {
  demo = isDemo;
  $('shippingSettingsForm').addEventListener('input', (event) => { event.currentTarget.dataset.dirty = 'true'; });
  $('shippingSettingsForm').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget, button = form.querySelector('[type="submit"]'); button.disabled = true;
    try {
      const settings = { shippingSandboxEnabled: form.elements.shippingSandboxEnabled.checked, shippingOriginPostalCode: form.elements.shippingOriginPostalCode.value.replace(/\D/g, '') };
      if (settings.shippingSandboxEnabled && (!/^\d{8}$/.test(settings.shippingOriginPostalCode) || /^(\d)\1{7}$/.test(settings.shippingOriginPostalCode))) throw new Error('Informe um CEP de origem válido para habilitar os testes.');
      for (const name of ['shippingDefaultWeight', 'shippingDefaultWidth', 'shippingDefaultHeight', 'shippingDefaultLength']) settings[name] = Number(form.elements[name].value);
      saveStore(settings, 'Configuração do frete de teste atualizada'); await syncStore(); delete form.dataset.dirty;
      $('shippingSettingsFeedback').textContent = demo ? 'Salvo somente na demonstração. As consultas usam as configurações publicadas pelo proprietário.' : 'Configurações de teste salvas. Confira o simulador no carrinho.';
    } catch (error) { $('shippingSettingsFeedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('connectShippingButton').addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    try { const data = await reviewRequest('admin/shipping/connect', { method: 'POST', body: '{}' }); location.assign(data.url); }
    catch (error) { $('shippingConnectionStatus').textContent = error.message; event.currentTarget.disabled = false; }
  });
  $('disconnectShippingButton').addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try { await reviewRequest('admin/shipping/disconnect', { method: 'POST', body: '{}' }); await loadAdminShipping(); }
    catch (error) { $('shippingConnectionStatus').textContent = error.message; }
    finally { button.disabled = false; }
  });
}
