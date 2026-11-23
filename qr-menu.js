// ===== QR DİJİTAL MOBİL MENÜ MANTIĞI =====

let selectedCategoryId = null;
let currentSearchQuery = '';

// URL'den Masa Numarasını al
function getTableFromURL() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get('table')) || null;
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Önce yerel/varsayılan verilerle hızlıca başlat (kesinti veya gecikme olmasın)
  initData();
  initQRMenuApp();

  // 2. Ardından Firebase Realtime Database'e bağlanıp verileri canlı/gerçek zamanlı eşitle
  initFirebaseQRMenuSync();
});

function initFirebaseQRMenuSync() {
  if (typeof firebase === 'undefined') {
    console.warn('⚠️ Bulut Entegrasyonu: Firebase SDK bulunamadı. Yerel çevrimdışı modda çalışılıyor.');
    return;
  }

  // data.js'te tanımlı olan veya kullanıcı tarafından özelleştirilmiş Firebase ayarlarını al
  const config = DB.get('firebase_config', DEFAULT_FIREBASE_CONFIG);

  try {
    let app;
    if (firebase.apps.length > 0) {
      app = firebase.app();
    } else {
      app = firebase.initializeApp(config);
    }
    const db = app.database();

    console.log('☁️ QR Menü: Bulut Veritabanı bağlantısı kuruluyor...');

    // rms düğümünü (tüm menü, kategori ve ayarları) canlı dinle
    db.ref('rms').on('value', (snapshot) => {
      const serverData = snapshot.val();
      if (serverData) {
        console.log('⚡ Bulut Verileri Alındı:', serverData);
        
        // Gelen güncel verileri yerel hafızaya kaydet
        const keys = ['settings', 'categories', 'menu', 'tables'];
        keys.forEach(k => {
          if (serverData[k] !== undefined) {
            localStorage.setItem('rms_' + k, JSON.stringify(serverData[k]));
            try { IDB.set(k, serverData[k]); } catch (e) {}
          }
        });

        // Restoran adını canlı güncelle
        const s = serverData.settings || {};
        const brandName = document.getElementById('menu-restaurant-name');
        if (brandName) brandName.textContent = s.name || 'GO HEALTHY POSS';

        // Kategorileri ve ürün listesini yenile
        renderCategoryTabs();
      }
    });
  } catch (e) {
    console.error('❌ Firebase bağlantı hatası:', e);
  }
}

function initQRMenuApp() {
  // Masa No al ve arayüzü güncelle
  const tableId = getTableFromURL();
  const tableLabel = document.getElementById('table-label');
  if (tableId) {
    const tables = DB.get('tables', []);
    const table = tables.find(t => t.id === tableId);
    tableLabel.textContent = table ? table.name.toUpperCase() : `MASA ${tableId}`;
    
    // Müşterinin gelişini Toast ile bildir
    showToast(`☀️ ${table ? table.name : 'Masa'} için dijital menümüze hoş geldiniz!`, 'success');
  } else {
    tableLabel.style.display = 'none';
  }

  // Restoran adını başlıkta güncelle
  const s = DB.get('settings', {});
  const brandName = document.getElementById('menu-restaurant-name');
  if (brandName) brandName.textContent = s.name || 'KARDO Kebap';

  // Kategorileri yükle
  renderCategoryTabs();
}

function renderCategoryTabs() {
  const categories = DB.get('categories', []);
  const bar = document.getElementById('categories-bar');
  if (!bar) return;

  if (categories.length === 0) {
    bar.innerHTML = `<div style="color:var(--text-muted);padding:10px;">Kategori tanımlanmamış.</div>`;
    return;
  }

  // İlk kategoriyi varsayılan seç
  if (!selectedCategoryId) {
    selectedCategoryId = categories[0].id;
  }

  bar.innerHTML = categories.map(c => `
    <button class="category-tab ${selectedCategoryId === c.id ? 'active' : ''}" 
      id="cat-tab-${c.id}" 
      onclick="selectCategory(${c.id})">
      <span>${c.icon}</span> ${c.name}
    </button>
  `).join('');

  // Menü listesini render et
  renderMenuItems();
}

function selectCategory(catId) {
  selectedCategoryId = catId;
  
  // Arama filtresini temizle
  currentSearchQuery = '';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  // Tab butonlarının aktifliğini güncelle
  document.querySelectorAll('.category-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeTab = document.getElementById(`cat-tab-${catId}`);
  if (activeTab) activeTab.classList.add('active');

  // Sayfa başlığını güncelle
  const categories = DB.get('categories', []);
  const currentCat = categories.find(c => c.id === catId);
  const sectionTitle = document.getElementById('section-title');
  if (sectionTitle && currentCat) {
    sectionTitle.innerHTML = `<span>${currentCat.icon}</span> ${currentCat.name}`;
  }

  renderMenuItems();
}

function renderMenuItems() {
  const menu = DB.get('menu', []).filter(m => m.active);
  const list = document.getElementById('products-list');
  if (!list) return;

  // Filtreleme (Kategoriye veya Arama Metnine Göre)
  const filtered = menu.filter(m => {
    const matchesSearch = currentSearchQuery ? m.name.toLowerCase().includes(currentSearchQuery.toLowerCase()) || (m.desc && m.desc.toLowerCase().includes(currentSearchQuery.toLowerCase())) : false;
    const matchesCategory = m.catId === selectedCategoryId;
    
    return currentSearchQuery ? matchesSearch : matchesCategory;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <div class="empty-text">Ürün Bulunamadı</div>
        <div class="empty-sub">${currentSearchQuery ? 'Arama kriterlerinize uyan bir lezzet bulamadık.' : 'Bu kategoride aktif ürün bulunmamaktadır.'}</div>
      </div>
    `;
    return;
  }

  const categories = DB.get('categories', []);

  list.innerHTML = filtered.map(m => {
    const cat = categories.find(c => c.id === m.catId);
    const catIcon = cat ? cat.icon : '🍴';
    const cleanDesc = m.desc || 'Taze malzemelerle özenle hazırlanmış enfes lezzet.';

    return `
      <div class="product-card" onclick="openProductDetail(${m.id})">
        <div class="product-details">
          <div>
            <div class="product-name">${m.name}</div>
            <div class="product-desc">${cleanDesc}</div>
          </div>
          <div class="product-footer">
            <div class="product-price">${formatCurrency(m.price)}</div>
            <div class="view-badge">
              <span>${catIcon}</span> İncele
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterMenu() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  currentSearchQuery = searchInput.value.trim();
  
  const sectionTitle = document.getElementById('section-title');
  if (sectionTitle) {
    if (currentSearchQuery) {
      sectionTitle.innerHTML = `<span>🔍</span> Arama Sonuçları: "${currentSearchQuery}"`;
      // Kategorilerdeki aktif tabı kaldır
      document.querySelectorAll('.category-tab').forEach(btn => btn.classList.remove('active'));
    } else {
      // Arama boşaltıldıysa mevcut kategoriye geri dön
      const categories = DB.get('categories', []);
      const currentCat = categories.find(c => c.id === selectedCategoryId);
      if (currentCat) {
        sectionTitle.innerHTML = `<span>${currentCat.icon}</span> ${currentCat.name}`;
        const activeTab = document.getElementById(`cat-tab-${selectedCategoryId}`);
        if (activeTab) activeTab.classList.add('active');
      }
    }
  }

  renderMenuItems();
}

function openProductDetail(menuId) {
  const menu = DB.get('menu', []);
  const item = menu.find(m => m.id === menuId);
  if (!item) return;

  const categories = DB.get('categories', []);
  const cat = categories.find(c => c.id === item.catId);

  document.getElementById('m-category').textContent = cat ? cat.name : 'LEZZET DETAYI';
  document.getElementById('m-name').textContent = item.name;
  document.getElementById('m-desc').textContent = item.desc || 'Taze malzemelerle özenle hazırlanmış, damak çatlatan geleneksel lezzet.';
  document.getElementById('m-price').textContent = formatCurrency(item.price);
  
  // Alerjen veya İçerik Uyarısı (Rastgele veya Gerçekçi Meze/Et bilgileri)
  let allergenText = 'Gluten ve laktoz içerebilir.';
  if (item.catId === 5) allergenText = 'Doğal şekerler içerir. İlave koruyucu içermez.';
  if (item.catId === 6) allergenText = 'Gluten, süt ve kuruyemiş içerir.';
  if (item.catId === 3) allergenText = 'Sarımsak, yoğurt (laktoz) içerir.';
  document.getElementById('m-allergen').textContent = allergenText;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('show');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

// Toast Mesajı Göster
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>✓</span> ${msg}`;
  container.appendChild(t);

  setTimeout(() => {
    t.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}
