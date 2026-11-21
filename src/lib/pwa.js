let deferredInstallPrompt = null;
let installButton = null;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton && !isStandalone()) installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

export function setupPwa(buttonId = '') {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((error) => console.error('Falha ao ativar o modo aplicativo:', error)));
  if (!buttonId) return;
  installButton = document.getElementById(buttonId);
  if (!installButton || isStandalone()) return;
  if (isIos()) installButton.hidden = false;
  installButton.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
      return;
    }
    if (isIos()) window.alert('No Safari, toque no botão Compartilhar e escolha “Adicionar à Tela de Início”.');
  });
}
