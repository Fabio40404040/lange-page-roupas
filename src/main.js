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
import { goToWhatsapp } from './lib/whatsapp.js';
import { renderStoreInfo, renderTestimonials, renderInstaGrid } from './lib/content.js';
import { renderPaymentFooter } from './lib/pix-ui.js';

function bindEvents() {
  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('cartFab').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('checkoutBtn').addEventListener('click', goToWhatsapp);
  bindPaymentMethod();
}

function init() {
  renderStoreInfo();
  renderChips();
  renderCatalog();
  renderCart();
  renderTestimonials();
  renderInstaGrid();
  renderPaymentFooter();
  bindEvents();
}

init();


