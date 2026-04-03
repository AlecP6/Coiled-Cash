// ===== CONFIG =====
const API = '/api';

// ===== AUTH =====
let currentUser = null;
let authToken   = null;

function getStoredSession() {
  const token = sessionStorage.getItem('cc_token');
  const user  = sessionStorage.getItem('cc_user');
  if (token && user) return { token, user: JSON.parse(user) };
  return null;
}

function storeSession(token, user) {
  sessionStorage.setItem('cc_token', token);
  sessionStorage.setItem('cc_user', JSON.stringify(user));
}

function clearStoredSession() {
  sessionStorage.removeItem('cc_token');
  sessionStorage.removeItem('cc_user');
}

function showAuthOverlay() {
  document.getElementById('authOverlay').classList.remove('hidden');
}

function hideAuthOverlay() {
  document.getElementById('authOverlay').classList.add('hidden');
}

function showPanel(id) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setAuthError(panelId, msg) {
  const errorId = panelId === 'panelLogin' ? 'loginError' : 'registerError';
  document.getElementById(errorId).textContent = msg;
}

function clearAuthErrors() {
  document.getElementById('loginError').textContent    = '';
  document.getElementById('registerError').textContent = '';
}

// Switch panels
document.getElementById('goRegister')?.addEventListener('click', (e) => {
  e.preventDefault();
  clearAuthErrors();
  showPanel('panelRegister');
});

document.getElementById('goLogin')?.addEventListener('click', (e) => {
  e.preventDefault();
  clearAuthErrors();
  showPanel('panelLogin');
});

// Register
document.getElementById('btnRegister')?.addEventListener('click', async () => {
  const username = document.getElementById('regId').value.trim();
  const rp_name  = document.getElementById('regRpName').value.trim();
  const password = document.getElementById('regPwd').value;
  const confirm  = document.getElementById('regPwdConfirm').value;

  if (!username) return setAuthError('panelRegister', 'L\'identifiant est requis.');
  if (!rp_name)  return setAuthError('panelRegister', 'Le nom RP est requis.');
  if (!password) return setAuthError('panelRegister', 'Le mot de passe est requis.');
  if (password.length < 4) return setAuthError('panelRegister', 'Mot de passe trop court (min. 4 caractères).');
  if (password !== confirm) return setAuthError('panelRegister', 'Les mots de passe ne correspondent pas.');

  setAuthLoading('btnRegister', true);
  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, rp_name, password }),
    });
    const data = await res.json();
    if (!res.ok) return setAuthError('panelRegister', data.error || 'Erreur.');
    loginUser(data.token, data.user);
  } catch {
    setAuthError('panelRegister', 'Impossible de contacter le serveur.');
  } finally {
    setAuthLoading('btnRegister', false);
  }
});

// Login
document.getElementById('btnLogin')?.addEventListener('click', async () => {
  const username = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPwd').value;

  if (!username) return setAuthError('panelLogin', 'L\'identifiant est requis.');
  if (!password) return setAuthError('panelLogin', 'Le mot de passe est requis.');

  setAuthLoading('btnLogin', true);
  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return setAuthError('panelLogin', data.error || 'Erreur.');
    loginUser(data.token, data.user);
  } catch {
    setAuthError('panelLogin', 'Impossible de contacter le serveur.');
  } finally {
    setAuthLoading('btnLogin', false);
  }
});

function setAuthLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading
    ? 'Chargement...'
    : btnId === 'btnLogin' ? 'Se connecter' : 'Créer le compte';
}

// Enter key on auth inputs
document.querySelectorAll('.auth-input').forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const panel = input.closest('.auth-panel');
    if (panel?.id === 'panelLogin')    document.getElementById('btnLogin').click();
    if (panel?.id === 'panelRegister') document.getElementById('btnRegister').click();
  });
});

function loginUser(token, user) {
  currentUser = user;
  authToken   = token;
  storeSession(token, user);
  hideAuthOverlay();
  onUserLoggedIn(user);
}

function onUserLoggedIn(user) {
  const initials = user.rp_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userRpName').textContent = user.rp_name;
  const adminNav = document.getElementById('adminNavItem');
  if (adminNav) adminNav.style.display = user.is_admin ? '' : 'none';
  switchSection('dashboard');
}

// Logout
document.getElementById('btnLogout')?.addEventListener('click', () => {
  clearStoredSession();
  currentUser = null;
  authToken   = null;
  document.getElementById('loginId').value = '';
  document.getElementById('loginPwd').value = '';
  clearAuthErrors();
  showPanel('panelLogin');
  showAuthOverlay();
});

// ===== NAVIGATION =====
const navItems    = document.querySelectorAll('.nav-item');
const sections    = document.querySelectorAll('.section');
const topbarTitle = document.getElementById('topbarTitle');

const sectionTitles = {
  'dashboard':     'Dashboard',
  'comptabilite':  'Comptabilité',
  'armement':      'Armement',
  'groupes':       'Groupes',
  'resume-tables': 'Résumé Tables',
  'vehicule':      'Véhicule',
  'missions':      'Missions',
  'territoires':   'Territoires',
  'admin':         'Administration',
};

// Restore session on load
const saved = getStoredSession();
if (saved) {
  loginUser(saved.token, saved.user);
} else {
  showAuthOverlay();
}

function switchSection(targetId) {
  sections.forEach(s => s.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));
  const targetSection = document.getElementById('section-' + targetId);
  const targetNav     = document.querySelector(`[data-section="${targetId}"]`);
  if (targetSection) targetSection.classList.add('active');
  if (targetNav)     targetNav.classList.add('active');
  if (topbarTitle)   topbarTitle.textContent = sectionTitles[targetId] || targetId;
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

  // Chargement des données par section
  if (currentUser) {
    if (targetId === 'comptabilite') {
      refreshComptabilite();
    }
    if (targetId === 'armement') {
      fetchWeapons();
      fetchMembers();
    }
    if (targetId === 'groupes') {
      fetchGroups();
    }
    if (targetId === 'resume-tables') {
      fetchSummaries();
      initSummaryDate();
    }
    if (targetId === 'vehicule') {
      fetchVehicles();
      fetchMembers();
    }
    if (targetId === 'dashboard') {
      refreshDashboard();
    }
    if (targetId === 'missions') {
      fetchMissions();
    }
    if (targetId === 'admin') {
      fetchAdminUsers();
    }
    if (targetId === 'territoires') {
      fetchGroups();
      setTimeout(initMap, 80);
    }
  }
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const section = item.getAttribute('data-section');
    if (section) switchSection(section);
  });
});

// ===== MOBILE MENU =====
const menuToggle = document.getElementById('menuToggle');
const sidebar    = document.getElementById('sidebar');

menuToggle?.addEventListener('click', () => sidebar.classList.toggle('open'));

document.addEventListener('click', (e) => {
  if (
    window.innerWidth <= 768 &&
    sidebar.classList.contains('open') &&
    !sidebar.contains(e.target) &&
    !menuToggle.contains(e.target)
  ) {
    sidebar.classList.remove('open');
  }
});

// ===== COMPTABILITÉ =====
let transactions = [];
let activeFilter = 'all';

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
}

async function fetchTransactions() {
  try {
    const res  = await fetch(`${API}/transactions`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    transactions = data;
    renderTransactions();
    updateStats();
  } catch {
    console.error('Erreur chargement transactions.');
  }
}

function formatAmount(n) {
  return '$' + Number(n).toLocaleString('fr-CA', { maximumFractionDigits: 0 });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function updateStats() {
  const total_in  = transactions.filter(t => t.type === 'entree').reduce((s, t) => s + Number(t.amount), 0);
  const total_out = transactions.filter(t => t.type === 'sortie').reduce((s, t) => s + Number(t.amount), 0);
  const balance   = total_in - total_out;

  document.getElementById('statBalance').textContent = formatAmount(balance);
  document.getElementById('statIncome').textContent  = formatAmount(total_in);
  document.getElementById('statExpense').textContent = formatAmount(total_out);
  document.getElementById('statCount').textContent   = transactions.length;

  document.getElementById('statBalance').style.color = balance < 0 ? '#e05c5c' : 'var(--accent)';
}

function renderTransactions() {
  const tbody    = document.getElementById('transactionsList');
  const emptyRow = document.getElementById('emptyTransactions');

  const filtered = activeFilter === 'all'
    ? transactions
    : transactions.filter(t => t.type === activeFilter);

  Array.from(tbody.querySelectorAll('tr.data-row')).forEach(r => r.remove());

  if (filtered.length === 0) {
    emptyRow.style.display = '';
    return;
  }
  emptyRow.style.display = 'none';

  filtered.forEach(t => {
    const tr = document.createElement('tr');
    tr.className  = 'data-row';
    tr.dataset.id = t.id;

    const badgeClass  = t.type === 'entree' ? 'badge-entree' : 'badge-sortie';
    const badgeLabel  = t.type === 'entree' ? '↑ Entrée' : '↓ Sortie';
    const amountClass = t.type === 'entree' ? 'amount-entree' : 'amount-sortie';
    const sign        = t.type === 'entree' ? '+' : '−';

    tr.innerHTML = `
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td>${escapeHtml(t.member)}</td>
      <td class="td-motif" title="${escapeHtml(t.motif)}">${escapeHtml(t.motif)}</td>
      <td class="${amountClass}">${sign}${formatAmount(t.amount)}</td>
      <td class="td-date">${formatDate(t.created_at)}</td>
      <td><button class="btn-delete" data-id="${t.id}" title="Supprimer">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function refreshComptabilite() {
  fetchTransactions();
}

// Type toggle
document.getElementById('btnEntree')?.addEventListener('click', () => {
  document.getElementById('transactionType').value = 'entree';
  document.getElementById('btnEntree').classList.add('active');
  document.getElementById('btnSortie').classList.remove('active');
});

document.getElementById('btnSortie')?.addEventListener('click', () => {
  document.getElementById('transactionType').value = 'sortie';
  document.getElementById('btnSortie').classList.add('active');
  document.getElementById('btnEntree').classList.remove('active');
});

// Add transaction
document.getElementById('btnAddTransaction')?.addEventListener('click', async () => {
  if (!currentUser) return;

  const amountRaw = document.getElementById('transactionAmount').value;
  const motif     = document.getElementById('transactionMotif').value.trim();
  const type      = document.getElementById('transactionType').value;

  if (!amountRaw || parseInt(amountRaw) <= 0) return flashInput('transactionAmount', 'Montant invalide');
  if (!motif) return flashInput('transactionMotif', 'Motif requis');

  const btn = document.getElementById('btnAddTransaction');
  btn.disabled    = true;
  btn.textContent = 'Ajout...';

  try {
    const res  = await fetch(`${API}/transactions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ type, motif, amount: parseInt(amountRaw) }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Erreur.'); return; }

    transactions.unshift(data);
    updateStats();
    renderTransactions();

    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionMotif').value  = '';
  } catch {
    alert('Impossible de contacter le serveur.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Ajouter la transaction';
  }
});

function flashInput(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#e05c5c';
  el.placeholder = msg;
  el.focus();
  setTimeout(() => {
    el.style.borderColor = '';
    el.placeholder = id === 'transactionAmount' ? '0' : 'Raison de la transaction...';
  }, 2000);
}

// Delete transaction
document.getElementById('transactionsList')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const id = Number(btn.dataset.id);

  try {
    const res = await fetch(`${API}/transactions/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) return;
    transactions = transactions.filter(t => t.id !== id);
    updateStats();
    renderTransactions();
  } catch {
    alert('Impossible de contacter le serveur.');
  }
});

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderTransactions();
  });
});

// ===== ARMEMENT =====
let weapons      = [];
let members      = [];
let weaponFilter = 'all';
let weaponSearch = '';
let assignTarget = null; // id de l'arme en cours d'attribution

const CATEGORY_ICONS = {
  'Arme à feu':   '🔫',
  'Arme blanche': '🗡️',
};

async function fetchWeapons() {
  try {
    const res  = await fetch(`${API}/weapons`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    weapons = data;
    renderWeapons();
    updateWeaponStats();
  } catch { console.error('Erreur chargement armes.'); }
}

async function fetchMembers() {
  try {
    const res  = await fetch(`${API}/members`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    members = data;
    populateAssignSelect();
    populateVehicleAssignSelect();
  } catch { console.error('Erreur chargement membres.'); }
}

function updateWeaponStats() {
  const total    = weapons.length;
  const assigned = weapons.filter(w => w.assigned_to).length;
  document.getElementById('weaponStatTotal').textContent    = total;
  document.getElementById('weaponStatAssigned').textContent = assigned;
  document.getElementById('weaponStatFree').textContent     = total - assigned;
}

function getFilteredWeapons() {
  return weapons.filter(w => {
    if (weaponFilter === 'free'     && w.assigned_to)  return false;
    if (weaponFilter === 'assigned' && !w.assigned_to) return false;
    if (weaponSearch) {
      const q = weaponSearch.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function renderWeapons() {
  const grid  = document.getElementById('weaponsGrid');
  const empty = document.getElementById('weaponsEmpty');
  const list  = getFilteredWeapons();

  // Remove old cards
  Array.from(grid.querySelectorAll('.weapon-card')).forEach(c => c.remove());

  if (list.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  list.forEach(w => {
    const card = document.createElement('div');
    card.className  = `weapon-card ${w.assigned_to ? 'is-assigned' : 'is-free'}`;
    card.dataset.id = w.id;

    const icon     = CATEGORY_ICONS[w.category] || '🔧';
    const initials = w.assigned_to_name
      ? w.assigned_to_name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
      : '—';

    card.innerHTML = `
      <div class="weapon-card-top">
        <div class="weapon-card-category">${icon} ${escapeHtml(w.category)}</div>
        <div class="weapon-card-name">${escapeHtml(w.name)}</div>
        ${w.notes ? `<div class="weapon-card-notes">${escapeHtml(w.notes)}</div>` : ''}
      </div>
      <div class="weapon-card-divider"></div>
      <div class="weapon-card-bottom">
        <div class="weapon-assignee">
          <div class="weapon-assignee-avatar ${w.assigned_to ? 'assigned' : 'free'}">${initials}</div>
          <span class="weapon-assignee-name ${w.assigned_to ? 'assigned' : 'free'}">
            ${w.assigned_to ? escapeHtml(w.assigned_to_name) : 'Disponible'}
          </span>
        </div>
        <div class="weapon-card-actions">
          <button class="btn-assign" data-id="${w.id}" title="Attribuer">
            ${w.assigned_to ? '↩ Modifier' : '+ Attribuer'}
          </button>
          <button class="btn-delete" data-weapon-id="${w.id}" title="Supprimer">✕</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function populateAssignSelect() {
  const sel = document.getElementById('assignSelect');
  // Keep the first "none" option
  sel.innerHTML = '<option value="">-- Aucun (retirer l\'attribution) --</option>';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value       = m.id;
    opt.textContent = m.rp_name;
    sel.appendChild(opt);
  });
}

// Add weapon
document.getElementById('btnAddWeapon')?.addEventListener('click', async () => {
  if (!currentUser) return;
  const name     = document.getElementById('weaponName').value.trim();
  const category = document.getElementById('weaponCategory').value;
  const notes    = document.getElementById('weaponNotes').value.trim();

  if (!name)     return flashInput('weaponName',     'Nom requis');
  if (!category) return flashInput('weaponCategory', 'Catégorie requise');

  const btn = document.getElementById('btnAddWeapon');
  btn.disabled = true; btn.textContent = 'Ajout...';

  try {
    const res  = await fetch(`${API}/weapons`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ name, category, notes }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Erreur.'); return; }
    weapons.unshift(data);
    updateWeaponStats();
    renderWeapons();
    document.getElementById('weaponName').value  = '';
    document.getElementById('weaponCategory').value = '';
    document.getElementById('weaponNotes').value = '';
  } catch { alert('Impossible de contacter le serveur.'); }
  finally { btn.disabled = false; btn.textContent = 'Ajouter l\'arme'; }
});

// Click on grid (assign / delete)
document.getElementById('weaponsGrid')?.addEventListener('click', (e) => {
  const assignBtn = e.target.closest('.btn-assign');
  const deleteBtn = e.target.closest('[data-weapon-id]');

  if (assignBtn) {
    assignTarget = Number(assignBtn.dataset.id);
    const weapon = weapons.find(w => w.id === assignTarget);
    document.getElementById('assignModalTitle').textContent = `Attribuer : ${weapon?.name}`;
    populateAssignSelect();
    const sel = document.getElementById('assignSelect');
    sel.value = weapon?.assigned_to ?? '';
    openModal('assignModal');
  }

  if (deleteBtn && !assignBtn) {
    const id = Number(deleteBtn.dataset.weaponId);
    deleteWeapon(id);
  }
});

async function deleteWeapon(id) {
  try {
    const res = await fetch(`${API}/weapons/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return;
    weapons = weapons.filter(w => w.id !== id);
    updateWeaponStats();
    renderWeapons();
  } catch { alert('Impossible de contacter le serveur.'); }
}

// Modal confirm assign
document.getElementById('btnConfirmAssign')?.addEventListener('click', async () => {
  if (assignTarget === null) return;
  const userId = document.getElementById('assignSelect').value || null;
  const parsed = userId ? parseInt(userId) : null;

  try {
    const res  = await fetch(`${API}/weapons/${assignTarget}/assign`, {
      method:  'PATCH',
      headers: authHeaders(),
      body:    JSON.stringify({ user_id: parsed }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Erreur.'); return; }
    const idx = weapons.findIndex(w => w.id === assignTarget);
    if (idx !== -1) weapons[idx] = data;
    updateWeaponStats();
    renderWeapons();
    closeModal('assignModal');
  } catch { alert('Impossible de contacter le serveur.'); }
});

// Modal helpers
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  assignTarget = null;
}

document.getElementById('assignModalClose')?.addEventListener('click',  () => closeModal('assignModal'));
document.getElementById('assignModalCancel')?.addEventListener('click', () => closeModal('assignModal'));
document.getElementById('assignModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('assignModal')) closeModal('assignModal');
});

// Filters
document.querySelectorAll('[data-wfilter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-wfilter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    weaponFilter = btn.dataset.wfilter;
    renderWeapons();
  });
});

// Search
document.getElementById('weaponSearch')?.addEventListener('input', (e) => {
  weaponSearch = e.target.value.trim();
  renderWeapons();
});

// ===== GROUPES =====
let groups      = [];
let groupSearch = '';

async function fetchGroups() {
  try {
    const res  = await fetch(`${API}/groups`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    groups = data;
    renderGroups();
    refreshMapOverlays();
  } catch { console.error('Erreur chargement groupes.'); }
}

function getFilteredGroups() {
  if (!groupSearch) return groups;
  const q = groupSearch.toLowerCase();
  return groups.filter(g =>
    g.name.toLowerCase().includes(q) ||
    (g.residence  && g.residence.toLowerCase().includes(q)) ||
    (g.territory  && g.territory.toLowerCase().includes(q))
  );
}

function renderGroups() {
  const grid  = document.getElementById('groupsGrid');
  const empty = document.getElementById('groupsEmpty');
  const list  = getFilteredGroups();

  Array.from(grid.querySelectorAll('.group-card')).forEach(c => c.remove());

  if (list.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  list.forEach(g => {
    const card = document.createElement('div');
    card.className  = 'group-card';
    card.dataset.id = g.id;

    const updatedDate = new Date(g.updated_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const field = (label, value) => `
      <div class="group-field">
        <span class="group-field-label">${label}</span>
        <span class="group-field-value ${value ? '' : 'empty'}">${escapeHtml(value || 'Non renseigné')}</span>
      </div>`;

    card.innerHTML = `
      <div class="group-card-header">
        <span class="group-card-name">
          ${escapeHtml(g.name)}
        </span>
        <div class="group-card-actions">
          <button class="btn-edit"  data-group-edit="${g.id}">✏️ Modifier</button>
          <button class="btn-delete" data-group-del="${g.id}">✕</button>
        </div>
      </div>
      <div class="group-card-body">
        ${field('📍 Lieu de résidence',   g.residence)}
        ${field('🗺️ Territoire contrôlé', g.territory)}
        ${field('💼 Business possédé',    g.business)}
        ${field('🏢 Entreprise possédée', g.company)}
      </div>
      ${g.notes ? `
      <div class="group-card-notes">
        <span class="group-field-label">📝 Informations complémentaires</span>
        <div class="group-notes-text">${escapeHtml(g.notes)}</div>
      </div>` : ''}
      <div class="group-card-footer">
        <span>Créé par ${escapeHtml(g.created_by_name || '—')}</span>
        <span>Mis à jour le ${updatedDate} par ${escapeHtml(g.updated_by_name || '—')}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Ouvrir modal en mode ajout
document.getElementById('btnOpenAddGroup')?.addEventListener('click', () => {
  openGroupModal(null);
});

// Ouvrir modal en mode édition ou supprimer via la grille
document.getElementById('groupsGrid')?.addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-group-edit]');
  const delBtn  = e.target.closest('[data-group-del]');

  if (editBtn) {
    const id    = Number(editBtn.dataset.groupEdit);
    const group = groups.find(g => g.id === id);
    if (group) openGroupModal(group);
  }
  if (delBtn) {
    const id = Number(delBtn.dataset.groupDel);
    deleteGroup(id);
  }
});

function buildZoneSelector(selectedIds = []) {
  const container = document.getElementById('zoneSelector');
  if (!container) return;
  container.innerHTML = '';
  GTA_ZONES.forEach(zone => {
    const chip = document.createElement('span');
    chip.className   = 'zone-chip' + (selectedIds.includes(zone.id) ? ' selected' : '');
    chip.textContent = zone.name;
    chip.dataset.zid = zone.id;
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
    container.appendChild(chip);
  });
}

function getSelectedZoneIds() {
  return Array.from(document.querySelectorAll('#zoneSelector .zone-chip.selected'))
    .map(c => c.dataset.zid).join(',');
}

function openGroupModal(group) {
  document.getElementById('groupModalTitle').textContent = group ? `Modifier : ${group.name}` : 'Nouveau groupe';
  document.getElementById('groupEditId').value    = group?.id ?? '';
  document.getElementById('groupName').value      = group?.name      ?? '';
  document.getElementById('groupResidence').value = group?.residence ?? '';
  document.getElementById('groupTerritory').value = group?.territory ?? '';
  document.getElementById('groupBusiness').value  = group?.business  ?? '';
  document.getElementById('groupCompany').value   = group?.company   ?? '';
  document.getElementById('groupNotes').value     = group?.notes     ?? '';

  const color = group?.color || '#4caf82';
  document.getElementById('groupColor').value           = color;
  document.getElementById('groupColorLabel').textContent = color;

  const selectedZones = group?.zone_ids ? group.zone_ids.split(',').filter(Boolean) : [];
  buildZoneSelector(selectedZones);

  document.getElementById('groupError').textContent = '';
  openModal('groupModal');
}

document.getElementById('groupColor')?.addEventListener('input', (e) => {
  document.getElementById('groupColorLabel').textContent = e.target.value;
});

// Sauvegarder groupe
document.getElementById('btnSaveGroup')?.addEventListener('click', async () => {
  const id        = document.getElementById('groupEditId').value;
  const name      = document.getElementById('groupName').value.trim();
  const residence = document.getElementById('groupResidence').value.trim();
  const territory = document.getElementById('groupTerritory').value.trim();
  const business  = document.getElementById('groupBusiness').value.trim();
  const company   = document.getElementById('groupCompany').value.trim();
  const notes     = document.getElementById('groupNotes').value.trim();

  if (!name) {
    document.getElementById('groupError').textContent = 'Le nom du groupe est requis.';
    return;
  }

  const color    = document.getElementById('groupColor').value;
  const zone_ids = getSelectedZoneIds();
  const body = { name, residence, territory, business, company, notes, color, zone_ids };
  const isEdit  = id !== '';
  const url     = isEdit ? `${API}/groups/${id}` : `${API}/groups`;
  const method  = isEdit ? 'PUT' : 'POST';

  const btn = document.getElementById('btnSaveGroup');
  btn.disabled = true; btn.textContent = 'Enregistrement...';

  try {
    const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('groupError').textContent = data.error || 'Erreur.';
      return;
    }
    if (isEdit) {
      const idx = groups.findIndex(g => g.id === Number(id));
      if (idx !== -1) groups[idx] = data;
    } else {
      groups.unshift(data);
    }
    renderGroups();
    refreshMapOverlays();
    closeModal('groupModal');
  } catch {
    document.getElementById('groupError').textContent = 'Impossible de contacter le serveur.';
  } finally {
    btn.disabled = false; btn.textContent = 'Enregistrer';
  }
});

async function deleteGroup(id) {
  try {
    const res = await fetch(`${API}/groups/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return;
    groups = groups.filter(g => g.id !== id);
    renderGroups();
    refreshMapOverlays();
  } catch { alert('Impossible de contacter le serveur.'); }
}

// Fermeture modal groupe
document.getElementById('groupModalClose')?.addEventListener('click',  () => closeModal('groupModal'));
document.getElementById('groupModalCancel')?.addEventListener('click', () => closeModal('groupModal'));
document.getElementById('groupModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('groupModal')) closeModal('groupModal');
});

// Recherche groupes
document.getElementById('groupSearch')?.addEventListener('input', (e) => {
  groupSearch = e.target.value.trim();
  renderGroups();
});

// ===== RÉSUMÉ TABLES =====
let summaries     = [];
let summarySearch = '';

async function fetchSummaries() {
  try {
    const res  = await fetch(`${API}/summaries`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    summaries = data;
    renderSummaries();
  } catch { console.error('Erreur chargement résumés.'); }
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const clean = dateStr.substring(0, 10); // gère "YYYY-MM-DD" et "YYYY-MM-DDTHH:..."
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

function formatPostedDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getFilteredSummaries() {
  if (!summarySearch) return summaries;
  const q = summarySearch.toLowerCase();
  return summaries.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q)
  );
}

function renderSummaries() {
  const timeline = document.getElementById('summaryTimeline');
  const empty    = document.getElementById('summaryEmpty');
  const list     = getFilteredSummaries();

  Array.from(timeline.querySelectorAll('.timeline-entry')).forEach(e => e.remove());

  if (list.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  list.forEach(s => {
    const entry = document.createElement('div');
    entry.className  = 'timeline-entry';
    entry.dataset.id = s.id;

    const isOwn = currentUser && s.created_by === currentUser.id;

    entry.innerHTML = `
      <div class="timeline-block">
        <div class="timeline-block-header">
          <div class="timeline-block-meta">
            <span class="timeline-block-title">${escapeHtml(s.title)}</span>
            <span class="timeline-block-date">📅 ${formatEventDate(s.event_date)}</span>
          </div>
          ${isOwn ? `
          <div class="timeline-block-actions">
            <button class="btn-edit" data-summary-edit="${s.id}">✏️ Modifier</button>
            <button class="btn-delete" data-summary-del="${s.id}">✕</button>
          </div>` : ''}
        </div>
        <div class="timeline-block-content">${escapeHtml(s.content)}</div>
        <div class="timeline-block-footer">
          <span>Publié par <strong>${escapeHtml(s.created_by_name || '—')}</strong></span>
          <span>Le ${formatPostedDate(s.created_at)}</span>
        </div>
      </div>
    `;
    timeline.appendChild(entry);
  });
}

// Pré-remplir la date du jour
function initSummaryDate() {
  const input = document.getElementById('summaryDate');
  if (input && !input.value) {
    input.value = new Date().toISOString().split('T')[0];
  }
}

// Ajouter un résumé
document.getElementById('btnAddSummary')?.addEventListener('click', async () => {
  if (!currentUser) return;

  const title      = document.getElementById('summaryTitle').value.trim();
  const event_date = document.getElementById('summaryDate').value;
  const content    = document.getElementById('summaryContent').value.trim();
  const errorEl    = document.getElementById('summaryFormError');

  errorEl.textContent = '';
  if (!title)      { errorEl.textContent = 'Le titre est requis.';   return; }
  if (!event_date) { errorEl.textContent = 'La date est requise.';   return; }
  if (!content)    { errorEl.textContent = 'Le contenu est requis.'; return; }

  const btn = document.getElementById('btnAddSummary');
  btn.disabled = true; btn.textContent = 'Publication...';

  try {
    const res  = await fetch(`${API}/summaries`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ title, content, event_date }),
    });
    const data = await res.json();
    if (!res.ok) { errorEl.textContent = data.error || 'Erreur.'; return; }

    summaries.unshift(data);
    summaries.sort((a, b) => b.event_date.localeCompare(a.event_date));
    renderSummaries();

    document.getElementById('summaryTitle').value   = '';
    document.getElementById('summaryContent').value = '';
    document.getElementById('summaryDate').value    = new Date().toISOString().split('T')[0];
  } catch {
    errorEl.textContent = 'Impossible de contacter le serveur.';
  } finally {
    btn.disabled = false; btn.textContent = 'Publier le résumé';
  }
});

// Clic sur la timeline (edit / delete)
document.getElementById('summaryTimeline')?.addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-summary-edit]');
  const delBtn  = e.target.closest('[data-summary-del]');

  if (editBtn) {
    const id      = Number(editBtn.dataset.summaryEdit);
    const summary = summaries.find(s => s.id === id);
    if (summary) openSummaryModal(summary);
  }
  if (delBtn) {
    const id = Number(delBtn.dataset.summaryDel);
    deleteSummary(id);
  }
});

function openSummaryModal(s) {
  document.getElementById('summaryEditId').value      = s.id;
  document.getElementById('summaryEditTitle').value   = s.title;
  document.getElementById('summaryEditDate').value    = s.event_date;
  document.getElementById('summaryEditContent').value = s.content;
  document.getElementById('summaryEditError').textContent = '';
  openModal('summaryModal');
}

document.getElementById('btnSaveSummary')?.addEventListener('click', async () => {
  const id         = document.getElementById('summaryEditId').value;
  const title      = document.getElementById('summaryEditTitle').value.trim();
  const event_date = document.getElementById('summaryEditDate').value;
  const content    = document.getElementById('summaryEditContent').value.trim();
  const errorEl    = document.getElementById('summaryEditError');

  errorEl.textContent = '';
  if (!title)      { errorEl.textContent = 'Le titre est requis.';   return; }
  if (!event_date) { errorEl.textContent = 'La date est requise.';   return; }
  if (!content)    { errorEl.textContent = 'Le contenu est requis.'; return; }

  const btn = document.getElementById('btnSaveSummary');
  btn.disabled = true; btn.textContent = 'Enregistrement...';

  try {
    const res  = await fetch(`${API}/summaries/${id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ title, content, event_date }),
    });
    const data = await res.json();
    if (!res.ok) { errorEl.textContent = data.error || 'Erreur.'; return; }

    const idx = summaries.findIndex(s => s.id === Number(id));
    if (idx !== -1) summaries[idx] = data;
    summaries.sort((a, b) => b.event_date.localeCompare(a.event_date));
    renderSummaries();
    closeModal('summaryModal');
  } catch {
    errorEl.textContent = 'Impossible de contacter le serveur.';
  } finally {
    btn.disabled = false; btn.textContent = 'Enregistrer';
  }
});

async function deleteSummary(id) {
  try {
    const res = await fetch(`${API}/summaries/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return;
    summaries = summaries.filter(s => s.id !== id);
    renderSummaries();
  } catch { alert('Impossible de contacter le serveur.'); }
}

// Fermeture modal résumé
document.getElementById('summaryModalClose')?.addEventListener('click',  () => closeModal('summaryModal'));
document.getElementById('summaryModalCancel')?.addEventListener('click', () => closeModal('summaryModal'));
document.getElementById('summaryModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('summaryModal')) closeModal('summaryModal');
});

// Recherche résumés
document.getElementById('summarySearch')?.addEventListener('input', (e) => {
  summarySearch = e.target.value.trim();
  renderSummaries();
});

// ===== VÉHICULES =====
let vehicles       = [];
let vehicleFilter  = 'all';
let vehicleSearch  = '';
let vehicleAssignTarget = null;

const VEHICLE_ICONS = {
  'Voiture': '🚗',
  '4X4':     '🚙',
  'Moto':    '🏍️',
};

async function fetchVehicles() {
  try {
    const res  = await fetch(`${API}/vehicles`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    vehicles = data;
    renderVehicles();
    updateVehicleStats();
  } catch { console.error('Erreur chargement véhicules.'); }
}

function updateVehicleStats() {
  const total    = vehicles.length;
  const assigned = vehicles.filter(v => v.assigned_to).length;
  document.getElementById('vehicleStatTotal').textContent    = total;
  document.getElementById('vehicleStatAssigned').textContent = assigned;
  document.getElementById('vehicleStatFree').textContent     = total - assigned;
}

function getFilteredVehicles() {
  return vehicles.filter(v => {
    if (vehicleFilter === 'free'     && v.assigned_to)  return false;
    if (vehicleFilter === 'assigned' && !v.assigned_to) return false;
    if (vehicleSearch) {
      const q = vehicleSearch.toLowerCase();
      if (!v.name.toLowerCase().includes(q) && !v.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function renderVehicles() {
  const grid  = document.getElementById('vehiclesGrid');
  const empty = document.getElementById('vehiclesEmpty');
  const list  = getFilteredVehicles();

  Array.from(grid.querySelectorAll('.weapon-card')).forEach(c => c.remove());

  if (list.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  list.forEach(v => {
    const card = document.createElement('div');
    card.className  = `weapon-card ${v.assigned_to ? 'is-assigned' : 'is-free'}`;
    card.dataset.id = v.id;

    const icon     = VEHICLE_ICONS[v.category] || '🚗';
    const initials = v.assigned_to_name
      ? v.assigned_to_name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
      : '—';

    card.innerHTML = `
      <div class="weapon-card-top">
        <div class="weapon-card-category">${icon} ${escapeHtml(v.category)}</div>
        <div class="weapon-card-name">${escapeHtml(v.name)}</div>
        ${v.notes ? `<div class="weapon-card-notes">${escapeHtml(v.notes)}</div>` : ''}
      </div>
      <div class="weapon-card-divider"></div>
      <div class="weapon-card-bottom">
        <div class="weapon-assignee">
          <div class="weapon-assignee-avatar ${v.assigned_to ? 'assigned' : 'free'}">${initials}</div>
          <span class="weapon-assignee-name ${v.assigned_to ? 'assigned' : 'free'}">
            ${v.assigned_to ? escapeHtml(v.assigned_to_name) : 'Disponible'}
          </span>
        </div>
        <div class="weapon-card-actions">
          <button class="btn-assign" data-vid="${v.id}">
            ${v.assigned_to ? '↩ Modifier' : '+ Attribuer'}
          </button>
          <button class="btn-delete" data-vehicle-del="${v.id}">✕</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function populateVehicleAssignSelect() {
  const sel = document.getElementById('vehicleAssignSelect');
  sel.innerHTML = '<option value="">-- Aucun (retirer l\'attribution) --</option>';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value       = m.id;
    opt.textContent = m.rp_name;
    sel.appendChild(opt);
  });
}

// Clic sur la grille véhicules
document.getElementById('vehiclesGrid')?.addEventListener('click', (e) => {
  const assignBtn = e.target.closest('[data-vid]');
  const deleteBtn = e.target.closest('[data-vehicle-del]');

  if (assignBtn) {
    vehicleAssignTarget = Number(assignBtn.dataset.vid);
    const vehicle = vehicles.find(v => v.id === vehicleAssignTarget);
    document.getElementById('vehicleAssignModalTitle').textContent = `Attribuer : ${vehicle?.name}`;
    populateVehicleAssignSelect();
    const sel = document.getElementById('vehicleAssignSelect');
    sel.value = vehicle?.assigned_to ?? '';
    openModal('vehicleAssignModal');
  }

  if (deleteBtn && !assignBtn) {
    const id = Number(deleteBtn.dataset.vehicleDel);
    deleteVehicle(id);
  }
});

// Ajouter véhicule
document.getElementById('btnAddVehicle')?.addEventListener('click', async () => {
  if (!currentUser) return;
  const name     = document.getElementById('vehicleName').value.trim();
  const category = document.getElementById('vehicleCategory').value;
  const notes    = document.getElementById('vehicleNotes').value.trim();

  if (!name)     return flashInput('vehicleName',     'Nom requis');
  if (!category) return flashInput('vehicleCategory', 'Catégorie requise');

  const btn = document.getElementById('btnAddVehicle');
  btn.disabled = true; btn.textContent = 'Ajout...';

  try {
    const res  = await fetch(`${API}/vehicles`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ name, category, notes }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Erreur.'); return; }
    vehicles.unshift(data);
    updateVehicleStats();
    renderVehicles();
    document.getElementById('vehicleName').value     = '';
    document.getElementById('vehicleCategory').value = '';
    document.getElementById('vehicleNotes').value    = '';
  } catch { alert('Impossible de contacter le serveur.'); }
  finally { btn.disabled = false; btn.textContent = 'Ajouter le véhicule'; }
});

// Confirmer attribution véhicule
document.getElementById('btnConfirmVehicleAssign')?.addEventListener('click', async () => {
  if (vehicleAssignTarget === null) return;
  const userId = document.getElementById('vehicleAssignSelect').value || null;
  const parsed = userId ? parseInt(userId) : null;

  try {
    const res  = await fetch(`${API}/vehicles/${vehicleAssignTarget}/assign`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ user_id: parsed }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Erreur.'); return; }
    const idx = vehicles.findIndex(v => v.id === vehicleAssignTarget);
    if (idx !== -1) vehicles[idx] = data;
    updateVehicleStats();
    renderVehicles();
    closeModal('vehicleAssignModal');
  } catch { alert('Impossible de contacter le serveur.'); }
});

async function deleteVehicle(id) {
  try {
    const res = await fetch(`${API}/vehicles/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return;
    vehicles = vehicles.filter(v => v.id !== id);
    updateVehicleStats();
    renderVehicles();
  } catch { alert('Impossible de contacter le serveur.'); }
}

// Fermeture modal attribution véhicule
document.getElementById('vehicleAssignModalClose')?.addEventListener('click',  () => closeModal('vehicleAssignModal'));
document.getElementById('vehicleAssignCancel')?.addEventListener('click',      () => closeModal('vehicleAssignModal'));
document.getElementById('vehicleAssignModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('vehicleAssignModal')) closeModal('vehicleAssignModal');
});

// Filtres véhicules
document.querySelectorAll('[data-vfilter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-vfilter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    vehicleFilter = btn.dataset.vfilter;
    renderVehicles();
  });
});

// Recherche véhicules
document.getElementById('vehicleSearch')?.addEventListener('input', (e) => {
  vehicleSearch = e.target.value.trim();
  renderVehicles();
});

// ===== ADMIN =====
let adminUsers = [];

async function fetchAdminUsers() {
  const tbody = document.getElementById('adminUsersTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Chargement...</td></tr>';
  try {
    const res  = await fetch(`${API}/admin/users`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">${data.error}</td></tr>`; return; }
    adminUsers = data;
    renderAdminUsers();
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Impossible de contacter le serveur.</td></tr>';
  }
}

function renderAdminUsers() {
  const tbody = document.getElementById('adminUsersTbody');
  if (!tbody) return;
  if (adminUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Aucun membre enregistré.</td></tr>';
    return;
  }
  tbody.innerHTML = adminUsers.map(u => `
    <tr>
      <td><span class="admin-username">${escapeHtml(u.username)}</span></td>
      <td>${escapeHtml(u.rp_name)}</td>
      <td>
        <span class="badge ${u.is_admin ? 'badge-admin' : 'badge-member'}">
          ${u.is_admin ? '🛡️ Admin' : '👤 Membre'}
        </span>
      </td>
      <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
      <td class="admin-actions">
        <button class="btn-edit" data-reset-id="${u.id}" data-reset-name="${escapeHtml(u.username)}">🔑 Réinitialiser mdp</button>
        ${u.id !== currentUser?.id ? `
          <button class="btn-edit" data-toggle-admin="${u.id}">${u.is_admin ? '⬇ Rétrograder' : '⬆ Promouvoir'}</button>
          <button class="btn-delete" data-admin-del="${u.id}">✕</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

document.getElementById('adminUsersTbody')?.addEventListener('click', async (e) => {
  // Reset mot de passe
  const resetBtn = e.target.closest('[data-reset-id]');
  if (resetBtn) {
    document.getElementById('resetPwdUserId').value = resetBtn.dataset.resetId;
    document.getElementById('resetPwdTitle').textContent = `Réinitialiser : ${resetBtn.dataset.resetName}`;
    document.getElementById('resetPwdInput').value = '';
    document.getElementById('resetPwdError').textContent = '';
    openModal('resetPwdModal');
    return;
  }
  // Toggle admin
  const toggleBtn = e.target.closest('[data-toggle-admin]');
  if (toggleBtn) {
    const id = toggleBtn.dataset.toggleAdmin;
    try {
      const res = await fetch(`${API}/admin/users/${id}/toggle-admin`, { method: 'PATCH', headers: authHeaders() });
      if (res.ok) fetchAdminUsers();
    } catch {}
    return;
  }
  // Supprimer
  const delBtn = e.target.closest('[data-admin-del]');
  if (delBtn) {
    if (!confirm('Supprimer ce membre définitivement ?')) return;
    try {
      const res = await fetch(`${API}/admin/users/${delBtn.dataset.adminDel}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) fetchAdminUsers();
    } catch {}
  }
});

// Confirmer reset mot de passe
document.getElementById('btnConfirmResetPwd')?.addEventListener('click', async () => {
  const id  = document.getElementById('resetPwdUserId').value;
  const pwd = document.getElementById('resetPwdInput').value.trim();
  const err = document.getElementById('resetPwdError');
  err.textContent = '';
  if (!pwd) { err.textContent = 'Entrez un nouveau mot de passe.'; return; }
  try {
    const res  = await fetch(`${API}/admin/users/${id}/reset-password`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ newPassword: pwd }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    closeModal('resetPwdModal');
  } catch { err.textContent = 'Impossible de contacter le serveur.'; }
});

document.getElementById('resetPwdClose')?.addEventListener('click',  () => closeModal('resetPwdModal'));
document.getElementById('resetPwdCancel')?.addEventListener('click', () => closeModal('resetPwdModal'));
document.getElementById('resetPwdModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('resetPwdModal')) closeModal('resetPwdModal');
});

// ===== DASHBOARD =====
async function refreshDashboard() {
  try {
    const [txRes, wRes, vRes, gRes, mRes, membRes, missRes] = await Promise.all([
      fetch(`${API}/transactions`,  { headers: authHeaders() }),
      fetch(`${API}/weapons`,       { headers: authHeaders() }),
      fetch(`${API}/vehicles`,      { headers: authHeaders() }),
      fetch(`${API}/groups`,        { headers: authHeaders() }),
      fetch(`${API}/members`,       { headers: authHeaders() }),
      fetch(`${API}/members`,       { headers: authHeaders() }),
      fetch(`${API}/missions`,      { headers: authHeaders() }),
    ]);
    const [txData, wData, vData, gData, mData, missData] = await Promise.all([
      txRes.json(), wRes.json(), vRes.json(), gRes.json(), mRes.json(), missRes.json(),
    ]);

    const balance  = txData.reduce((s, t) => s + (t.type === 'entree' ? t.amount : -t.amount), 0);
    const missions = missData.filter ? missData.filter(m => m.status === 'en_cours') : [];

    document.getElementById('dashBalance').textContent  = formatAmount(balance);
    document.getElementById('dashWeapons').textContent  = Array.isArray(wData)   ? wData.length   : 0;
    document.getElementById('dashVehicles').textContent = Array.isArray(vData)   ? vData.length   : 0;
    document.getElementById('dashGroups').textContent   = Array.isArray(gData)   ? gData.length   : 0;
    document.getElementById('dashMembers').textContent  = Array.isArray(mData)   ? mData.length   : 0;
    document.getElementById('dashMissions').textContent = missions.length;

    // Dernières transactions
    const txEl = document.getElementById('dashRecentTx');
    if (txEl) {
      const recent = txData.slice(0, 6);
      txEl.innerHTML = recent.length ? recent.map(t => `
        <div class="dash-list-item">
          <span class="dash-list-badge ${t.type === 'entree' ? 'badge-income' : 'badge-expense'}">
            ${t.type === 'entree' ? '+' : '-'}${formatAmount(t.amount)}
          </span>
          <span class="dash-list-label">${escapeHtml(t.motif || '—')}</span>
          <span class="dash-list-sub">${escapeHtml(t.member_name || '—')}</span>
        </div>`).join('')
        : '<p class="dash-empty">Aucune transaction.</p>';
    }

    // Dernier résumé
    const summEl = document.getElementById('dashLastSummary');
    if (summEl) {
      const last = txData.length ? null : null; // On utilise summaries
      const summRes = await fetch(`${API}/summaries`, { headers: authHeaders() });
      const summData = await summRes.json();
      if (summData.length) {
        const s = summData[0];
        summEl.innerHTML = `
          <div class="dash-summary-title">${escapeHtml(s.title)}</div>
          <div class="dash-summary-date">📅 ${formatEventDate(s.event_date)} — ${escapeHtml(s.created_by_name || '—')}</div>
          <div class="dash-summary-content">${escapeHtml(s.content.slice(0, 200))}${s.content.length > 200 ? '…' : ''}</div>`;
      } else {
        summEl.innerHTML = '<p class="dash-empty">Aucun résumé publié.</p>';
      }
    }

    // Missions actives
    const missEl = document.getElementById('dashMissionsList');
    if (missEl) {
      missEl.innerHTML = missions.length ? missions.slice(0, 4).map(m => `
        <div class="dash-list-item">
          <span class="mission-priority-dot priority-${m.priority}"></span>
          <span class="dash-list-label">${escapeHtml(m.title)}</span>
        </div>`).join('')
        : '<p class="dash-empty">Aucune mission active.</p>';
    }

    // Membres
    const membEl = document.getElementById('dashMembersList');
    if (membEl && Array.isArray(mData)) {
      membEl.innerHTML = mData.map(m => `
        <div class="dash-list-item dash-member-item" data-member-id="${m.id}" style="cursor:pointer">
          <span class="dash-member-avatar">${m.rp_name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</span>
          <div>
            <div class="dash-list-label">${escapeHtml(m.rp_name)}</div>
            <div class="dash-list-sub">@${escapeHtml(m.username)}</div>
          </div>
        </div>`).join('');

      membEl.querySelectorAll('.dash-member-item').forEach(el => {
        el.addEventListener('click', () => openMemberProfile(Number(el.dataset.memberId)));
      });
    }

    renderBalanceChart(txData);
    renderMemberChart(txData, Array.isArray(mData) ? mData : []);

  } catch(e) { console.error('Dashboard error', e); }
}

// ===== GRAPHIQUES COMPTABILITÉ =====
let chartBalanceInst = null;
let chartMemberInst  = null;

function renderBalanceChart(txData) {
  const canvas = document.getElementById('chartBalance');
  if (!canvas || !window.Chart) return;
  if (chartBalanceInst) chartBalanceInst.destroy();

  const sorted = [...txData].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  let running = 0;
  const labels = [], data = [];
  sorted.forEach(t => {
    running += t.type === 'entree' ? t.amount : -t.amount;
    labels.push(new Date(t.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }));
    data.push(running);
  });

  chartBalanceInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Solde', data, borderColor: '#4caf82', backgroundColor: 'rgba(76,175,130,0.1)',
        tension: 0.3, fill: true, pointRadius: 3 }],
    },
    options: { responsive: true, plugins: { legend: { display: false } },
      scales: { x: { ticks: { color:'#888', maxTicksLimit: 8 }, grid: { color:'#2a2a3a' } },
                y: { ticks: { color:'#888' }, grid: { color:'#2a2a3a' } } } },
  });
}

function renderMemberChart(txData, members) {
  const canvas = document.getElementById('chartByMember');
  if (!canvas || !window.Chart) return;
  if (chartMemberInst) chartMemberInst.destroy();

  const totals = {};
  txData.forEach(t => {
    const name = t.member_name || 'Inconnu';
    if (!totals[name]) totals[name] = { income: 0, expense: 0 };
    if (t.type === 'entree') totals[name].income += t.amount;
    else totals[name].expense += t.amount;
  });

  const labels = Object.keys(totals);
  chartMemberInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Entrées',  data: labels.map(l => totals[l].income),  backgroundColor: 'rgba(76,175,130,0.7)' },
        { label: 'Sorties',  data: labels.map(l => totals[l].expense), backgroundColor: 'rgba(229,115,115,0.7)' },
      ],
    },
    options: { responsive: true,
      plugins: { legend: { labels: { color:'#aaa' } } },
      scales: { x: { ticks: { color:'#888' }, grid: { color:'#2a2a3a' } },
                y: { ticks: { color:'#888' }, grid: { color:'#2a2a3a' } } } },
  });
}

// ===== MISSIONS =====
let missions      = [];
let missionFilter = 'all';

const MISSION_STATUS_LABELS = { en_cours: '⏳ En cours', termine: '✅ Terminée', echoue: '❌ Échouée' };
const MISSION_PRIORITY_LABELS = { basse: '🟢 Basse', normale: '🟡 Normale', haute: '🔴 Haute' };

async function fetchMissions() {
  try {
    const res  = await fetch(`${API}/missions`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    missions = data;
    renderMissions();
  } catch { console.error('Erreur chargement missions.'); }
}

function getFilteredMissions() {
  if (missionFilter === 'all') return missions;
  return missions.filter(m => m.status === missionFilter);
}

function buildMissionMembersSelector(selectedIds = []) {
  const container = document.getElementById('missionMembersSelector');
  if (!container) return;
  container.innerHTML = '';
  members.forEach(m => {
    const chip = document.createElement('span');
    chip.className   = 'zone-chip' + (selectedIds.includes(String(m.id)) ? ' selected' : '');
    chip.textContent = m.rp_name;
    chip.dataset.mid = m.id;
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
    container.appendChild(chip);
  });
}

function getSelectedMissionMembers() {
  return Array.from(document.querySelectorAll('#missionMembersSelector .zone-chip.selected'))
    .map(c => c.dataset.mid).join(',');
}

function getMemberNames(ids) {
  if (!ids) return '';
  return ids.split(',').filter(Boolean).map(id => {
    const m = members.find(m => String(m.id) === id);
    return m ? m.rp_name : id;
  }).join(', ');
}

function renderMissions() {
  const grid  = document.getElementById('missionsGrid');
  const empty = document.getElementById('missionsEmpty');
  const list  = getFilteredMissions();
  Array.from(grid.querySelectorAll('.mission-card')).forEach(c => c.remove());
  if (list.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  list.forEach(m => {
    const card = document.createElement('div');
    card.className = `mission-card status-${m.status}`;
    card.innerHTML = `
      <div class="mission-card-header">
        <div class="mission-card-title-row">
          <span class="mission-priority-dot priority-${m.priority}"></span>
          <span class="mission-card-title">${escapeHtml(m.title)}</span>
        </div>
        <div class="mission-card-badges">
          <span class="mission-status-badge status-badge-${m.status}">${MISSION_STATUS_LABELS[m.status]}</span>
          ${currentUser?.id === m.created_by ? `
            <button class="btn-edit" data-mission-edit="${m.id}">✏️</button>
            <button class="btn-delete" data-mission-del="${m.id}">✕</button>
          ` : ''}
        </div>
      </div>
      ${m.description ? `<div class="mission-card-desc">${escapeHtml(m.description)}</div>` : ''}
      ${m.assigned_ids ? `<div class="mission-card-members">👥 ${escapeHtml(getMemberNames(m.assigned_ids))}</div>` : ''}
      <div class="mission-card-footer">
        <span>Par ${escapeHtml(m.created_by_name || '—')}</span>
        <div class="mission-status-controls">
          <select class="mission-status-select form-input form-select" data-mission-status="${m.id}">
            <option value="en_cours"  ${m.status==='en_cours'  ? 'selected':''}>⏳ En cours</option>
            <option value="termine"   ${m.status==='termine'   ? 'selected':''}>✅ Terminée</option>
            <option value="echoue"    ${m.status==='echoue'    ? 'selected':''}>❌ Échouée</option>
          </select>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

// Filtres missions
document.querySelectorAll('[data-mfilter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mfilter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    missionFilter = btn.dataset.mfilter;
    renderMissions();
  });
});

// Ouvrir modal ajout
document.getElementById('btnOpenAddMission')?.addEventListener('click', () => {
  document.getElementById('missionModalTitle').textContent = 'Nouvelle mission';
  document.getElementById('missionEditId').value  = '';
  document.getElementById('missionTitle').value   = '';
  document.getElementById('missionDesc').value    = '';
  document.getElementById('missionPriority').value = 'normale';
  document.getElementById('missionError').textContent = '';
  buildMissionMembersSelector();
  openModal('missionModal');
});

// Clic grille missions
document.getElementById('missionsGrid')?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-mission-edit]');
  const delBtn  = e.target.closest('[data-mission-del]');
  const selEl   = e.target.closest('[data-mission-status]');

  if (editBtn) {
    const m = missions.find(m => m.id === Number(editBtn.dataset.missionEdit));
    if (!m) return;
    document.getElementById('missionModalTitle').textContent = 'Modifier la mission';
    document.getElementById('missionEditId').value   = m.id;
    document.getElementById('missionTitle').value    = m.title;
    document.getElementById('missionDesc').value     = m.description || '';
    document.getElementById('missionPriority').value = m.priority;
    document.getElementById('missionError').textContent = '';
    buildMissionMembersSelector(m.assigned_ids ? m.assigned_ids.split(',') : []);
    openModal('missionModal');
  }
  if (delBtn) {
    if (!confirm('Supprimer cette mission ?')) return;
    const id = Number(delBtn.dataset.missionDel);
    try {
      const res = await fetch(`${API}/missions/${id}`, { method:'DELETE', headers: authHeaders() });
      if (res.ok) { missions = missions.filter(m => m.id !== id); renderMissions(); }
    } catch {}
  }
});

// Changement statut via select
document.getElementById('missionsGrid')?.addEventListener('change', async (e) => {
  const sel = e.target.closest('[data-mission-status]');
  if (!sel) return;
  const id = Number(sel.dataset.missionStatus);
  try {
    const res  = await fetch(`${API}/missions/${id}/status`, {
      method:'PATCH', headers: authHeaders(), body: JSON.stringify({ status: sel.value }),
    });
    const data = await res.json();
    if (res.ok) { const idx = missions.findIndex(m => m.id === id); if (idx !== -1) missions[idx] = data; renderMissions(); }
  } catch {}
});

// Sauvegarder mission
document.getElementById('btnSaveMission')?.addEventListener('click', async () => {
  const id          = document.getElementById('missionEditId').value;
  const title       = document.getElementById('missionTitle').value.trim();
  const description = document.getElementById('missionDesc').value.trim();
  const priority    = document.getElementById('missionPriority').value;
  const assigned_ids = getSelectedMissionMembers();
  const errorEl     = document.getElementById('missionError');
  errorEl.textContent = '';
  if (!title) { errorEl.textContent = 'Le titre est requis.'; return; }

  const isEdit = id !== '';
  const url    = isEdit ? `${API}/missions/${id}` : `${API}/missions`;
  const method = isEdit ? 'PUT' : 'POST';
  const btn    = document.getElementById('btnSaveMission');
  btn.disabled = true; btn.textContent = 'Enregistrement...';

  try {
    const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ title, description, priority, assigned_ids }) });
    const data = await res.json();
    if (!res.ok) { errorEl.textContent = data.error || 'Erreur.'; return; }
    if (isEdit) { const idx = missions.findIndex(m => m.id === Number(id)); if (idx !== -1) missions[idx] = data; }
    else missions.unshift(data);
    renderMissions();
    closeModal('missionModal');
  } catch { errorEl.textContent = 'Impossible de contacter le serveur.'; }
  finally { btn.disabled = false; btn.textContent = 'Enregistrer'; }
});

document.getElementById('missionModalClose')?.addEventListener('click',  () => closeModal('missionModal'));
document.getElementById('missionModalCancel')?.addEventListener('click', () => closeModal('missionModal'));
document.getElementById('missionModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('missionModal')) closeModal('missionModal');
});

// ===== PROFIL MEMBRE =====
async function openMemberProfile(memberId) {
  try {
    const res  = await fetch(`${API}/members/${memberId}/profile`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;
    const { user, weapons: w, vehicles: v, transactions: tx } = data;

    document.getElementById('profileModalTitle').textContent = user.rp_name;
    document.getElementById('profileRpName').textContent     = user.rp_name;
    document.getElementById('profileUsername').textContent   = `@${user.username}`;
    document.getElementById('profileSince').textContent      = `Membre depuis le ${new Date(user.created_at).toLocaleDateString('fr-FR')}`;
    document.getElementById('profileAvatar').textContent     = user.rp_name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('profileTxCount').textContent    = tx.length;
    document.getElementById('profileWeaponCount').textContent  = w.length;
    document.getElementById('profileVehicleCount').textContent = v.length;

    document.getElementById('profileWeapons').innerHTML = w.length
      ? w.map(x => `<div class="profile-item"><span>${escapeHtml(x.name)}</span><span class="profile-item-sub">${escapeHtml(x.category)}</span></div>`).join('')
      : '<p class="dash-empty">Aucune arme attribuée.</p>';

    document.getElementById('profileVehicles').innerHTML = v.length
      ? v.map(x => `<div class="profile-item"><span>${escapeHtml(x.name)}</span><span class="profile-item-sub">${escapeHtml(x.category)}</span></div>`).join('')
      : '<p class="dash-empty">Aucun véhicule attribué.</p>';

    document.getElementById('profileTx').innerHTML = tx.length
      ? tx.map(t => `
        <div class="profile-item">
          <span class="${t.type === 'entree' ? 'dash-list-badge badge-income' : 'dash-list-badge badge-expense'}">${t.type==='entree'?'+':'-'}${formatAmount(t.amount)}</span>
          <span>${escapeHtml(t.motif || '—')}</span>
          <span class="profile-item-sub">${new Date(t.created_at).toLocaleDateString('fr-FR')}</span>
        </div>`).join('')
      : '<p class="dash-empty">Aucune transaction.</p>';

    openModal('memberProfileModal');
  } catch { console.error('Erreur profil membre.'); }
}

document.getElementById('profileModalClose')?.addEventListener('click', () => closeModal('memberProfileModal'));
document.getElementById('memberProfileModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('memberProfileModal')) closeModal('memberProfileModal');
});

// Clic sur membres dans le tableau admin
document.getElementById('adminUsersTbody')?.addEventListener('click', (e) => {
  const rpName = e.target.closest('tr')?.querySelector('.admin-username');
  if (rpName && !e.target.closest('button')) {
    const row = e.target.closest('tr');
    const id  = adminUsers.find(u => u.username === rpName.textContent)?.id;
    if (id) openMemberProfile(id);
  }
}, true);

// ===== TERRITOIRES — CARTE GTA 5 =====
const GTA_ZONES = [
  { id: 'paleto_bay',      name: 'Paleto Bay',           polygon: [[1843,178],[1843,518],[1687,518],[1687,282],[1744,178]] },
  { id: 'paleto_cove',     name: 'Paleto Cove',          polygon: [[1577,178],[1577,262],[1379,262],[1379,178]] },
  { id: 'grapeseed',       name: 'Grapeseed',            polygon: [[1687,518],[1687,720],[1500,720],[1500,518]] },
  { id: 'alamo_sea',       name: 'Alamo Sea',            polygon: [[1500,518],[1500,820],[1280,820],[1280,518]] },
  { id: 'sandy_shores',    name: 'Sandy Shores',         polygon: [[1280,518],[1280,700],[1100,700],[1100,518]] },
  { id: 'mount_chiliad',   name: 'Mount Chiliad',        polygon: [[1379,178],[1379,400],[1200,400],[1200,178]] },
  { id: 'zancudo',         name: 'Fort Zancudo',         polygon: [[900,340],[900,540],[720,540],[720,340]] },
  { id: 'chumash',         name: 'Chumash',              polygon: [[700,460],[700,640],[540,640],[540,460]] },
  { id: 'banham_canyon',   name: 'Banham Canyon',        polygon: [[780,540],[780,700],[620,700],[620,540]] },
  { id: 'pacific_bluffs',  name: 'Pacific Bluffs',       polygon: [[600,640],[600,800],[440,800],[440,640]] },
  { id: 'richman',         name: 'Richman',              polygon: [[820,700],[820,880],[660,880],[660,700]] },
  { id: 'vinewood_hills',  name: 'Vinewood Hills',       polygon: [[980,680],[980,860],[820,860],[820,680]] },
  { id: 'north_vinewood',  name: 'North Vinewood',       polygon: [[980,820],[980,960],[840,960],[840,820]] },
  { id: 'vinewood',        name: 'Vinewood',             polygon: [[840,880],[840,1020],[700,1020],[700,880]] },
  { id: 'downtown_ls',     name: 'Downtown LS',          polygon: [[760,960],[760,1120],[620,1120],[620,960]] },
  { id: 'little_seoul',    name: 'Little Seoul',         polygon: [[640,1040],[640,1180],[500,1180],[500,1040]] },
  { id: 'strawberry',      name: 'Strawberry',           polygon: [[700,1080],[700,1220],[560,1220],[560,1080]] },
  { id: 'davis',           name: 'Davis',                polygon: [[680,1180],[680,1340],[540,1340],[540,1180]] },
  { id: 'chamberlain',     name: 'Chamberlain Hills',    polygon: [[600,1240],[600,1380],[460,1380],[460,1240]] },
  { id: 'south_ls',        name: 'South LS',             polygon: [[540,1340],[540,1480],[400,1480],[400,1340]] },
  { id: 'elysian_island',  name: 'Elysian Island',       polygon: [[460,1440],[460,1620],[300,1620],[300,1440]] },
  { id: 'port_ls',         name: 'Port de LS',           polygon: [[340,1380],[340,1560],[180,1560],[180,1380]] },
  { id: 'east_ls',         name: 'East LS',              polygon: [[860,1040],[860,1240],[700,1240],[700,1040]] },
  { id: 'cypress_flats',   name: 'Cypress Flats',        polygon: [[720,1200],[720,1380],[560,1380],[560,1200]] },
  { id: 'la_mesa',         name: 'La Mesa',              polygon: [[900,1080],[900,1260],[740,1260],[740,1080]] },
  { id: 'murrieta',        name: 'Murrieta Heights',     polygon: [[960,1160],[960,1320],[800,1320],[800,1160]] },
  { id: 'downtown_vinew',  name: 'Downtown Vinewood',    polygon: [[900,880],[900,1040],[760,1040],[760,880]] },
  { id: 'mirror_park',     name: 'Mirror Park',          polygon: [[1020,960],[1020,1120],[880,1120],[880,960]] },
  { id: 'banning',         name: 'Banning',              polygon: [[560,1460],[560,1600],[420,1600],[420,1460]] },
  { id: 'tataviam',        name: 'Tataviam Mountains',   polygon: [[1100,400],[1100,600],[940,600],[940,400]] },
  { id: 'grand_senora',    name: 'Grand Senora Desert',  polygon: [[1100,600],[1100,820],[900,820],[900,600]] },
  { id: 'harmony',         name: 'Harmony',              polygon: [[900,680],[900,860],[740,860],[740,680]] },
  { id: 'recession_pool',  name: 'Ron Alternates Wind',  polygon: [[780,820],[780,960],[640,960],[640,820]] },
  { id: 'great_ocean',     name: 'Great Ocean Hwy',      polygon: [[500,640],[500,820],[340,820],[340,640]] },
  { id: 'pacific_ocean',   name: 'Raton Canyon',         polygon: [[860,500],[860,680],[700,680],[700,500]] },
  { id: 'senora_way',      name: 'Route de Senora',      polygon: [[1060,700],[1060,860],[900,860],[900,700]] },
];

// Version — incrémenter pour forcer reset des zones sauvegardées
const ZONES_VERSION = 3;
if (parseInt(localStorage.getItem('cc_zones_version') || '0') < ZONES_VERSION) {
  localStorage.removeItem('cc_custom_zones');
  localStorage.setItem('cc_zones_version', String(ZONES_VERSION));
}

function loadCustomZones() {
  const saved = localStorage.getItem('cc_custom_zones');
  if (!saved) return;
  try {
    JSON.parse(saved).forEach(({ id, polygon }) => {
      const z = GTA_ZONES.find(z => z.id === id);
      if (z) z.polygon = polygon;
    });
  } catch {}
}

function saveCustomZone(id, polygon) {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem('cc_custom_zones') || '[]'); } catch {}
  const idx = custom.findIndex(c => c.id === id);
  if (idx !== -1) custom[idx].polygon = polygon; else custom.push({ id, polygon });
  localStorage.setItem('cc_custom_zones', JSON.stringify(custom));
}

// ─── Variables carte ───
let gtaMap        = null;
let mapLayers     = {};
let editorMode    = false;
let editorPoints  = [];
let editorMarkers = [];
let editorPreview = null;
let editorZoneId  = null;
let mapInitialized = false;

function initMap() {
  if (mapInitialized) { gtaMap?.invalidateSize(); return; }
  const el = document.getElementById('gtaMap');
  if (!el || typeof L === 'undefined') return;

  loadCustomZones();

  const W = 1920, H = 1920;
  const crs = L.CRS.Simple;
  gtaMap = L.map('gtaMap', {
    crs, minZoom: -2, maxZoom: 2, zoom: -1,
    center: [H / 2, W / 2],
    attributionControl: false,
    dragging:         true,
    touchZoom:        true,
    scrollWheelZoom:  true,
    doubleClickZoom:  false,
    boxZoom:          false,
    keyboard:         false,
  });

  L.imageOverlay('gta5-map.jpg', [[0,0],[H,W]], {
    opacity: 1,
    className: 'gta-map-img',
  }).addTo(gtaMap);

  gtaMap.fitBounds([[0,0],[H,W]], { animate: false });
  mapInitialized = true;

  // Coordonnées en temps réel
  gtaMap.on('mousemove', (e) => {
    const { lat, lng } = e.latlng;
    const x = Math.round(lng), y = Math.round(H - lat);
    document.getElementById('mapCoordDisplay').textContent =
      `x: ${x}  y: ${y}   [lat: ${Math.round(lat)}, lng: ${x}]`;
    if (editorMode && editorPoints.length > 0) updateEditorPreview();
  });

  // Clic en mode éditeur
  gtaMap.on('click', (e) => {
    if (!editorMode || !editorZoneId) return;
    const pt = [Math.round(e.latlng.lat), Math.round(e.latlng.lng)];
    editorPoints.push(pt);
    const marker = L.circleMarker([pt[0], pt[1]], {
      radius: 5, color: '#fff', fillColor: '#4caf82', fillOpacity: 1, weight: 2,
    }).addTo(gtaMap);
    editorMarkers.push(marker);
    updateEditorPreview();
    updateEditorCoordsOutput();
  });

  refreshMapOverlays();
  initMapEditor();
}

function refreshMapOverlays() {
  if (!gtaMap) return;
  Object.values(mapLayers).forEach(l => gtaMap.removeLayer(l));
  mapLayers = {};

  // Zones des groupes (si groups chargés et ont zone_ids)
  groups.forEach(g => {
    if (!g.zone_ids || !g.color) return;
    g.zone_ids.split(',').filter(Boolean).forEach(zid => {
      const zone = GTA_ZONES.find(z => z.id === zid.trim());
      if (!zone) return;
      const poly = L.polygon(zone.polygon, {
        color: g.color, weight: 2, fillColor: g.color, fillOpacity: 0.25,
      }).addTo(gtaMap).bindTooltip(g.name, { permanent: false });
      mapLayers[`${g.id}_${zid}`] = poly;
    });
  });

  renderMapLegend();
}

function renderMapLegend() {
  const wrapper = document.querySelector('.map-wrapper');
  if (!wrapper) return;
  const existing = wrapper.querySelector('.map-legend');
  if (existing) existing.remove();

  const claimed = groups.filter(g => g.zone_ids && g.zone_ids.trim() && g.color);
  if (claimed.length === 0) return;

  const legend = document.createElement('div');
  legend.className = 'map-legend';
  legend.innerHTML = `<div class="map-legend-title">Groupes</div>` +
    claimed.map(g => `
      <div class="map-legend-item">
        <span class="map-legend-dot" style="background:${g.color}"></span>
        ${escapeHtml(g.name)}
      </div>`).join('');
  wrapper.appendChild(legend);
}

function updateEditorPreview() {
  if (editorPreview) { gtaMap.removeLayer(editorPreview); editorPreview = null; }
  if (editorPoints.length < 2) return;
  editorPreview = L.polygon(editorPoints, {
    color: '#4caf82', weight: 2, dashArray: '6,4', fillColor: '#4caf82', fillOpacity: 0.15,
  }).addTo(gtaMap);
}

function updateEditorCoordsOutput() {
  const out = document.getElementById('editorCoordsOutput');
  if (out) out.textContent = JSON.stringify(editorPoints);
}

function initMapEditor() {
  const btnToggle   = document.getElementById('btnToggleEditor');
  const zoneSelect  = document.getElementById('editorZoneSelect');
  const btnStart    = document.getElementById('btnStartDraw');
  const btnClear    = document.getElementById('btnClearDraw');
  const btnSave     = document.getElementById('btnSaveZone');
  const coordsPanel = document.getElementById('editorCoordsPanel');

  // Peupler le select des zones
  GTA_ZONES.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z.id; opt.textContent = z.name;
    zoneSelect?.appendChild(opt);
  });

  btnToggle?.addEventListener('click', () => {
    editorMode = !editorMode;
    btnToggle.textContent = editorMode ? '✕ Quitter éditeur' : '✏️ Mode édition zones';
    btnToggle.classList.toggle('active', editorMode);
    const show = editorMode ? '' : 'none';
    [zoneSelect, btnStart, btnClear, btnSave].forEach(el => { if (el) el.style.display = show; });
    if (coordsPanel) coordsPanel.style.display = editorMode ? '' : 'none';
    if (!editorMode) {
      clearEditorDraw();
      gtaMap.getContainer().classList.remove('map-editor-active');
    }
  });

  btnStart?.addEventListener('click', () => {
    editorZoneId = zoneSelect?.value;
    if (!editorZoneId) { alert('Choisissez une zone d\'abord.'); return; }
    clearEditorDraw();
    gtaMap.getContainer().classList.add('map-editor-active');
  });

  btnClear?.addEventListener('click', clearEditorDraw);

  btnSave?.addEventListener('click', () => {
    if (!editorZoneId || editorPoints.length < 3) {
      alert('Tracez au moins 3 points avant de sauvegarder.'); return;
    }
    saveCustomZone(editorZoneId, [...editorPoints]);
    const zone = GTA_ZONES.find(z => z.id === editorZoneId);
    if (zone) zone.polygon = [...editorPoints];
    alert(`Zone "${zone?.name}" sauvegardée !`);
    clearEditorDraw();
    refreshMapOverlays();
  });
}

function clearEditorDraw() {
  editorPoints = [];
  editorMarkers.forEach(m => gtaMap?.removeLayer(m));
  editorMarkers = [];
  if (editorPreview) { gtaMap?.removeLayer(editorPreview); editorPreview = null; }
  updateEditorCoordsOutput();
  gtaMap?.getContainer().classList.remove('map-editor-active');
}

// ===== DATE DISPLAY =====
function updateDate() {
  const now     = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const fmt     = now.toLocaleDateString('fr-FR', options);
  const el      = document.getElementById('dateDisplay');
  if (el) el.textContent = fmt.charAt(0).toUpperCase() + fmt.slice(1);
}

updateDate();
