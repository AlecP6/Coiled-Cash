// ===== CONFIG =====
const API = 'http://localhost:3001/api';

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
  refreshComptabilite();
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

// Restore session on load
const saved = getStoredSession();
if (saved) {
  loginUser(saved.token, saved.user);
} else {
  showAuthOverlay();
}

// ===== NAVIGATION =====
const navItems    = document.querySelectorAll('.nav-item');
const sections    = document.querySelectorAll('.section');
const topbarTitle = document.getElementById('topbarTitle');

const sectionTitles = {
  'comptabilite':  'Comptabilité',
  'armement':      'Armement',
  'groupes':       'Groupes',
  'resume-tables': 'Résumé Tables',
  'vehicule':      'Véhicule',

};

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
      populateVehicleAssignSelect();
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
    // Pre-select current assignee
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

function openGroupModal(group) {
  document.getElementById('groupModalTitle').textContent = group ? `Modifier : ${group.name}` : 'Nouveau groupe';
  document.getElementById('groupEditId').value    = group?.id ?? '';
  document.getElementById('groupName').value      = group?.name      ?? '';
  document.getElementById('groupResidence').value = group?.residence ?? '';
  document.getElementById('groupTerritory').value = group?.territory ?? '';
  document.getElementById('groupBusiness').value  = group?.business  ?? '';
  document.getElementById('groupCompany').value   = group?.company   ?? '';
  document.getElementById('groupNotes').value     = group?.notes     ?? '';
  document.getElementById('groupError').textContent = '';
  openModal('groupModal');
}

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

  const body = { name, residence, territory, business, company, notes };
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

// ===== DATE DISPLAY =====
function updateDate() {
  const now     = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const fmt     = now.toLocaleDateString('fr-FR', options);
  const el      = document.getElementById('dateDisplay');
  if (el) el.textContent = fmt.charAt(0).toUpperCase() + fmt.slice(1);
}

updateDate();
