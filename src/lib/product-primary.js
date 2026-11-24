// A capa e a primeira cor representam a mesma peça e usam a mesma foto.
export function syncPrimaryImage(variants, image) {
  if (variants[0]) variants[0].image = image || '';
}
