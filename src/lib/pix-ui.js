// ============================================================
// PAY-UI — desenha o bloco "pague antecipado" do rodapé: duas
// abas, Pix e Cartão. O QR do Pix é gerado como imagem (data URL)
// no próprio navegador — nenhuma chamada externa. As duas ações
// (enviar comprovante / pedir link) abrem o WhatsApp direto.
// ============================================================

import QRCode from 'qrcode';
import { STORE } from '../data/config.js';
import { buildPixPayload } from './pix.js';

function buildWaLink(message) {
  return `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function bindTabs() {
  const tabs = document.querySelectorAll('#payTabs .payTabs__btn');
  const panels = {
    pix: document.getElementById('payPanelPix'),
    cartao: document.getElementById('payPanelCard'),
  };

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      Object.entries(panels).forEach(([key, panel]) => {
        panel.hidden = key !== btn.dataset.tab;
      });
    });
  });
}

async function renderPixPanel() {
  console.log('renderPixPanel iniciou');
  console.log('STORE:', STORE);
  console.log('PIX KEY:', STORE.pixKey);
  const unavailable = document.getElementById('pixUnavailable');
  const body = document.getElementById('pixBody');

  if (!STORE.pixKey) {
    unavailable.hidden = false;
    body.hidden = true;
    // sem chave configurada, a aba Pix não faz sentido — já abre direto em Cartão
    document.querySelector('#payTabs [data-tab="cartao"]').click();
    document.querySelector('#payTabs [data-tab="pix"]').setAttribute('disabled', 'true');
    return;
  }

  const payload = buildPixPayload({
    pixKey: STORE.pixKey,
    merchantName: STORE.name,
    merchantCity: STORE.pixCity,
    description: STORE.name,
  });

  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { 
        dark: '#15141b', 
        light: '#f5f1e8' 
      },
    });
    document.getElementById('pixQrImg').src = dataUrl;
  } catch (err) {
    console.error('Não foi possível gerar o QR do Pix:', err);
    unavailable.hidden = false;
    unavailable.textContent = 'Não foi possível gerar o QR agora. Tente recarregar a página.';
    body.hidden = true;
    return;
  }

  document.getElementById('pixKeyText').textContent = STORE.pixKey;
  document.getElementById('pixProofLink').href = buildWaLink(
    'Olá! Acabei de pagar via Pix, segue o comprovante:'
  );
  body.hidden = false;

  const copyBtn = document.getElementById('pixCopyBtn');
  copyBtn.addEventListener('click', async () => {
    const original = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(payload);
      copyBtn.textContent = 'Código copiado ✓';
    } catch {
      copyBtn.textContent = 'Não foi possível copiar';
    }
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 2200);
  });
}

function renderCardPanel() {
  document.getElementById('cardLinkRequest').href = buildWaLink(
    'Olá! Gostaria de pagar com cartão de crédito. Pode me enviar o link de pagamento, por favor?'
  );
}

export async function renderPaymentFooter() {
  bindTabs();
  renderCardPanel();
  await renderPixPanel();
}

