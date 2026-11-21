import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

const COOKIE = 'frs_admin_session';
const MAX_AGE = 60 * 60 * 8;

function sign(value) { return createHmac('sha256', config.sessionSecret).update(value).digest('base64url'); }
function equal(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}
function cookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((item) => {
    const index = item.indexOf('=');
    return [item.slice(0, index).trim(), item.slice(index + 1)];
  }));
}

export function validCredentials(email, password) {
  return Boolean(config.adminEmail && config.adminPassword) && equal(email, config.adminEmail) && equal(password, config.adminPassword);
}
export function sessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = `${expires}.${sign(`${expires}:${config.adminEmail}`)}`;
  return `${COOKIE}=${token}; HttpOnly; ${config.isProduction ? 'Secure; ' : ''}SameSite=${config.isProduction ? 'None' : 'Strict'}; Path=/; Max-Age=${MAX_AGE}`;
}
export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; ${config.isProduction ? 'Secure; ' : ''}SameSite=${config.isProduction ? 'None' : 'Strict'}; Path=/; Max-Age=0`;
}
export function isAuthenticated(request) {
  const [expiresText, signature = ''] = (cookies(request)[COOKIE] || '').split('.');
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !signature) return false;
  return equal(signature, sign(`${expires}:${config.adminEmail}`));
}
export function requireAdmin(request, response, next) {
  if (!isAuthenticated(request)) return response.status(401).json({ error: 'Sessão administrativa inválida.' });
  next();
}
