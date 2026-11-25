import { getStore, saveStore, syncStore } from './store.js';
import { reviewRequest } from './reviews.js';
const $ = (id) => document.getElementById(id);
let demo = false, connecting = false, statusVersion = 0;
const connectLabel = 'Conectar Melhor Envio Sandbox';
function connectionMessage(message, error = false) {
  const status = $('shippingConnectionStatus');
  status.textContent = message;
  status.classList.toggle('shippingConnectionError', error);
  if (error) { status.focus(); status.scrollIntoView({ block: 'nearest' }); }
}
async function shippingRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try { return await reviewRequest(path, { ...options, signal: controller.signal }); }
  catch (error) { if (controller.signal.aborted) throw new Error('A verificação demorou mais que o esperado. Confira sua conexão e tente novamente.'); throw error; }
  finally { clearTimeout(timeout); }
}

export async function loadAdminShipping() {
  const version = ++statusVersion;
  const form = $('shippingSettingsForm'), store = getStore();
  // Não sobrescreva uma edição em andamento com a atualização de conexão.
  if (!form.dataset.dirty) {
    for (const name of ['shippingOriginPostalCode', 'shippingDefaultWeight', 'shippingDefaultWidth', 'shippingDefaultHeight', 'shippingDefaultLength']) form.elements[name].value = store[name] ?? '';
    form.elements.shippingSandboxEnabled.checked = store.shippingSandboxEnabled === true;
  }
  $('connectShippingButton').disabled = true; $('disconnectShippingButton').hidden = true;
  connectionMessage('Verificando a conexão com o Melhor Envio…');
  if (demo) {
    connectionMessage('Você está no acesso demonstrativo. A conexão externa exige o acesso completo do proprietário. Saia do painel e entre com suas credenciais de proprietário para conectar.');
    $('connectShippingButton').disabled = connecting;
    return { demo: true, configured: false };
  }
  try {
    const data = await shippingRequest('admin/shipping/status');
    if (version !== statusVersion) return;
    $('shippingCallback').textContent = data.callback;
    $('disconnectShippingButton').hidden = !data.connected;
    const result = new URLSearchParams(location.search).get('shipping');
    connectionMessage(!data.configured ? `Falta configurar no Cloudflare: ${data.missing.join(', ')}. Depois de salvar as credenciais, publique um novo deploy e tente conectar.` : data.connected ? 'Melhor Envio Sandbox conectado. As cotações são de teste; a autorização é renovada automaticamente enquanto válida.' : result && result !== 'connected' ? 'A autorização não foi concluída. Confira se o aplicativo é do Sandbox e se a URL de retorno cadastrada é exatamente a exibida acima. Depois, clique em Conectar para tentar novamente.' : 'Credenciais configuradas. Clique em Conectar: você será direcionado ao Melhor Envio para entrar na conta Sandbox e autorizar as consultas.');
    return data;
  } catch (error) { if (version === statusVersion) connectionMessage(error.message); }
  finally { if (version === statusVersion) $('connectShippingButton').disabled = connecting; }
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
    if (connecting) return;
    const button = event.currentTarget;
    connecting = true; button.disabled = true; button.textContent = 'Verificando conexão…';
    try {
      const status = await loadAdminShipping();
      if (!status || status.demo || !status.configured) { connectionMessage($('shippingConnectionStatus').textContent, true); return; }
      button.textContent = 'Abrindo autorização…';
      connectionMessage('Abrindo a autorização no Melhor Envio Sandbox. Conclua o acesso para retornar automaticamente ao painel.');
      const data = await shippingRequest('admin/shipping/connect', { method: 'POST', body: '{}' });
      const target = new URL(data.url);
      if (target.origin !== 'https://sandbox.melhorenvio.com.br' || target.pathname !== '/oauth/authorize') throw new Error('O servidor não retornou uma autorização válida do Sandbox. Tente novamente.');
      location.assign(target.href);
    } catch (error) { connectionMessage(error.message, true); }
    finally { connecting = false; button.disabled = false; button.textContent = connectLabel; }
  });
  $('disconnectShippingButton').addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try { await reviewRequest('admin/shipping/disconnect', { method: 'POST', body: '{}' }); await loadAdminShipping(); }
    catch (error) { $('shippingConnectionStatus').textContent = error.message; }
    finally { button.disabled = false; }
  });
}
