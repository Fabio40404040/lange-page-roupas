export function normalizeSizes(value) {
  const entries = Array.isArray(value) ? value : [value];
  const sizes = entries.flatMap((entry) => String(entry ?? '').split(/[,;\n|]+/))
    .map((size) => size.trim()).filter(Boolean)
    .flatMap((size) => /^(?:PP|P|M|G|GG|XG|XGG|\d+(?:\/\d+)?)(?:\s+(?:PP|P|M|G|GG|XG|XGG|\d+(?:\/\d+)?))+$/i.test(size) ? size.split(/\s+/) : [size]);
  return sizes.length ? [...new Set(sizes)] : ['Único'];
}
