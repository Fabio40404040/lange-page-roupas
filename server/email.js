import { config } from './config.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

async function sendEmail({ to, subject, htmlContent, tags = [] }) {
  if (!config.brevoApiKey || !config.brevoSenderEmail || !to?.length) return { skipped: true };
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.brevoApiKey, accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ sender: { name: config.brevoSenderName, email: config.brevoSenderEmail }, to, subject, htmlContent, tags }),
  });
  if (!response.ok) throw new Error(`Brevo respondeu ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function sendOrderEmails(order) {
  const items = order.items.map((item) => `<li>${item.quantity}× ${escapeHtml(item.name)} — ${escapeHtml(item.size)} / ${escapeHtml(item.color)}</li>`).join('');
  const total = (order.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const payment = { retirada: 'Retirada na loja', pix: 'Pix', cartao: 'Cartão' }[order.payment_method] || order.payment_method;
  const html = `<h1>Pedido recebido</h1><p>Pedido <strong>${escapeHtml(order.id)}</strong></p><ul>${items}</ul><p>Pagamento: <strong>${escapeHtml(payment)}</strong></p><p>Total: <strong>${total}</strong></p>`;
  const jobs = [];
  if (order.customer.email) jobs.push(sendEmail({ to: [{ email: order.customer.email, name: order.customer.name }], subject: `Recebemos seu pedido — ${config.brevoSenderName}`, htmlContent: html, tags: ['pedido-cliente'] }));
  if (config.storeNotificationEmail) jobs.push(sendEmail({ to: [{ email: config.storeNotificationEmail, name: config.brevoSenderName }], subject: `Novo pedido ${order.id}`, htmlContent: html, tags: ['novo-pedido'] }));
  return Promise.all(jobs);
}
