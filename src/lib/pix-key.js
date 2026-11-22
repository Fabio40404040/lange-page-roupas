export function normalizePixKey(value) {
  const key = String(value || '').trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return key;
  if (/^[+\d\s()./-]+$/.test(key)) return key.replace(/[\s()./-]/g, '');
  return key;
}

export function isValidPixKey(value) {
  const key = normalizePixKey(value);
  return /^\d{11}$|^\d{14}$/.test(key)
    || /^\+[1-9]\d{7,14}$/.test(key)
    || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) && key.length <= 77
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
}
