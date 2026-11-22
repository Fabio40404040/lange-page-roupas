import QRCode from 'qrcode';
import { cart, cartTotal, paymentMethod, formatPrice } from './cart.js';
import { getStore } from './store.js';
import { buildPixPayload } from './pix.js';
import { isValidPixKey } from './pix-key.js';

let generation = 0;

export async function renderCartPix() {
  const version = ++generation;
  const panel = document.getElementById('cartPixPanel');
  if (!panel) return;
  panel.hidden = paymentMethod !== 'pix' || cart.length === 0;
  if (panel.hidden) return;
  const image = document.getElementById('cartPixQr');
  const status = document.getElementById('cartPixStatus');
  const copy = document.getElementById('cartPixCopy');
  const store = getStore();
  const total = cartTotal();
  image.hidden = true;
  copy.hidden = true;
  document.getElementById('cartPixAmount').textContent = formatPrice(total);
  if (!isValidPixKey(store.pixKey)) {
    status.textContent = 'Cadastre e salve uma chave Pix válida no painel da loja para exibir o QR Code.';
    return;
  }
  status.textContent = 'Gerando QR Code…';
  try {
    const payload = buildPixPayload({ pixKey: store.pixKey, merchantName: store.name, merchantCity: store.pixCity, amount: total, description: 'Compra na loja' });
    const source = await QRCode.toDataURL(payload, { width: 280, margin: 4 });
    if (version !== generation) return;
    image.src = source;
    image.hidden = false;
    copy.hidden = false;
    copy.textContent = 'Copiar código Pix';
    status.textContent = 'Finalize o pedido antes de pagar. Na confirmação, confira o valor e o recebedor no aplicativo do seu banco.';
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(payload);
        copy.textContent = 'Código Pix copiado';
      } catch {
        status.textContent = 'Não foi possível copiar. Escaneie o QR Code com o aplicativo do seu banco.';
      }
    };
  } catch {
    if (version === generation) status.textContent = 'Não foi possível gerar o QR Code. Confira a chave Pix cadastrada na loja.';
  }
}
