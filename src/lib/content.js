// ============================================================
// CONTENT — preenche no HTML os dados que vêm de src/data/config.js,
// e desenha os blocos de depoimentos e da grade do Instagram
// (conteúdo de exemplo — edite os textos à vontade).
// ============================================================

// import { STORE } from '../data/config.js';

// export function renderStoreInfo() {
//   document.title = `${STORE.name} — roupa do seu bairro`;
//   document.getElementById('storeName').textContent = STORE.name;
//   document.getElementById('heroTagline').innerHTML = STORE.tagline.replace(', ', ',<br>');
//   document.getElementById('footerStoreName').textContent = STORE.name;
//   document.getElementById('aboutAddress').textContent = STORE.address;
//   document.getElementById('aboutHours').textContent = STORE.hours;
//   document.getElementById('aboutMapsLink').href = STORE.mapsUrl;

//   const insta = `https://instagram.com/${STORE.instagram}`;
//   document.getElementById('heroInstaLink').textContent = `@${STORE.instagram} no Instagram`;
//   document.getElementById('heroInstaLink').href = insta;
//   document.getElementById('instaGridLink').href = insta;

//   const whatsGreeting = encodeURIComponent('Olá! Vim pelo Instagram e queria saber mais sobre as peças 🙂');
//   document.getElementById('whatsFab').href = `https://wa.me/${STORE.whatsappNumber}?text=${whatsGreeting}`;
// }

// export function renderTestimonials() {
//   const items = [
//     { text: 'Comprei uma calça e chegou certinho no tamanho, super rápido.', author: 'Marina S.' },
//     { text: 'Atendimento no WhatsApp foi super atencioso, tirou todas as dúvidas.', author: 'Pedro A.' },
//     { text: 'Já é a terceira vez que compro, qualidade sempre boa.', author: 'Camila R.' },
//   ];
//   const wrap = document.getElementById('testimonials');
//   wrap.innerHTML = items
//     .map((t) => `<div class="testimonial"><p>"${t.text}"</p><span>${t.author}</span></div>`)
//     .join('');
// }

// export function renderInstaGrid() {
//   const wrap = document.getElementById('instaGrid');
//   wrap.innerHTML = Array.from({ length: 6 }).map(() => '<div></div>').join('');
// }


// ============================================================
// CONTENT — preenche no HTML os dados que vêm de src/data/config.js,
// e desenha os blocos de depoimentos e da grade do Instagram
// (conteúdo de exemplo — edite os textos à vontade).
// ============================================================

import { STORE } from '../data/config.js';

export function renderStoreInfo() {
  document.title = `${STORE.name} — roupa do seu bairro`;
  document.getElementById('storeName').textContent = STORE.name;
  if (STORE.heroImage) document.getElementById('heroImage').src = STORE.heroImage;
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  document.getElementById('heroTagline').innerHTML = STORE.tagline.replace(', ', ',<br>');
  document.getElementById('footerStoreName').textContent = STORE.name;
  document.getElementById('aboutAddress').textContent = STORE.address;
  document.getElementById('aboutHours').textContent = STORE.hours;
  document.getElementById('aboutMapsLink').href = STORE.mapsUrl;

  const insta = `https://instagram.com/${STORE.instagram}`;
  document.getElementById('heroInstaLink').textContent = `@${STORE.instagram} no Instagram`;
  document.getElementById('heroInstaLink').href = insta;
  document.getElementById('instaGridLink').href = insta;

  const whatsGreeting = encodeURIComponent('Olá! Vim pelo Instagram e queria saber mais sobre as peças 🙂');
  document.getElementById('whatsFab').href = `https://wa.me/${STORE.whatsappNumber}?text=${whatsGreeting}`;
}

export function renderTestimonials() {
  const items = [
    { text: 'Comprei uma calça e chegou certinho no tamanho, super rápido.', author: 'Marina S.' },
    { text: 'Atendimento no WhatsApp foi super atencioso, tirou todas as dúvidas.', author: 'Pedro A.' },
    { text: 'Já é a terceira vez que compro, qualidade sempre boa.', author: 'Camila R.' },
  ];
  const wrap = document.getElementById('testimonials');
  wrap.innerHTML = items
    .map((t) => `<div class="testimonial"><p>"${t.text}"</p><span>${t.author}</span></div>`)
    .join('');
}

export function renderInstaGrid() {
  const wrap = document.getElementById('instaGrid');
  wrap.innerHTML = Array.from({ length: 6 }).map(() => '<div></div>').join('');
}
