import dotenv from 'dotenv';

dotenv.config({ path: new URL('./.env', import.meta.url), quiet: true });
dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';
const allowDemo = process.env.ALLOW_DEMO_LOGIN === 'true' || !isProduction;

export const config = {
  port: Number(process.env.PORT || 8787),
  isProduction,
  allowedOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim()),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  adminEmail: process.env.ADMIN_EMAIL || (allowDemo ? 'admin@frswear.local' : ''),
  adminPassword: process.env.ADMIN_PASSWORD || (allowDemo ? 'frs1234' : ''),
  sessionSecret: process.env.ADMIN_SESSION_SECRET || (allowDemo ? 'frs-wear-local-demo-secret-not-for-production' : ''),
  demoLogin: allowDemo,
  brevoApiKey: process.env.BREVO_API_KEY || '',
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || '',
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'FRS-Wear',
  storeNotificationEmail: process.env.STORE_NOTIFICATION_EMAIL || '',
  publicApiUrl: (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 8787}`).replace(/\/$/, ''),
  uploadDirectory: process.env.UPLOAD_DIR || '',
};

export function assertProductionConfig() {
  if (!config.isProduction) return;
  const missing = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.adminEmail) missing.push('ADMIN_EMAIL');
  if (!config.adminPassword) missing.push('ADMIN_PASSWORD');
  if (config.sessionSecret.length < 32) missing.push('ADMIN_SESSION_SECRET');
  if (!config.brevoApiKey) missing.push('BREVO_API_KEY');
  if (!config.brevoSenderEmail) missing.push('BREVO_SENDER_EMAIL');
  if (missing.length) throw new Error(`Configuração de produção incompleta: ${missing.join(', ')}`);
}
