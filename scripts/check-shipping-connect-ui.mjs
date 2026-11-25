import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../src/lib/admin-shipping.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
async function exercise({ demo = false, configured = true, failStatus = false, failConnect = false, unsafeRedirect = false } = {}) {
  const nodes = new Map(), requests = [], redirects = [];
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', disabled: false, hidden: false, dataset: {}, handlers: {}, classList: { toggle() {} }, addEventListener(name, handler) { this.handlers[name] = handler; }, focus() { this.focused = true; }, scrollIntoView() {} });
    return nodes.get(id);
  }
  const form = node('shippingSettingsForm');
  form.elements = Object.fromEntries(['shippingOriginPostalCode', 'shippingDefaultWeight', 'shippingDefaultWidth', 'shippingDefaultHeight', 'shippingDefaultLength', 'shippingSandboxEnabled'].map((key) => [key, { value: '', checked: false }]));
  const context = { document: { getElementById: node }, location: { search: '', assign: (url) => redirects.push(url) }, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    getStore: () => ({}), saveStore() {}, syncStore() {},
    reviewRequest: async (path) => {
      requests.push(path);
      if (path.endsWith('/status')) {
        if (failStatus) throw new Error('A sessão expirou. Entre novamente.');
        return { configured, missing: configured ? [] : ['MELHOR_ENVIO_CLIENT_ID'], callback: 'https://example.com/api/admin/shipping/callback', connected: false };
      }
      if (failConnect) throw new Error('Não foi possível iniciar a autorização. Tente novamente.');
      return { url: unsafeRedirect ? 'https://melhorenvio.com.br/oauth/authorize' : 'https://sandbox.melhorenvio.com.br/oauth/authorize?client_id=local' };
    },
  };
  vm.createContext(context); vm.runInContext(source, context);
  context.bindAdminShipping(demo);
  await context.loadAdminShipping();
  if (demo) {
    assert.equal(node('connectShippingButton').hidden, true);
    assert.equal(node('shippingPreviewLink').hidden, false);
    assert.equal(node('shippingSandboxLink').hidden, true);
    return { requests, redirects, status: node('shippingConnectionStatus') };
  }
  assert.equal(node('connectShippingButton').disabled, false, 'O botão permite mostrar a causa de um bloqueio');
  const event = { currentTarget: node('connectShippingButton') };
  const pending = node('connectShippingButton').handlers.click(event);
  // O navegador remove currentTarget após a parte síncrona do evento.
  event.currentTarget = null;
  await pending;
  assert.equal(node('connectShippingButton').disabled, false, 'O botão sempre permite nova tentativa');
  return { requests, redirects, status: node('shippingConnectionStatus') };
}
let result = await exercise({ demo: true });
assert.deepEqual(result.requests, ['shipping/status']); assert.equal(result.redirects.length, 0);
assert.match(result.status.textContent, /proprietário precisa autorizar/);
result = await exercise({ configured: false });
assert.ok(result.requests.every((path) => path.endsWith('/status')));
assert.match(result.status.textContent, /MELHOR_ENVIO_CLIENT_ID/);
result = await exercise({ failStatus: true });
assert.match(result.status.textContent, /sessão expirou/);
result = await exercise({ failConnect: true });
assert.match(result.status.textContent, /iniciar a autorização/); assert.equal(result.redirects.length, 0);
result = await exercise();
assert.equal(result.redirects.length, 1); assert.match(result.redirects[0], /^https:\/\/sandbox\.melhorenvio\.com\.br\/oauth\/authorize/);
result = await exercise({ unsafeRedirect: true });
assert.equal(result.redirects.length, 0); assert.match(result.status.textContent, /autorização válida/);
console.log('OK: clique informa bloqueio demo/credenciais, erro e sessão expirada; currentTarget nulo não trava; botão recuperável e redirecionamento somente ao Sandbox.');
