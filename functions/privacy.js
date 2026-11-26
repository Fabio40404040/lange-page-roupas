export async function handlePrivacy(context, path, { reply, requireCustomer }) {
  if (path !== 'customer/privacy-export' || context.request.method !== 'GET') return null;
  const access = await requireCustomer(context);
  if (access.response) return access.response;
  const email = access.customer.email.toLowerCase();
  const [profile, purchases, reviews, support] = await Promise.all([
    context.env.DB.prepare('SELECT email, name, phone, verified, postal_code, street, address_number, complement, neighborhood, city, state, created_at, privacy_version, privacy_acknowledged_at FROM customers WHERE email = ?').bind(email).first(),
    context.env.DB.prepare("SELECT id, status, payment_status, shipping_status, items, address, subtotal_cents, shipping_cents, total_cents, payment_method, tracking_code, shipping_provider, created_at FROM orders WHERE lower(customer_email) = ? OR lower(json_extract(customer, '$.email')) = ? ORDER BY created_at DESC").bind(email, email).all(),
    context.env.DB.prepare('SELECT product_name, rating, comment, status, created_at, public_consent_at, privacy_version, withdrawn_at FROM product_reviews WHERE customer_email = ? ORDER BY created_at DESC').bind(email).all(),
    context.env.DB.prepare('SELECT m.sender_role, m.body, m.created_at FROM support_messages m JOIN support_threads t ON t.id = m.thread_id WHERE t.customer_email = ? ORDER BY m.id').bind(email).all(),
  ]);
  return reply({ exportedAt: new Date().toISOString(), profile, orders: purchases.results.map((order) => ({ ...order, items: JSON.parse(order.items), address: JSON.parse(order.address) })), reviews: reviews.results, support: support.results });
}
