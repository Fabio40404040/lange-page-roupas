// As fotos antigas de exemplo têm uma moldura dentro de um arquivo 3:4.
// Recortamos apenas essa moldura e encaixamos a foto no mesmo espaço visual
// da referência enviada (204 × 211), mantendo o card externo em 3:4.
export function demoPhotoLayout(width, height) {
  const crop = { x: Math.round(width * .03), y: Math.round(height * .14), width: Math.round(width * .94), height: Math.round(height * .72) };
  const targetHeight = Math.min(height, width * 211 / 204);
  const targetRatio = width / targetHeight;
  // O encaixe anterior com contain deixava uma faixa extra acima e abaixo.
  // Ajustamos a margem do fundo ao aspecto exato da referência antes de
  // desenhar. Assim, ambos os eixos usam a mesma escala, sem deformar a peça.
  if (crop.width / crop.height > targetRatio) {
    const croppedWidth = crop.height * targetRatio;
    crop.x += (crop.width - croppedWidth) / 2;
    crop.width = croppedWidth;
  } else {
    const croppedHeight = crop.width / targetRatio;
    crop.y += (crop.height - croppedHeight) / 2;
    crop.height = croppedHeight;
  }
  return { crop, draw: { x: 0, y: (height - targetHeight) / 2, width, height: targetHeight } };
}

const preparedPhotos = new Map();
export function prepareCatalogPhoto(source, image) {
  if (!source.startsWith('/products-demo/')) return source;
  if (preparedPhotos.has(source)) return preparedPhotos.get(source);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  // O recorte conhecido se aplica somente às fotos de exemplo antigas.
  if (!width || !height || Math.abs(width / height - .75) > .01) return source;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return source;
  const { crop, draw } = demoPhotoLayout(width, height);
  context.fillStyle = '#f5f1e8';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, draw.x, draw.y, draw.width, draw.height);
  const result = canvas.toDataURL('image/png');
  preparedPhotos.set(source, result);
  return result;
}
