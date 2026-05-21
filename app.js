// ===== ANA UYGULAMA =====

let currentPage = 'dashboard';

function setActivePage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

function navigate(page) {
  if (window._kitchenTimer) { clearInterval(window._kitchenTimer); window._kitchenTimer = null; }
  switch (page) {
    case 'dashboard':  renderDashboard(); break;
    case 'tables':     renderTables(); break;
    case 'orders':     renderOrders(); break;
    case 'menu':       renderMenu(); break;
    case 'qr':         renderQRManager(); break;
    case 'kitchen':    renderKitchen(); break;
    case 'inventory':  renderInventory(); break;
    case 'staff':      renderStaff(); break;
    case 'history':    renderHistory(); break;
    case 'reports':    renderReports(); break;
    case 'settings':   renderSettings(); break;
  }
  setActivePage(page);
  closeSidebar();
}

// Modal
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

// Toast
function showToast(msg, type = 'info') {
  const icons = { success: '✓', error: '✗', info: 'ℹ', warning: '⚠' };
  const t = document.createElement('div');
  t.className = `toast toast-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 2800);
}

// Saat
function updateClock() {
  const now = new Date();
  const el = document.getElementById('clock');
  if (el) el.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dl = document.getElementById('date-label');
  if (dl) dl.textContent = now.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// Aktif sipariş sayısını güncelle
function updateOrderBadge() {
  const count = DB.get('orders', []).filter(o => o.status !== 'closed').length;
  const badge = document.getElementById('order-badge');
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'inline' : 'none'; }
  const kitchen = DB.get('orders', []).filter(o => o.status === 'pending').length;
  const kb = document.getElementById('kitchen-badge');
  if (kb) { kb.textContent = kitchen; kb.style.display = kitchen > 0 ? 'inline' : 'none'; }
}

// Kullanıcı Kartını Güncelle (Rol ve Stil)
function updateUserCard() {
  const role = DB.get('user_role', 'manager');
  const avatarEl = document.querySelector('.user-avatar');
  const nameEl = document.querySelector('.user-name');
  const roleEl = document.querySelector('.user-role');
  
  if (role === 'boss') {
    if (avatarEl) { 
      avatarEl.textContent = '👑'; 
      avatarEl.style.background = 'linear-gradient(135deg, #ffc107, #ff9f43)'; 
      avatarEl.style.color = '#fff';
    }
    if (nameEl) nameEl.textContent = 'Patron';
    if (roleEl) roleEl.textContent = 'Canlı İzleme (Salt-Okunur)';
  } else {
    if (avatarEl) { 
      avatarEl.textContent = '💼'; 
      avatarEl.style.background = 'var(--primary)'; 
      avatarEl.style.color = '#fff';
    }
    if (nameEl) nameEl.textContent = 'Müdür';
    if (roleEl) roleEl.textContent = 'Yönetici (POS Terminali)';
  }
}

// Başlangıç
document.addEventListener('DOMContentLoaded', async () => {
  // Önce IndexedDB'den kurtarma işlemini dene
  if (typeof tryRecoveryFromIndexedDB === 'function') {
    await tryRecoveryFromIndexedDB();
  }

  initData();

  // Firebase bulut senkronizasyonunu başlat
  if (typeof initFirebaseSync === 'function') {
    initFirebaseSync();
  }

  // Kullanıcı rol kartını güncelle
  updateUserCard();

  const s = DB.get('settings', {});
  const nameEl = document.getElementById('sidebar-restaurant-name');
  if (nameEl) nameEl.textContent = s.name || 'Restoranım';

  setInterval(updateClock, 1000);
  updateClock();
  setInterval(updateOrderBadge, 5000);
  updateOrderBadge();

  // İlk sayfa
  renderDashboard();

  // Modal dışına tıklama
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
});
