// ============================================================
// MENU — menu hambúrguer (celular) e categorias no header (computador).
// As categorias vêm de src/data/products.js e usam o mesmo filtro
// dos chips do catálogo.
// ============================================================

import { setCategory, getActiveCategory } from './catalog.js';
import { getCategories, getStore } from './store.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

export function renderMenu() {
  const active = getActiveCategory();
  const CATEGORIES = getCategories();
  const STORE = getStore();

  // lista do menu hambúrguer
  $('menuCategories').innerHTML = CATEGORIES.map(
    (cat) => `
      <li>
        <button type="button" data-cat="${escapeHtml(cat)}" aria-current="${cat === active}">
          <span>${escapeHtml(cat)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </li>`
  ).join('');

  // menu suspenso "Produtos" no header (computador)
  $('topbarNav').innerHTML = CATEGORIES.map(
    (cat) => `<button type="button" role="menuitem" data-cat="${escapeHtml(cat)}" aria-current="${cat === active}">${escapeHtml(cat)}</button>`
  ).join('');

  const insta = `https://instagram.com/${STORE.instagram}`;
  $('menuInstaLink').href = insta;
  $('menuInstaLink').textContent = `@${STORE.instagram} no Instagram`;
  const greeting = encodeURIComponent('Olá! Vim pelo site e queria saber mais sobre as peças 🙂');
  $('menuWhatsLink').href = `https://wa.me/${STORE.whatsappNumber}?text=${greeting}`;
}

export function openMenu() {
  $('menuDrawer').classList.add('open');
  $('menuOverlay').classList.add('open');
  $('menuDrawer').setAttribute('aria-hidden', 'false');
  $('menuOpenBtn').setAttribute('aria-expanded', 'true');
  document.body.classList.add('noScroll');
  $('menuCloseBtn').focus();
}

export function closeMenu() {
  $('menuDrawer').classList.remove('open');
  $('menuOverlay').classList.remove('open');
  $('menuDrawer').setAttribute('aria-hidden', 'true');
  $('menuOpenBtn').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('noScroll');
}

// depois de escolher uma categoria, o menu só reabre pelo mouse
// quando o cursor sair e voltar (evita reabrir sozinho)
let dropLocked = false;

function setDrop(open) {
  $('navDrop').classList.toggle('open', open);
  $('navDropBtn').setAttribute('aria-expanded', String(open));
}

function pickCategory(cat) {
  setCategory(cat);
  closeMenu();
  setDrop(false);
  dropLocked = true;
  $('chips').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function bindMenu() {
  $('menuOpenBtn').addEventListener('click', openMenu);
  $('menuCloseBtn').addEventListener('click', closeMenu);
  $('menuOverlay').addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('menuDrawer').classList.contains('open')) closeMenu();
    if ($('navDrop').classList.contains('open')) { setDrop(false); $('navDropBtn').focus(); }
  });

  // menu suspenso "Produtos": abre no clique e ao passar o mouse
  const drop = $('navDrop');
  const hasMouse = window.matchMedia('(hover: hover)').matches;
  $('navDropBtn').addEventListener('click', () => {
    // com mouse o menu já abriu ao passar por cima, então o clique só garante que fique aberto;
    // em telas de toque (tablet) o clique abre e fecha
    dropLocked = false;
    setDrop(hasMouse ? true : !drop.classList.contains('open'));
  });
  drop.addEventListener('mouseenter', () => { if (!dropLocked) setDrop(true); });
  drop.addEventListener('mouseleave', () => setDrop(false));
  document.addEventListener('mousemove', (e) => {
    if (dropLocked && !drop.contains(e.target)) dropLocked = false;
  });
  document.addEventListener('click', (e) => {
    if (!drop.contains(e.target)) setDrop(false);
  });

  // clique numa categoria (menu ou header)
  [$('menuCategories'), $('topbarNav')].forEach((wrap) =>
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (btn) pickCategory(btn.dataset.cat);
    })
  );

  // links de seção fecham o menu
  document.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', closeMenu));

  // mantém o destaque sincronizado quando o filtro muda pelos chips
  document.addEventListener('categorychange', renderMenu);
}
