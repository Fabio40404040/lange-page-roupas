// O catálogo publicado é a fonte dos valores de pedidos reais.
export function checkoutQuote(basket, products) {
  const quantities = new Map();
  const items = basket.map((item) => {
    const product = products.find((product) => product.id === item.id && product.active !== false);
    const quantity = Number(item.qty);
    if (!product || !Number.isInteger(quantity) || quantity < 1) throw new Error('Um item do carrinho não está mais disponível na loja publicada. Revise o carrinho.');
    quantities.set(product.id, (quantities.get(product.id) || 0) + quantity);
    if (quantities.get(product.id) > product.stock) throw new Error(`Estoque insuficiente para ${product.name}. Revise o carrinho.`);
    const unitPriceCents = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) throw new Error('O preço deste produto precisa ser revisado pela loja.');
    return { id: item.id, quantity, size: item.size, color: item.color, unitPriceCents,
      name: product.name, previousPriceCents: Math.round(Number(item.price) * 100) };
  });
  return { items, changed: items.some((item) => item.unitPriceCents !== item.previousPriceCents),
    totalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) };
}
