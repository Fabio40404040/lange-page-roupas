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

import { getStore } from './store.js';

export function renderStoreInfo() {
  const STORE = getStore();
  document.title = `${STORE.name} — roupa do seu bairro`;
  document.getElementById('storeName').textContent = STORE.name;
  if (STORE.heroImage) document.getElementById('heroImage').src = STORE.heroImage;
  document.getElementById('heroImage').style.objectPosition = `${STORE.heroPositionX ?? 50}% ${STORE.heroPositionY ?? 50}%`;
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  document.getElementById('heroTagline').textContent = STORE.tagline;
  document.getElementById('heroEyebrow').textContent = STORE.heroEyebrow;
  document.getElementById('heroLead').textContent = STORE.heroLead;
  document.getElementById('footerStoreName').textContent = STORE.name;
  document.getElementById('aboutAddress').textContent = STORE.address;
  document.getElementById('aboutHours').textContent = STORE.hours;
  document.getElementById('aboutMapsLink').href = STORE.mapsUrl;

  const insta = `https://instagram.com/${STORE.instagram}`;
  document.getElementById('heroInstaLink').textContent = `@${STORE.instagram} no Instagram`;
  document.getElementById('heroInstaLink').href = insta;
  document.getElementById('instaGridLink').href = insta;

  const socialLinks = [
    STORE.instagram && { label: 'Instagram', url: insta },
    STORE.facebook && { label: 'Facebook', url: STORE.facebook },
    STORE.tiktok && { label: 'TikTok', url: STORE.tiktok },
    STORE.email && { label: STORE.email, url: `mailto:${STORE.email}` },
  ].filter(Boolean);
  const socialWrap = document.getElementById('socialLinks');
  socialWrap.innerHTML = '';
  socialLinks.forEach((item) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = item.label;
    socialWrap.appendChild(link);
  });

  const whatsGreeting = encodeURIComponent('Olá! Vim pelo Instagram e queria saber mais sobre as peças 🙂');
  document.getElementById('whatsFab').href = `https://wa.me/${STORE.whatsappNumber}?text=${whatsGreeting}`;
}

import { demoReviews } from './demo-reviews.js';
let testimonialsVersion = 0;
export async function renderTestimonials() {
  const version = ++testimonialsVersion;
  const wrap = document.getElementById('testimonials');
  try {
    const response = await fetch('/api/reviews', { cache: 'no-store' });
    if (!response.ok) throw new Error('Avaliações indisponíveis');
    const { reviews } = await response.json();
    if (document.body.classList.contains('demo-preview')) {
      const session = await fetch('/api/customer/session', { cache: 'no-store', credentials: 'include' }).then((result) => result.ok ? result.json() : null).catch(() => null);
      if (session) reviews.unshift(...demoReviews(session.customer.email).filter((review) => review.status === 'approved'));
    }
    if (version !== testimonialsVersion) return;
    wrap.replaceChildren();
    if (!reviews.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Ainda não há avaliações publicadas. Após comprar e ter o pagamento confirmado, avalie seu produto na Área da Cliente.';
      wrap.appendChild(empty);
    }
    reviews.forEach((review) => {
      const card = document.createElement('article'); card.className = 'testimonial';
      const rating = document.createElement('strong'); rating.textContent = `${'★'.repeat(review.rating)} · ${review.demo ? 'Avaliação de teste local' : 'Compra verificada'}`; rating.setAttribute('aria-label', rating.textContent);
      const comment = document.createElement('p'); comment.textContent = review.comment;
      const author = document.createElement('span'); author.textContent = `${review.author} · ${review.product_name}`;
      card.append(rating, comment, author); wrap.appendChild(card);
    });
  } catch {
    if (version !== testimonialsVersion) return;
    wrap.textContent = 'As avaliações das clientes estarão disponíveis aqui em breve.';
  }
}

export function renderInstaGrid() {
  const wrap = document.getElementById('instaGrid');
  wrap.innerHTML = Array.from({ length: 6 }).map(() => '<div></div>').join('');
}
