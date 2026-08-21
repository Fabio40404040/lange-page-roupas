// ============================================================
// PIX — monta o código "copia e cola" no formato oficial do Banco
// Central (padrão EMV, o mesmo que qualquer app de banco lê).
// Lógica pura, sem tocar em HTML — quem desenha o QR na tela é o
// src/lib/pix-ui.js.
//
// Como funciona por baixo dos panos: o código é uma sequência de
// campos "TAG + TAMANHO + VALOR" (padrão TLV), terminando com um
// checksum (CRC16) que garante que o código não foi digitado errado.
// Referência pública: manual "BR Code" do Banco Central do Brasil.
// ============================================================

// function tlv(id, value) {
//   const length = String(value.length).padStart(2, '0');
//   return `${id}${length}${value}`;
// }

// // Remove acento, deixa maiúsculo e corta no tamanho máximo exigido
// // pelo padrão (nome do lojista: 25 caracteres / cidade: 15 caracteres)
// function sanitize(str, maxLength) {
//   return (str || '')
//     .normalize('NFD')
//     .replace(/[\u0300-\u036f]/g, '')
//     .replace(/[^a-zA-Z0-9 ]/g, '')
//     .toUpperCase()
//     .trim()
//     .slice(0, maxLength);
// }

// function crc16(payload) {
//   let crc = 0xffff;
//   for (let i = 0; i < payload.length; i++) {
//     crc ^= payload.charCodeAt(i) << 8;
//     for (let j = 0; j < 8; j++) {
//       crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
//     }
//   }
//   return crc.toString(16).toUpperCase().padStart(4, '0');
// }

// /**
//  * Monta o código Pix "copia e cola" (estático — sem valor fixo,
//  * o cliente digita o valor no app do banco dele na hora de pagar).
//  */
// export function buildPixPayload({ pixKey, merchantName, merchantCity, description }) {
//   const name = sanitize(merchantName, 25) || 'LOJA';
//   const city = sanitize(merchantCity, 15) || 'BRASIL';

//   const merchantAccountInfo = tlv(
//     '26',
//     tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey) + (description ? tlv('02', sanitize(description, 40)) : '')
//   );

//   const additionalData = tlv('62', tlv('05', '***')); // "***" = sem número de pedido específico

//   let payload =
//     tlv('00', '01') + // Payload Format Indicator (fixo)
//     tlv('01', '11') + // 11 = QR estático (reutilizável)
//     merchantAccountInfo +
//     tlv('52', '0000') + // Categoria do comerciante (genérico)
//     tlv('53', '986') + // Moeda: Real (BRL)
//     tlv('58', 'BR') +
//     tlv('59', name) +
//     tlv('60', city) +
//     additionalData;

//   payload += '6304'; // abre o campo do CRC (tag 63, tamanho 04)
//   return payload + crc16(payload);
// }


// ============================================================
// PIX — monta o código "copia e cola" no formato oficial do Banco
// Central (padrão EMV, o mesmo que qualquer app de banco lê).
// Lógica pura, sem tocar em HTML — quem desenha o QR na tela é o
// src/lib/pix-ui.js.
//
// Como funciona por baixo dos panos: o código é uma sequência de
// campos "TAG + TAMANHO + VALOR" (padrão TLV), terminando com um
// checksum (CRC16) que garante que o código não foi digitado errado.
// Referência pública: manual "BR Code" do Banco Central do Brasil.
// ============================================================

function tlv(id, value) {
  const length = String(value.length).padStart(2, '0');
  return `${id}${length}${value}`;
}

// Remove acento, deixa maiúsculo e corta no tamanho máximo exigido
// pelo padrão (nome do lojista: 25 caracteres / cidade: 15 caracteres)
function sanitize(str, maxLength) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, maxLength);
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Monta o código Pix "copia e cola" (estático — sem valor fixo,
 * o cliente digita o valor no app do banco dele na hora de pagar).
 */
export function buildPixPayload({ pixKey, merchantName, merchantCity, description }) {
  const name = sanitize(merchantName, 25) || 'LOJA';
  const city = sanitize(merchantCity, 15) || 'BRASIL';

  const merchantAccountInfo = tlv(
    '26',
    tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey) + (description ? tlv('02', sanitize(description, 40)) : '')
  );

  const additionalData = tlv('62', tlv('05', '***')); // "***" = sem número de pedido específico

  let payload =
    tlv('00', '01') + // Payload Format Indicator (fixo)
    tlv('01', '11') + // 11 = QR estático (reutilizável)
    merchantAccountInfo +
    tlv('52', '0000') + // Categoria do comerciante (genérico)
    tlv('53', '986') + // Moeda: Real (BRL)
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    additionalData;

  payload += '6304'; // abre o campo do CRC (tag 63, tamanho 04)
  return payload + crc16(payload);
}
