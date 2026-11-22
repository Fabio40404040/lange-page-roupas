export function variantTag(product, variant) {
  return String(variant?.tag ?? product.tag ?? '').trim().toLowerCase();
}

export function noveltyVariants(products) {
  return products.filter((product) => product.active !== false).flatMap((product) => {
    const variants = product.colors?.length ? product.colors : [null];
    return variants.filter((variant) => variantTag(product, variant) === 'novo').map((variant) => ({
      ...product,
      name: variantProductName(product, variant),
      image: variant?.image || product.image,
      colorName: variant?.name || '',
    }));
  });
}

// O nome personalizado tem prioridade. Nos produtos antigos, substituímos
// apenas a cor no final do título, sem alterar palavras no meio do nome.
export function variantProductName(product, variant) {
  if (variant?.productName?.trim()) return variant.productName.trim();
  const name = String(product.name || '').trim();
  const originalColor = product.colors?.[0]?.name?.trim();
  const selectedColor = variant?.name?.trim();
  if (!originalColor || !selectedColor || originalColor === selectedColor) return name;
  const suffix = ` ${originalColor}`;
  return name.toLocaleLowerCase('pt-BR').endsWith(suffix.toLocaleLowerCase('pt-BR'))
    ? `${name.slice(0, -suffix.length)} ${selectedColor}`
    : name;
}
