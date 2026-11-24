import assert from 'node:assert/strict';
import { demoPhotoLayout, prepareCatalogPhoto } from '../src/lib/catalog-photo.js';

for (const [width, height] of [[900, 1200], [1086, 1448]]) {
  const { crop, draw } = demoPhotoLayout(width, height);
  // Mesmo encaixe feito no upload de um PNG 204 × 211 em um canvas 3:4.
  const canvaScale = Math.min(width / 204, height / 211);
  const referenceWidth = 204 * canvaScale;
  const referenceHeight = 211 * canvaScale;
  assert.ok(Math.abs(draw.width - referenceWidth) < 1e-8);
  assert.ok(Math.abs(draw.height - referenceHeight) < 1e-8);
  assert.ok(Math.abs(draw.y - (height - referenceHeight) / 2) < 1e-8);
  // O recorte fica dentro da moldura já removida e não estica a imagem.
  assert.ok(crop.x >= Math.round(width * .03));
  assert.ok(crop.y >= Math.round(height * .14));
  assert.ok(crop.x + crop.width <= width - Math.round(width * .03) + 1);
  assert.ok(Math.abs(draw.width / crop.width - draw.height / crop.height) < 1e-8);
}

assert.equal(prepareCatalogPhoto('/api/files/foto-canva.png', { naturalWidth: 204, naturalHeight: 211 }), '/api/files/foto-canva.png');
console.log('OK: fotos de exemplo ocupam exatamente o quadro da referência 204 × 211, centralizado no card 3:4, sem distorção; uploads do admin permanecem intactos.');
