import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/600.css';
import '@fontsource-variable/fraunces';
import './account.css';
import './privacy.css';

try {
  const response = await fetch('/api/catalog', { cache: 'no-store' });
  if (!response.ok) throw new Error('Canal indisponível');
  const { store = {} } = await response.json();
  document.getElementById('privacyStoreName').textContent = store.name || 'Loja';
  document.title = `Política de Privacidade — ${store.name || 'Loja'}`;
  if (store.legalName?.trim()) document.getElementById('privacyController').textContent = store.legalName.trim();
  if (store.address && !/exemplo/i.test(store.address)) document.getElementById('privacyAddress').textContent = store.address;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.privacyEmail || '')) {
    document.getElementById('privacyContact').textContent = `Canal de privacidade: ${store.privacyEmail}`;
    const link = document.getElementById('privacyEmailLink');
    link.href = `mailto:${store.privacyEmail}?subject=${encodeURIComponent('Solicitação sobre meus dados pessoais — LGPD')}`;
    link.hidden = false;
  }
} catch { document.getElementById('privacyContact').textContent = 'Não foi possível carregar o canal de privacidade agora. Tente novamente ou contate a loja pelos canais de atendimento.'; }
