export async function resolveStorefrontDemo(search = window.location.search) {
  if (new URLSearchParams(search).get('preview') === 'demo') return true;
  try {
    const response = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
    if (!response.ok) return false;
    const session = await response.json();
    return session.access === 'demo';
  } catch { return false; }
}
