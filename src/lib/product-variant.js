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
