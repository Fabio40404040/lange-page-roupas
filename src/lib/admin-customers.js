import { reviewRequest, escapeReview as html } from './reviews.js';
import { applyLocalArchives, matchesArchive, changeArchive, confirmArchive } from './admin-archives.js';
const $ = (id) => document.getElementById(id);
let rows = [], version = 0, demo = false, timer;
let lastSignature = '';

export async function loadAdminCustomers(append = false, silent = false) {
  const current = ++version;
  const offset = append ? rows.length : 0;
  const visibleCount = rows.length;
  $('moreCustomersButton').disabled = true;
  if (!silent) $('customersFeedback').textContent = 'Carregando clientes…';
  try {
    const scope = $('customerArchiveFilter').value;
    const search = $('customerSearch').value.trim();
    let data;
    if (demo) {
      const session = await reviewRequest('customer/session').catch(() => null);
      const profile = session ? await reviewRequest('customer/profile') : null;
      const purchases = profile ? await reviewRequest('customer/orders') : null;
      const own = profile ? applyLocalArchives([{ ...profile.profile, order_count: purchases.orders.length }], 'customers').filter((row) => matchesArchive(row, scope) && `${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(search.toLowerCase())) : [];
      data = { customers: own, total: own.length, message: profile ? `${own.length} cadastro(s) de teste encontrado(s). Alterações locais neste navegador.` : 'Entre na Área da Cliente neste navegador para testar seu próprio cadastro. Para consultar todos os clientes da loja, entre no admin com acesso completo.' };
    } else {
      const params = new URLSearchParams({ archive: scope, search, offset: String(offset) });
      data = await reviewRequest(`admin/customers?${params}`);
      // Atualização automática mantém as páginas que já foram abertas.
      while (silent && data.customers.length < visibleCount && data.customers.length < data.total) {
        params.set('offset', String(data.customers.length));
        const page = await reviewRequest(`admin/customers?${params}`);
        if (current !== version) return;
        if (!page.customers.length) break;
        data.customers.push(...page.customers);
      }
    }
    if (current !== version) return;
    rows = append ? [...rows, ...data.customers] : data.customers;
    $('customersFeedback').textContent = data.message || `${rows.length} de ${data.total} clientes para estes filtros. Base da loja: ${data.summary.total} cadastros, ${data.summary.active} não arquivados e ${data.summary.archived} arquivados. Atualização automática a cada 15 segundos.`;
    $('moreCustomersButton').hidden = demo || rows.length >= data.total;
    const signature = JSON.stringify(rows);
    if (signature !== lastSignature) {
      lastSignature = signature;
      $('customerRows').innerHTML = rows.map((row) => `<tr><td><strong>${html(row.name)}</strong><small class="tableMeta">${html(row.email)}</small></td><td>${html(row.phone)}</td><td>${row.order_count || 0}</td><td>${row.archived_at ? 'Arquivado' : 'Ativo'}<small class="tableMeta">${row.verified ? 'Email confirmado' : 'Email não confirmado'}</small></td><td><button class="secondaryButton" data-archive-customer="${html(row.email)}" type="button">${row.archived_at ? 'Restaurar' : 'Arquivar'}</button></td></tr>`).join('') || '<tr><td colspan="5"><div class="emptyState">Nenhum cliente para estes filtros.</div></td></tr>';
    }
  } catch (error) { if (current === version) $('customersFeedback').textContent = `${error.message} Tentaremos novamente automaticamente.`; }
  finally { if (current === version) $('moreCustomersButton').disabled = false; }
}

export function bindAdminCustomers(isDemo) {
  demo = isDemo;
  $('customersScopeNotice').textContent = demo ? 'Acesso demonstrativo: esta lista mostra somente a cliente conectada neste navegador. Outros cadastros reais ficam protegidos. Use o acesso completo do admin para ver a base da loja.' : 'Acesso completo: consulta à base de clientes da loja. Os filtros só alteram a visualização; nenhum cadastro é excluído.';
  $('customerSearch').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => loadAdminCustomers(), 250); });
  $('customerArchiveFilter').addEventListener('change', () => loadAdminCustomers());
  $('clearCustomerFilters').addEventListener('click', () => { clearTimeout(timer); $('customerSearch').value = ''; $('customerArchiveFilter').value = 'all'; loadAdminCustomers(); });
  $('moreCustomersButton').addEventListener('click', () => loadAdminCustomers(true));
  $('customerRows').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-archive-customer]'); if (!button) return;
    const row = rows.find((row) => row.email === button.dataset.archiveCustomer); if (!row) return;
    const archived = !row.archived_at;
    if (archived && !(await confirmArchive('customers'))) return;
    button.disabled = true;
    try { await changeArchive('customers', row.email, archived, demo); await loadAdminCustomers(); }
    catch (error) { $('customersFeedback').textContent = error.message; button.disabled = false; }
  });
}
