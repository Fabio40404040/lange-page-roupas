// ============================================================
// MAIN — ponto de entrada da página.
// Não tem lógica própria: só importa os módulos de src/lib/,
// manda cada um desenhar sua parte e liga os eventos de clique.
// Para mudar comportamento, edite o módulo correspondente em lib/;
// para mudar dados (loja, produtos), edite os arquivos em data/.
// ============================================================

// Fontes self-hosted (Fontsource) — não dependem do Google Fonts em runtime
// import '@fontsource-variable/fraunces';
// import '@fontsource/work-sans/400.css';
// import '@fontsource/work-sans/500.css';
// import '@fontsource/work-sans/600.css';
// import '@fontsource/space-mono/400.css';
// import '@fontsource/space-mono/700.css';

// import './style.css';

// import { renderChips, renderCatalog } from './lib/catalog.js';
// import { renderCart, openCart, closeCart, bindPaymentMethod } from './lib/cart-ui.js';
// import { goToWhatsapp } from './lib/whatsapp.js';
// import { renderStoreInfo, renderTestimonials, renderInstaGrid } from './lib/content.js';
// import { renderPaymentFooter } from './lib/pix-ui.js';

// function bindEvents() {
//   document.getElementById('cartOpenBtn').addEventListener('click', openCart);
//   document.getElementById('cartFab').addEventListener('click', openCart);
//   document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
//   document.getElementById('cartOverlay').addEventListener('click', closeCart);
//   document.getElementById('checkoutBtn').addEventListener('click', goToWhatsapp);
//   bindPaymentMethod();
// }

// function init() {
//   renderStoreInfo();
//   renderChips();
//   renderCatalog();
//   renderCart();
//   renderTestimonials();
//   renderInstaGrid();
//   renderPaymentFooter();
//   bindEvents();
// }

// init();




import '@fontsource-variable/fraunces';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';

import './style.css';

import { renderChips, renderCatalog } from './lib/catalog.js';
import { renderCart, openCart, closeCart, bindPaymentMethod } from './lib/cart-ui.js';
import { checkoutOrder, hydrateCheckoutCustomer } from './lib/checkout.js';
import { renderStoreInfo, renderTestimonials, renderInstaGrid } from './lib/content.js';
import { renderPaymentFooter, renderPixPanel } from './lib/pix-ui.js';
import { renderMenu, bindMenu } from './lib/menu.js';
import { configureStoreMode, hydrateStore, getProducts, getStore } from './lib/store.js';
import { setupPwa } from './lib/pwa.js';
import { resolveStorefrontDemo } from './lib/storefront-mode.js';

setupPwa('installAppButton');
let demoPreviewMode = false;
let storeReady = false;

function applyStorefrontMode(demo) {
  demoPreviewMode = demo;
  configureStoreMode({ localOnly: demo, namespace: demo ? 'demo_v4' : '' });
  document.body.classList.toggle('demo-preview', demo);
  document.querySelectorAll('a[href^="/conta"]').forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    if (demo) url.searchParams.set('preview', 'demo');
    else url.searchParams.delete('preview');
    link.href = url.pathname + url.search + url.hash;
  });
  document.getElementById('storefrontDemoNotice')?.remove();
  if (demo) {
    const notice = document.createElement('div');
    notice.id = 'storefrontDemoNotice';
    notice.className = 'demoPreviewBar';
    notice.innerHTML = '<strong>Prévia local do admin</strong><span>Preços, etiquetas, fotos e estoque refletem suas edições neste navegador. A loja pública não foi alterada. Pedidos reais usam o catálogo publicado.</span><a href="/admin">Voltar ao painel</a>';
    document.body.prepend(notice);
  }
}

function bindEvents() {
  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('cartFab').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('checkoutBtn').addEventListener('click', checkoutOrder);
  document.getElementById('closeOrderDialog').addEventListener('click', () => document.getElementById('orderDialog').close());
  bindPaymentMethod();
  bindMenu();
}

async function init() {
  applyStorefrontMode(await resolveStorefrontDemo());
  await hydrateStore({ preferLocal: demoPreviewMode });
  await hydrateCheckoutCustomer();
  renderStoreInfo();
  renderMenu();
  renderChips();
  renderCatalog();
  renderCart();
  renderTestimonials();
  renderInstaGrid();
  bindEvents();
  storeReady = true;
  renderPaymentFooter().catch((error) => console.error('Falha ao exibir Pix:', error));
  if (new URLSearchParams(window.location.search).get('cart') === 'open') openCart();
}

init();

let refreshingCatalog = false;
async function refreshPublishedCatalog() {
  if (!storeReady || refreshingCatalog) return;
  refreshingCatalog = true;
  try {
    const productsBefore = JSON.stringify(getProducts());
    const storeBefore = JSON.stringify(getStore());
    const demo = await resolveStorefrontDemo();
    const changedMode = demo !== demoPreviewMode;
    if (changedMode) applyStorefrontMode(demo);
    if (!await hydrateStore({ preferLocal: demo })) return;
    if (changedMode || productsBefore !== JSON.stringify(getProducts())) {
      renderMenu(); renderChips(); renderCatalog(); renderCart();
    }
    if (changedMode || storeBefore !== JSON.stringify(getStore())) {
      renderStoreInfo(); renderTestimonials(); renderInstaGrid(); renderCart();
      await renderPixPanel();
    }
  } finally { refreshingCatalog = false; }
}
window.addEventListener('focus', () => { refreshPublishedCatalog().catch(console.error); });
setInterval(() => {
  if (document.visibilityState === 'visible') refreshPublishedCatalog().catch(console.error);
}, 30000);
setInterval(() => { if (document.visibilityState === 'visible') renderTestimonials(); }, 30000);

window.addEventListener('storage', (event) => {
  if (event.key === 'frswear_reviews_updated') renderTestimonials();
  if (event.key === 'frswear_catalog_published') refreshPublishedCatalog().catch(console.error);
  const suffix = demoPreviewMode ? '_demo_v4' : '';
  if (event.key === `frswear_products_v2${suffix}`) {
    renderMenu();
    renderChips();
    renderCatalog();
    renderCart();
  }
  if (event.key === `frswear_store_v2${suffix}`) {
    renderStoreInfo();
    renderTestimonials();
    renderInstaGrid();
    renderCart();
    renderPixPanel().catch(console.error);
  }
});


