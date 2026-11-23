// ===== ÇİFT KATMANLI GÜVENLİK SİSTEMİ (INDEXEDDB) =====
const IDB = {
  dbName: 'rms_backup_db',
  dbVersion: 1,
  storeName: 'backups',
  init: function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  },
  set: function(key, val) {
    return this.init().then(db => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  },
  get: function(key) {
    return this.init().then(db => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }
};

const DB = {
  get: (key, def = null) => {
    try { return JSON.parse(localStorage.getItem('rms_' + key)) ?? def; } catch { return def; }
  },
  set: (key, val) => {
    const isStateKey = ['categories', 'menu', 'tables', 'orders', 'inventory', 'staff', 'sales_history', 'settings'].includes(key);
    const role = DB.get('user_role', 'manager');
    
    // Boss modunda arayüzden veya koddan veri yazılmasını engelle (sadece bulut senkronizasyonu yazabilir)
    if (role === 'boss' && isStateKey && !window._isFirebaseSyncing) {
      console.warn('Patron (Salt-Okunur) modu aktif: Yazma işlemi engellendi ->', key);
      return;
    }

    localStorage.setItem('rms_' + key, JSON.stringify(val));
    // Her kayıtta otomatik yedek damgasını güncelle
    localStorage.setItem('rms_last_saved', new Date().toISOString());
    scheduleAutoExport();
    // IndexedDB Çift Katmanlı Yedekleme
    try { IDB.set(key, val); } catch (e) { console.warn('IDB save error:', e); }

    // Yönetici modunda bulut bağlantısı aktifse veriyi Firebase'e gönder
    if (role === 'manager' && isStateKey && window._firebaseDB) {
      try {
        window._firebaseDB.ref('rms/' + key).set(val);
      } catch (e) {
        console.error('Firebase eşitleme hatası (' + key + '):', e);
      }
    }

    // Yerel sunucu ile senkronize et
    if (role === 'manager' && isStateKey) {
      syncWithLocalServer();
    }
  },
};

// ===== YEREL SUNUCU SENKRONİZASYONU MANTIĞI =====
function syncWithLocalServer() {
  // Yerel wifi/sunucu senkronizasyonu kullanıcı talebiyle iptal edildi. Entegrasyon Vercel + Firebase üzerinden yapılmaktadır.
  return;
}

// ===== PATRON POS & BULUT ENTEGRASYONU SİSTEMİ =====
window._firebaseDB = null;
window._isFirebaseSyncing = false;

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC0R_gqqtJr38yzHCqrfJBAZe6KUQPZww0",
  authDomain: "gopos-bulut.firebaseapp.com",
  projectId: "gopos-bulut",
  storageBucket: "gopos-bulut.firebasestorage.app",
  messagingSenderId: "235741516330",
  appId: "1:235741516330:web:086388c379a3c42564a953",
  databaseURL: "https://gopos-bulut-default-rtdb.firebaseio.com"
};

function initFirebaseSync() {
  const role = DB.get('user_role', 'manager');
  let config = DB.get('firebase_config', null);

  if (!config) {
    config = DEFAULT_FIREBASE_CONFIG;
    DB.set('firebase_config', config);
  }

  if (typeof firebase === 'undefined') {
    console.warn('⚠️ Bulut Entegrasyonu: Firebase SDK bulunamadı veya yüklenemedi.');
    return;
  }

  try {
    if (firebase.apps.length > 0) {
      window._firebaseDB = firebase.database();
    } else {
      firebase.initializeApp(config);
      window._firebaseDB = firebase.database();
    }

    console.log('☁️ Bulut Entegrasyonu Başarılı! Rol:', role === 'boss' ? 'Patron (Salt-Okunur)' : 'Yönetici (POS Ana Kasa)');

    // Yönetici ise: Yerel verileri Firebase boşsa buluta yükle
    if (role === 'manager') {
      const keys = ['settings', 'categories', 'menu', 'tables', 'orders', 'inventory', 'staff', 'sales_history'];
      keys.forEach(key => {
        const val = DB.get(key);
        if (val !== null) {
          window._firebaseDB.ref('rms/' + key).once('value').then(snapshot => {
            if (!snapshot.exists()) {
              window._firebaseDB.ref('rms/' + key).set(val);
            }
          });
        }
      });
    }

    // Patron ise: Canlı olarak veritabanını dinle ve arayüzü anında güncelle
    if (role === 'boss') {
      window._firebaseDB.ref('rms').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          window._isFirebaseSyncing = true;
          try {
            for (const key in data) {
              DB.set(key, data[key]);
            }
            console.log('⚡ Bulut verileri anlık olarak güncellendi.');

            // Aktif sayfayı yeniden render et (sayfa yenilemeden canlı geçiş)
            if (typeof navigate === 'function' && typeof currentPage !== 'undefined') {
              navigate(currentPage);
            }
            if (typeof updateOrderBadge === 'function') {
              updateOrderBadge();
            }
          } catch (e) {
            console.error('Anlık güncelleme hatası:', e);
          } finally {
            window._isFirebaseSyncing = false;
          }
        }
      });
    }
  } catch (e) {
    console.error('❌ Firebase bağlantı hatası:', e);
  }
}

// ===== OTOMATİK VERİ KURTARMA (RECOVERY) =====
async function tryRecoveryFromIndexedDB() {
  const isLocalStorageEmpty = localStorage.getItem('rms_initialized') === null;
  const keys = ['settings', 'categories', 'menu', 'tables', 'orders', 'inventory', 'staff', 'sales_history', 'initialized', 'initialized_gohealthy_v2'];

  if (!isLocalStorageEmpty) {
    // LocalStorage doluysa, verileri IndexedDB ile senkronize et (güncel yedek kalsın)
    try {
      for (const k of keys) {
        const val = DB.get(k);
        if (val !== null) {
          await IDB.set(k, val);
        }
      }
    } catch (e) {
      console.warn('IndexedDB senkronizasyon hatası:', e);
    }
    return;
  }

  // LocalStorage boşsa (temizlenmişse), IndexedDB'den kurtarmayı dene
  try {
    const initialized = await IDB.get('initialized');
    if (initialized) {
      for (const k of keys) {
        const val = await IDB.get(k);
        if (val !== null) {
          localStorage.setItem('rms_' + k, JSON.stringify(val));
        }
      }
      localStorage.setItem('rms_last_saved', new Date().toISOString());
      
      // Kurtarma yapıldığına dair bayrak koy ve Toast göster
      setTimeout(() => {
        if (typeof showToast === 'function') {
          showToast('⚠️ Tarayıcı önbelleği temizlenmişti! Tüm verileriniz Çift Katmanlı Yedekleme Sisteminden (IndexedDB) otomatik kurtarıldı.', 'success');
        }
      }, 1500);
    }
  } catch (e) {
    console.error('IndexedDB otomatik kurtarma hatası:', e);
  }
}

// ===== OTOMATİK YEDEK (Her 30 dakikada bir hatırlatıcı) =====
let _autoExportTimer = null;
function scheduleAutoExport() {
  if (_autoExportTimer) return;
  _autoExportTimer = setTimeout(() => {
    _autoExportTimer = null;
    const lastReminder = localStorage.getItem('rms_last_reminder');
    const now = Date.now();
    if (!lastReminder || now - parseInt(lastReminder) > 30 * 60 * 1000) {
      localStorage.setItem('rms_last_reminder', now.toString());
    }
  }, 1000);
}

// Sayfa kapanmadan önce uyarı
window.addEventListener('beforeunload', (e) => {
  const lastSaved = localStorage.getItem('rms_last_saved');
  if (lastSaved) {
    const mins = Math.floor((Date.now() - new Date(lastSaved)) / 60000);
    if (mins < 5) {
      // Son 5 dakikada değişiklik varsa otomatik yedek oluştur
      silentAutoBackup();
    }
  }
});

// Sessiz otomatik yedek (arka planda JSON indir)
function silentAutoBackup() {
  try {
    const data = getAllData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rms-yedek-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    // Otomatik indirme YOK — sadece manuel butonla
    URL.revokeObjectURL(a.href);
  } catch (e) { /* sessiz */ }
}

function getAllData() {
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    settings:      DB.get('settings'),
    categories:    DB.get('categories'),
    menu:          DB.get('menu'),
    tables:        DB.get('tables'),
    orders:        DB.get('orders'),
    inventory:     DB.get('inventory'),
    staff:         DB.get('staff'),
    sales_history: DB.get('sales_history'),
  };
}

// ===== İLK ÇALIŞMA =====
function initData() {
  const isGoHealthy = DB.get('initialized_gohealthy_v2');
  if (!isGoHealthy) {
    DB.set('settings', {
      name: 'GO HEALTHY Kitchen',
      address: 'X-Balance Neo Padel Center, İstanbul',
      phone: '0 (212) 555 43 21',
      tax: 10,
      currency: '₺',
    });
    DB.set('categories', [
      { id: 1, name: 'Kahvaltılar & Kaseler', icon: '🥑' },
      { id: 2, name: 'Sağlıklı Kaseler & Bowl\'lar', icon: '🥗' },
      { id: 3, name: 'Dürümler & Burgerler', icon: '🌯' },
      { id: 4, name: 'Makarnalar', icon: '🍝' },
      { id: 5, name: 'İçecekler & Detokslar', icon: '🥤' },
      { id: 6, name: 'Tatlılar', icon: '🍰' },
    ]);
    DB.set('menu', [
      // 🥑 Category 1: Kahvaltılar & Kaseler
      { id: 1, catId: 1, name: 'Kahvaltı Kase', price: 360, cost: 110, active: true, desc: 'Haşlanmış yumurta, peynir çeşitleri, zeytin, avokado dilimleri, yeşillik ve kuruyemiş' },
      { id: 2, catId: 1, name: 'Avokado Ekmek', price: 390, cost: 120, active: true, desc: 'Ekşi mayalı ekmek üzerine taze ezilmiş avokado, çırpılmış yumurta ve baharatlar' },
      { id: 3, catId: 1, name: 'Porridge (Yulaf Lapası)', price: 250, cost: 60, active: true, desc: 'Yulaf lapası, taze meyveler, fıstık ezmesi, chia tohumu ve bal' },
      { id: 4, catId: 1, name: 'Sebzeli Omlet', price: 260, cost: 70, active: true, desc: '3 yumurta, mevsim sebzeleri, zeytinyağı ve beyaz peynir' },
      { id: 5, catId: 1, name: 'Magic Omlet', price: 260, cost: 75, active: true, desc: 'Mantar, ıspanak, parmesan peyniri ile hazırlanmış leziz fırın omlet' },
      { id: 6, catId: 1, name: 'Fit Menemen', price: 275, cost: 80, active: true, desc: 'Zeytinyağı, köy biberi, taze domates ve organik yumurta' },

      // 🥗 Category 2: Sağlıklı Kaseler & Bowl\'lar
      { id: 7, catId: 2, name: 'Go Healthy Kase', price: 535, cost: 160, active: true, desc: 'Kinoa, edamame, avokado, fırınlanmış nohut, brokoli, kabak ve özel tahin sos' },
      { id: 8, catId: 2, name: 'Tavuk Bowl', price: 428, cost: 130, active: true, desc: 'Izgara tavuk göğsü, karabuğday, fırın tatlı patates, yeşillik ve nar ekşili sos' },
      { id: 9, catId: 2, name: 'Köfte Bowl', price: 555, cost: 170, active: true, desc: 'Fırınlanmış fit köfte, esmer pirinç, ızgara sebzeler, yoğurt sos' },
      { id: 10, catId: 2, name: 'Kısır Kase / Bowl', price: 399, cost: 90, active: true, desc: 'Geleneksel kısır, taze nane, maydanoz, nar, marul ve zeytinyağı sos' },
      { id: 11, catId: 2, name: 'Tavuklu Salata', price: 380, cost: 110, active: true, desc: 'Izgara tavuk dilimleri, akdeniz yeşillikleri, çeri domates ve sezar sos' },
      { id: 12, catId: 2, name: 'Ton Balıklı Salata', price: 280, cost: 85, active: true, desc: 'Ton balığı, mısır, kırmızı soğan, capari, yeşillik ve limon sos' },
      { id: 13, catId: 2, name: 'Mercimekli Salata', price: 240, cost: 65, active: true, desc: 'Haşlanmış yeşil mercimek, nar, ceviz, taze soğan ve sızma zeytinyağı' },
      { id: 14, catId: 2, name: 'Semiz Otlu Aperitif', price: 210, cost: 50, active: true, desc: 'Taze semizotu, süzme yoğurt, ceviz ve pul biberli zeytinyağı' },

      // 🌯 Category 3: Dürümler & Burgerler
      { id: 15, catId: 3, name: 'Tavuklu Wrap', price: 415, cost: 120, active: true, desc: 'Kepekli lavaş, ızgara tavuk dilimleri, renkli biberler, mantar ve hafif süzme peynir sos' },
      { id: 16, catId: 3, name: 'Et Burger', price: 365, cost: 135, active: true, desc: 'Esmer burger ekmeği, 150g dana köfte, karamelize soğan, cheddar peyniri ve marul' },

      // 🍝 Category 4: Makarnalar
      { id: 17, catId: 4, name: 'Pesto Makarna', price: 371, cost: 100, active: true, desc: 'Tam buğday makarna, ev yapımı taze pesto sosu, çeri domates ve parmesan peyniri' },
      { id: 18, catId: 4, name: 'Domates Soslu Makarna', price: 371, cost: 85, active: true, desc: 'Özel baharatlı taze domates sosu, fesleğen ve zeytin dilimleri' },
      { id: 19, catId: 4, name: 'Linguine Bolonez', price: 275, cost: 95, active: true, desc: 'Linguine makarna, dana kıymalı özel bolonez sos' },

      // 🥤 Category 5: İçecekler & Detokslar
      { id: 20, catId: 5, name: 'Yeşil Detoks (Green Juice)', price: 150, cost: 40, active: true, desc: 'Ispanak, kereviz sapı, salatalık, yeşil elma ve limon' },
      { id: 21, catId: 5, name: 'Kırmızı Detoks (Red Juice)', price: 150, cost: 40, active: true, desc: 'Pancar, havuç, kırmızı elma, zencefil ve limon' },
      { id: 22, catId: 5, name: 'Turuncu Detoks (Orange Juice)', price: 150, cost: 40, active: true, desc: 'Havuç, portakal, zerdeçal ve taze zencefil' },
      { id: 23, catId: 5, name: 'Zencefil Shot (Ginger Shot)', price: 80, cost: 20, active: true, desc: 'Taze zencefil suyu ve limon' },
      { id: 24, catId: 5, name: 'Pancar Shot (Beet Shot)', price: 80, cost: 20, active: true, desc: 'Kırmızı pancar konsantresi, elma ve limon' },
      { id: 25, catId: 5, name: 'Portakal Shot', price: 80, cost: 20, active: true, desc: 'Taze portakal sıkımı ve zerdeçal' },
      { id: 26, catId: 5, name: 'Ayran (17 cl.)', price: 45, cost: 10, active: true, desc: 'Organik sütten taze çırpılmış ayran' },
      { id: 27, catId: 5, name: 'Coca-Cola Zero Sugar (33 cl.)', price: 65, cost: 15, active: true, desc: 'Kutu içecek' },
      { id: 28, catId: 5, name: 'Su (500 ml)', price: 25, cost: 4, active: true, desc: 'Doğal kaynak suyu' },
      { id: 29, catId: 5, name: 'Soda (Maden Suyu)', price: 35, cost: 8, active: true, desc: 'Doğal mineralli su' },

      // 🍰 Category 6: Tatlılar
      { id: 30, catId: 6, name: 'Fit Cheesecake', price: 185, cost: 55, active: true, desc: 'Şekersiz taban, labne dolgusu ve taze çilek soslu hafif tatlı' },
      { id: 31, catId: 6, name: 'Fit Hindistan Cevizli Cheesecake', price: 175, cost: 50, active: true, desc: 'Hindistan cevizi unu ile yapılmış glutensiz ve hafif cheesecake' },
      { id: 32, catId: 6, name: 'Fit Tiramisu', price: 185, cost: 55, active: true, desc: 'Yulaflı bisküvi, espresso aroması ve şekersiz maskarpon kreması' },
      { id: 33, catId: 6, name: 'Çilekli Meyve Kase', price: 230, cost: 70, active: true, desc: 'Taze çilek, muz, yaban mersini ve chia pudingi' },
      { id: 34, catId: 6, name: 'Go Healthy Meyveli Kase', price: 310, cost: 90, active: true, desc: 'Ejder meyvesi, kivi, çilek, ananas, chia ve badem sütlü kase' },
      { id: 35, catId: 6, name: 'Kayısılı Meyveli Kase', price: 260, cost: 75, active: true, desc: 'Kuru kayısı, incir, fındık ve süzme yoğurtlu fit kase' },
      { id: 36, catId: 6, name: 'Pankek (Taze Meyveli)', price: 230, cost: 65, active: true, desc: 'Tam buğday unundan pankek dilimleri, muz ve bal' },
      { id: 37, catId: 6, name: 'Puding (Chia tohumlu fit)', price: 160, cost: 45, active: true, desc: 'Kakao, hindistan cevizi sütü ve chia tohumlu şekersiz puding' }
    ]);

    const tables = [];
    for (let i = 1; i <= 20; i++)
      tables.push({ id:i, name:'Masa '+i, capacity: i<=10?4:6, status:'empty', orderId:null });
    DB.set('tables', tables);
    DB.set('orders', []);
    DB.set('inventory', [
      { id: 1, name: 'Avokado',       unit: 'adet',  quantity: 60,  minQty: 15, cost: 25  },
      { id: 2, name: 'Kinoa',         unit: 'kg',    quantity: 15,  minQty: 5,  cost: 140 },
      { id: 3, name: 'Tavuk Göğsü',   unit: 'kg',    quantity: 25,  minQty: 8,  cost: 130 },
      { id: 4, name: 'Köftelik Kıyma',unit: 'kg',    quantity: 20,  minQty: 6,  cost: 320 },
      { id: 5, name: 'Yeşillikler',   unit: 'demet', quantity: 80,  minQty: 20, cost: 8   },
      { id: 6, name: 'Taze Pancar',   unit: 'kg',    quantity: 15,  minQty: 4,  cost: 25  },
      { id: 7, name: 'Zencefil',      unit: 'kg',    quantity: 10,  minQty: 3,  cost: 90  },
      { id: 8, name: 'Chia Tohumu',   unit: 'kg',    quantity: 8,   minQty: 2,  cost: 180 },
      { id: 9, name: 'Yulaf Ezmesi',  unit: 'kg',    quantity: 30,  minQty: 8,  cost: 45  },
      { id: 10,name: 'Tam Buğday Unu',unit: 'kg',    quantity: 50,  minQty: 10, cost: 20  }
    ]);
    DB.set('staff', [
      { id: 1, name: 'Ahmet Yılmaz', role: 'Garson',  phone: '0532 111 22 33', salary: 22000, active: true, startDate: '2024-01-15' },
      { id: 2, name: 'Fatma Kaya',   role: 'Aşçı',    phone: '0541 444 55 66', salary: 28000, active: true, startDate: '2023-06-01' },
      { id: 3, name: 'Mehmet Demir', role: 'Kasiyer', phone: '0555 777 88 99', salary: 20000, active: true, startDate: '2024-03-10' },
      { id: 4, name: 'Ayşe Şahin',   role: 'Garson',  phone: '0546 999 00 11', salary: 22000, active: true, startDate: '2025-01-05' },
    ]);

    const sales = [];
    for (let d = 365; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const revenue = Math.floor(Math.random() * 8000) + 5000;
      sales.push({
        date:    date.toISOString().split('T')[0],
        orders:  Math.floor(Math.random() * 25) + 15,
        revenue: revenue,
        payments: {
          cash: Math.round(revenue * 0.35),
          card: Math.round(revenue * 0.45),
          sodexo: Math.round(revenue * 0.05),
          multinet: Math.round(revenue * 0.05),
          yemeksepeti: Math.round(revenue * 0.04),
          getir: Math.round(revenue * 0.04),
          trendyol: Math.round(revenue * 0.02)
        }
      });
    }
    DB.set('sales_history', sales);
    DB.set('initialized', true);
    DB.set('initialized_gohealthy_v2', true);
  }

  // Ödeme yöntemlerini otomatik başlat (eğer yoksa)
  if (DB.get('payment_methods') === null) {
    DB.set('payment_methods', [
      { id: 'cash', name: 'Nakit', icon: '💵', active: true },
      { id: 'card', name: 'Kredi Kartı', icon: '💳', active: true },
      { id: 'sodexo', name: 'Sodexo', icon: '🎟️', active: true },
      { id: 'multinet', name: 'Multinet', icon: '🎟️', active: true },
      { id: 'setcard', name: 'Setcard', icon: '🎟️', active: true },
      { id: 'yemeksepeti', name: 'Yemeksepeti', icon: '🛵', active: true },
      { id: 'getir', name: 'Getir Yemek', icon: '🛵', active: true },
      { id: 'trendyol', name: 'Trendyol Yemek', icon: '🛵', active: true }
    ]);
  }
  
  // Yerel sunucuya ilk acilista veriyi gonder
  syncWithLocalServer();
}

// ===== YARDIMCI FONKSİYONLAR =====
function genId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}
function formatCurrency(amount) {
  const s = DB.get('settings', {});
  return (s.currency || '₺') + Number(amount || 0).toFixed(2);
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
}

// ===== VERİ İÇE / DIŞA AKTAR =====
function exportData() {
  const data = getAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
  a.download = `restoran-yedek-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✓ Yedek dosyası indirildi', 'success');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.settings) throw new Error('Geçersiz dosya');
      ['settings','categories','menu','tables','orders','inventory','staff','sales_history'].forEach(k => {
        if (data[k] !== undefined) DB.set(k, data[k]);
      });
      showToast('✓ Veriler başarıyla yüklendi', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast('Hata: Geçersiz yedek dosyası', 'error');
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('⚠️ Tüm veriler silinecek! Bu işlem geri alınamaz.\n\nDevam etmek istiyor musunuz?')) return;
  if (!confirm('Son onay: Gerçekten sıfırlansın mı?')) return;
  Object.keys(localStorage).filter(k => k.startsWith('rms_')).forEach(k => localStorage.removeItem(k));
  location.reload();
}

function resetToGoHealthy() {
  if (!confirm('🌱 GO HEALTHY Menüsünü ve Örnek Verilerini yüklemek istiyor musunuz?\n\nBu işlem mevcut menü ve kategori tanımlarınızı GO HEALTHY Kitchen verileri ile güncelleyecektir.')) return;
  
  DB.set('settings', {
    name: 'GO HEALTHY Kitchen',
    address: 'X-Balance Neo Padel Center, İstanbul',
    phone: '0 (212) 555 43 21',
    tax: 10,
    currency: '₺',
  });
  
  DB.set('categories', [
    { id: 1, name: 'Kahvaltılar & Kaseler', icon: '🥑' },
    { id: 2, name: 'Sağlıklı Kaseler & Bowl\'lar', icon: '🥗' },
    { id: 3, name: 'Dürümler & Burgerler', icon: '🌯' },
    { id: 4, name: 'Makarnalar', icon: '🍝' },
    { id: 5, name: 'İçecekler & Detokslar', icon: '🥤' },
    { id: 6, name: 'Tatlılar', icon: '🍰' },
  ]);
  
  DB.set('menu', [
    // 🥑 Category 1: Kahvaltılar & Kaseler
    { id: 1, catId: 1, name: 'Kahvaltı Kase', price: 360, cost: 110, active: true, desc: 'Haşlanmış yumurta, peynir çeşitleri, zeytin, avokado dilimleri, yeşillik ve kuruyemiş' },
    { id: 2, catId: 1, name: 'Avokado Ekmek', price: 390, cost: 120, active: true, desc: 'Ekşi mayalı ekmek üzerine taze ezilmiş avokado, çırpılmış yumurta ve baharatlar' },
    { id: 3, catId: 1, name: 'Porridge (Yulaf Lapası)', price: 250, cost: 60, active: true, desc: 'Yulaf lapası, taze meyveler, fıstık ezmesi, chia tohumu ve bal' },
    { id: 4, catId: 1, name: 'Sebzeli Omlet', price: 260, cost: 70, active: true, desc: '3 yumurta, mevsim sebzeleri, zeytinyağı ve beyaz peynir' },
    { id: 5, catId: 1, name: 'Magic Omlet', price: 260, cost: 75, active: true, desc: 'Mantar, ıspanak, parmesan peyniri ile hazırlanmış leziz fırın omlet' },
    { id: 6, catId: 1, name: 'Fit Menemen', price: 275, cost: 80, active: true, desc: 'Zeytinyağı, köy biberi, taze domates ve organik yumurta' },

    // 🥗 Category 2: Sağlıklı Kaseler & Bowl\'lar
    { id: 7, catId: 2, name: 'Go Healthy Kase', price: 535, cost: 160, active: true, desc: 'Kinoa, edamame, avokado, fırınlanmış nohut, brokoli, kabak ve özel tahin sos' },
    { id: 8, catId: 2, name: 'Tavuk Bowl', price: 428, cost: 130, active: true, desc: 'Izgara tavuk göğsü, karabuğday, fırın tatlı patates, yeşillik ve nar ekşili sos' },
    { id: 9, catId: 2, name: 'Köfte Bowl', price: 555, cost: 170, active: true, desc: 'Fırınlanmış fit köfte, esmer pirinç, ızgara sebzeler, yoğurt sos' },
    { id: 10, catId: 2, name: 'Kısır Kase / Bowl', price: 399, cost: 90, active: true, desc: 'Geleneksel kısır, taze nane, maydanoz, nar, marul ve zeytinyağı sos' },
    { id: 11, catId: 2, name: 'Tavuklu Salata', price: 380, cost: 110, active: true, desc: 'Izgara tavuk dilimleri, akdeniz yeşillikleri, çeri domates ve sezar sos' },
    { id: 12, catId: 2, name: 'Ton Balıklı Salata', price: 280, cost: 85, active: true, desc: 'Ton balığı, mısır, kırmızı soğan, capari, yeşillik ve limon sos' },
    { id: 13, catId: 2, name: 'Mercimekli Salata', price: 240, cost: 65, active: true, desc: 'Haşlanmış yeşil mercimek, nar, ceviz, taze soğan ve sızma zeytinyağı' },
    { id: 14, catId: 2, name: 'Semiz Otlu Aperitif', price: 210, cost: 50, active: true, desc: 'Taze semizotu, süzme yoğurt, ceviz ve pul biberli zeytinyağı' },

    // 🌯 Category 3: Dürümler & Burgerler
    { id: 15, catId: 3, name: 'Tavuklu Wrap', price: 415, cost: 120, active: true, desc: 'Kepekli lavaş, ızgara tavuk dilimleri, renkli biberler, mantar ve hafif süzme peynir sos' },
    { id: 16, catId: 3, name: 'Et Burger', price: 365, cost: 135, active: true, desc: 'Esmer burger ekmeği, 150g dana köfte, karamelize soğan, cheddar peyniri ve marul' },

    // 🍝 Category 4: Makarnalar
    { id: 17, catId: 4, name: 'Pesto Makarna', price: 371, cost: 100, active: true, desc: 'Tam buğday makarna, ev yapımı taze pesto sosu, çeri domates ve parmesan peyniri' },
    { id: 18, catId: 4, name: 'Domates Soslu Makarna', price: 371, cost: 85, active: true, desc: 'Özel baharatlı taze domates sosu, fesleğen ve zeytin dilimleri' },
    { id: 19, catId: 4, name: 'Linguine Bolonez', price: 275, cost: 95, active: true, desc: 'Linguine makarna, dana kıymalı özel bolonez sos' },

    // 🥤 Category 5: İçecekler & Detokslar
    { id: 20, catId: 5, name: 'Yeşil Detoks (Green Juice)', price: 150, cost: 40, active: true, desc: 'Ispanak, kereviz sapı, salatalık, yeşil elma ve limon' },
    { id: 21, catId: 5, name: 'Kırmızı Detoks (Red Juice)', price: 150, cost: 40, active: true, desc: 'Pancar, havuç, kırmızı elma, zencefil ve limon' },
    { id: 22, catId: 5, name: 'Turuncu Detoks (Orange Juice)', price: 150, cost: 40, active: true, desc: 'Havuç, portakal, zerdeçal and taze zencefil' },
    { id: 23, catId: 5, name: 'Zencefil Shot (Ginger Shot)', price: 80, cost: 20, active: true, desc: 'Taze zencefil suyu ve limon' },
    { id: 24, catId: 5, name: 'Pancar Shot (Beet Shot)', price: 80, cost: 20, active: true, desc: 'Kırmızı pancar konsantresi, elma ve limon' },
    { id: 25, catId: 5, name: 'Portakal Shot', price: 80, cost: 20, active: true, desc: 'Taze portakal sıkımı ve zerdeçal' },
    { id: 26, catId: 5, name: 'Ayran (17 cl.)', price: 45, cost: 10, active: true, desc: 'Organik sütten taze çırpılmış ayran' },
    { id: 27, catId: 5, name: 'Coca-Cola Zero Sugar (33 cl.)', price: 65, cost: 15, active: true, desc: 'Kutu içecek' },
    { id: 28, catId: 5, name: 'Su (500 ml)', price: 25, cost: 4, active: true, desc: 'Doğal kaynak suyu' },
    { id: 29, catId: 5, name: 'Soda (Maden Suyu)', price: 35, cost: 8, active: true, desc: 'Doğal mineralli su' },

    // 🍰 Category 6: Tatlılar
    { id: 30, catId: 6, name: 'Fit Cheesecake', price: 185, cost: 55, active: true, desc: 'Şekersiz taban, labne dolgusu ve taze çilek soslu hafif tatlı' },
    { id: 31, catId: 6, name: 'Fit Hindistan Cevizli Cheesecake', price: 175, cost: 50, active: true, desc: 'Hindistan cevizi unu ile yapılmış glutensiz ve hafif cheesecake' },
    { id: 32, catId: 6, name: 'Fit Tiramisu', price: 185, cost: 55, active: true, desc: 'Yulaflı bisküvi, espresso aroması ve şekersiz maskarpon kreması' },
    { id: 33, catId: 6, name: 'Çilekli Meyve Kase', price: 230, cost: 70, active: true, desc: 'Taze çilek, muz, yaban mersini ve chia pudingi' },
    { id: 34, catId: 6, name: 'Go Healthy Meyveli Kase', price: 310, cost: 90, active: true, desc: 'Ejder meyvesi, kivi, çilek, ananas, chia ve badem sütlü kase' },
    { id: 35, catId: 6, name: 'Kayısılı Meyveli Kase', price: 260, cost: 75, active: true, desc: 'Kuru kayısı, incir, fındık ve süzme yoğurtlu fit kase' },
    { id: 36, catId: 6, name: 'Pankek (Taze Meyveli)', price: 230, cost: 65, active: true, desc: 'Tam buğday unundan pankek dilimleri, muz ve bal' },
    { id: 37, catId: 6, name: 'Puding (Chia tohumlu fit)', price: 160, cost: 45, active: true, desc: 'Kakao, hindistan cevizi sütü ve chia tohumlu şekersiz puding' }
  ]);
  
  DB.set('inventory', [
    { id: 1, name: 'Avokado',       unit: 'adet',  quantity: 60,  minQty: 15, cost: 25  },
    { id: 2, name: 'Kinoa',         unit: 'kg',    quantity: 15,  minQty: 5,  cost: 140 },
    { id: 3, name: 'Tavuk Göğsü',   unit: 'kg',    quantity: 25,  minQty: 8,  cost: 130 },
    { id: 4, name: 'Köftelik Kıyma',unit: 'kg',    quantity: 20,  minQty: 6,  cost: 320 },
    { id: 5, name: 'Yeşillikler',   unit: 'demet', quantity: 80,  minQty: 20, cost: 8   },
    { id: 6, name: 'Taze Pancar',   unit: 'kg',    quantity: 15,  minQty: 4,  cost: 25  },
    { id: 7, name: 'Zencefil',      unit: 'kg',    quantity: 10,  minQty: 3,  cost: 90  },
    { id: 8, name: 'Chia Tohumu',   unit: 'kg',    quantity: 8,   minQty: 2,  cost: 180 },
    { id: 9, name: 'Yulaf Ezmesi',  unit: 'kg',    quantity: 30,  minQty: 8,  cost: 45  },
    { id: 10,name: 'Tam Buğday Unu',unit: 'kg',    quantity: 50,  minQty: 10, cost: 20  }
  ]);

  DB.set('initialized_gohealthy_v2', true);
  DB.set('initialized', true);
  
  showToast('✓ GO HEALTHY Menüsü başarıyla kuruldu!', 'success');
  setTimeout(() => location.reload(), 1200);
}

function resetToKardoPreset() {
  if (!confirm('🍢 KARDO POS Türk Lezzetleri Menüsünü ve Örnek Verilerini yüklemek istiyor musunuz?\n\nBu işlem mevcut tüm menü ve kategori tanımlarınızı Kardo Kebap & Izgara verileri ile güncelleyecektir.')) return;
  
  DB.set('settings', {
    name: 'KARDO Kebap & Lahmacun',
    address: 'Kadıköy Rıhtım Caddesi No:12, İstanbul',
    phone: '0 (216) 444 19 23',
    tax: 10,
    currency: '₺',
  });
  
  DB.set('categories', [
    { id: 1, name: 'Kebaplar & Izgaralar', icon: '🍢' },
    { id: 2, name: 'Pideler & Lahmacunlar', icon: '🍕' },
    { id: 3, name: 'Çorbalar & Mezeler', icon: '🥣' },
    { id: 4, name: 'Dürümler & Burgerler', icon: '🌯' },
    { id: 5, name: 'İçecekler', icon: '🥤' },
    { id: 6, name: 'Tatlılar', icon: '🍰' }
  ]);
  
  DB.set('menu', [
    // 🍢 Kebaplar & Izgaralar
    { id: 101, catId: 1, name: 'Adana Kebap', price: 380, cost: 140, active: true, desc: 'Zırh kıymasından özel baharatlarla hazırlanan geleneksel Adana kebabı, közlenmiş biber ve domates ile' },
    { id: 102, catId: 1, name: 'Urfa Kebap', price: 380, cost: 140, active: true, desc: 'Zırh kıymasından acısız geleneksel Urfa kebabı, közlenmiş domates ve biber ile' },
    { id: 103, catId: 1, name: 'Beyti Sarma', price: 420, cost: 160, active: true, desc: 'Lavaşa sarılı kıyma kebap, özel domates sosu, tereyağı ve süzme yoğurt ile' },
    { id: 104, catId: 1, name: 'Tavuk Şiş', price: 320, cost: 110, active: true, desc: 'Marine edilmiş tavuk göğsü ızgara, pilav ve közlenmiş biber ile' },
    { id: 105, catId: 1, name: 'Kuzu Şiş', price: 480, cost: 200, active: true, desc: 'Marine edilmiş süt kuzu etleri, közlenmiş soğan, biber ve lavaş ile' },
    { id: 106, catId: 1, name: 'Karışık Kebap', price: 580, cost: 240, active: true, desc: 'Adana, Tavuk Şiş, Kuzu Şiş, Döner ve Köfte tabağı' },
    { id: 107, catId: 1, name: 'Izgara Köfte', price: 340, cost: 120, active: true, desc: 'Kardo özel baharatlı anne köftesi, patates kızartması ve pilav eşliğinde' },

    // 🍕 Pideler & Lahmacunlar
    { id: 201, catId: 2, name: 'Kardo Taş Fırın Lahmacun', price: 95, cost: 30, active: true, desc: 'İnce çıtır hamur üzerine özel kıymalı harç ve yeşillik ile' },
    { id: 202, catId: 2, name: 'Kaşarlı Pide', price: 240, cost: 80, active: true, desc: 'Bol erimiş kaşar peynirli fırın pide' },
    { id: 203, catId: 2, name: 'Kıymalı Pide', price: 260, cost: 90, active: true, desc: 'Geleneksel kıymalı fırın pide' },
    { id: 204, catId: 2, name: 'Karışık Pide', price: 290, cost: 105, active: true, desc: 'Kuşbaşılı, kıymalı ve kaşarlı enfes fırın pide' },
    { id: 205, catId: 2, name: 'Kuşbaşılı Pide', price: 290, cost: 110, active: true, desc: 'Marine edilmiş yumuşak kuşbaşı etli fırın pide' },

    // 🥣 Mezeler & Salatalar
    { id: 301, catId: 3, name: 'Süzme Mercimek Çorbası', price: 120, cost: 30, active: true, desc: 'Tereyağlı kruton ekmek ve limon dilimiyle' },
    { id: 302, catId: 3, name: 'Köz Patlıcanlı Humus', price: 150, cost: 45, active: true, desc: 'Sıcak tereyağlı köz patlıcan soslu geleneksel humus' },
    { id: 303, catId: 3, name: 'Süzme Yoğurtlu Haydari', price: 130, cost: 30, active: true, desc: 'Dereotu, taze nane ve zeytinyağlı süzme yoğurt mezesi' },
    { id: 304, catId: 3, name: 'Gavurdağı Salatası', price: 180, cost: 50, active: true, desc: 'İnce kıyılmış domates, salatalık, bol ceviz içi ve nar ekşisi sosuyla' },
    { id: 305, catId: 3, name: 'Şakşuka', price: 140, cost: 35, active: true, desc: 'Zeytinyağlı kızarmış patlıcan, biber ve domates soslu meze' },
    { id: 306, catId: 3, name: 'Narlı Cacık', price: 90, cost: 20, active: true, desc: 'Soğuk süzme yoğurt, salatalık, taze nane ve nar taneleri ile' },

    // 🌯 Dürümler & Burgerler
    { id: 401, catId: 4, name: 'Adana Dürüm', price: 240, cost: 90, active: true, desc: 'Lavaş içerisine dürüm Adana kebap, sumaklı soğan ve maydanoz' },
    { id: 402, catId: 4, name: 'Tavuk Şiş Dürüm', price: 200, cost: 70, active: true, desc: 'Lavaş içerisine tavuk şiş dürüm, domates ve marul' },
    { id: 403, catId: 4, name: 'Yaprak Et Döner Dürüm', price: 280, cost: 110, active: true, desc: 'Lavaş arası odun ateşinde pişmiş dana yaprak döner' },
    { id: 404, catId: 4, name: 'Kardo Gurme Burger', price: 290, cost: 100, active: true, desc: 'Kardo özel burger köftesi, karamelize soğan, cheddar peyniri, çıtır patates' },

    // 🥤 İçecekler
    { id: 501, catId: 5, name: 'Yayık Ayran (30 cl.)', price: 45, cost: 10, active: true, desc: 'Köpüklü soğuk yayık ayranı' },
    { id: 502, catId: 5, name: 'Şalgam Suyu (Acılı/Acısız)', price: 50, cost: 12, active: true, desc: 'Çukurova usulü soğuk şalgam suyu' },
    { id: 503, catId: 5, name: 'Coca-Cola (33 cl.)', price: 65, cost: 15, active: true, desc: 'Kutu içecek' },
    { id: 504, catId: 5, name: 'Doğal Kaynak Suyu (33 cl.)', price: 25, cost: 4, active: true, desc: 'Cam şişe su' },
    { id: 505, catId: 5, name: 'Maden Suyu (Soda)', price: 35, cost: 8, active: true, desc: 'Doğal zengin mineralli gazlı su' },
    { id: 506, catId: 5, name: 'Közde Türk Kahvesi', price: 70, cost: 12, active: true, desc: 'Yanında lokum ve su ile servis edilir' },

    // 🍰 Tatlılar
    { id: 601, catId: 6, name: 'Fırın Sütlaç', price: 140, cost: 40, active: true, desc: 'Taş fırında üzeri kızartılmış hafif sütlü tatlı' },
    { id: 602, catId: 6, name: 'Hatay Usulü Künefe', price: 190, cost: 65, active: true, desc: 'Sıcak şerbetli, sünme peynirli çıtır kadayıf tatlısı' },
    { id: 603, catId: 6, name: 'Gaziantep Fıstıklı Baklava', price: 210, cost: 70, active: true, desc: 'Tereyağlı çıtır baklava (3 adet), kaymak ile' },
    { id: 604, catId: 6, name: 'Dondurmalı Fıstıklı Katmer', price: 240, cost: 80, active: true, desc: 'İncecik katmer hamuru, bol antep fıstığı ve sade kesme dondurma' }
  ]);
  
  DB.set('inventory', [
    { id: 101, name: 'Zırh Kıyma (Dana/Kuzu)', unit: 'kg', quantity: 45, minQty: 10, cost: 350 },
    { id: 102, name: 'Tavuk Göğsü (Kuşbaşı)', unit: 'kg', quantity: 30, minQty: 8, cost: 140 },
    { id: 103, name: 'Pide/Ekmeklik Un', unit: 'kg', quantity: 80, minQty: 20, cost: 22 },
    { id: 104, name: 'Kaşar Peyniri', unit: 'kg', quantity: 25, minQty: 6, cost: 240 },
    { id: 105, name: 'Süzme Yoğurt', unit: 'kg', quantity: 20, minQty: 5, cost: 60 },
    { id: 106, name: 'Antep Fıstığı (Toz)', unit: 'kg', quantity: 10, minQty: 2, cost: 800 },
    { id: 107, name: 'Şeker (Şerbetlik)', unit: 'kg', quantity: 40, minQty: 10, cost: 30 }
  ]);

  // Satış geçmişini ödeme yöntemleri kırılımıyla oluştur
  const sales = [];
  for (let d = 365; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const orderCount = Math.floor(Math.random() * 25) + 15;
    const revenue = Math.floor(Math.random() * 12000) + 7000;
    
    sales.push({
      date: date.toISOString().split('T')[0],
      orders: orderCount,
      revenue: revenue,
      payments: {
        cash: Math.round(revenue * 0.35),
        card: Math.round(revenue * 0.45),
        sodexo: Math.round(revenue * 0.05),
        multinet: Math.round(revenue * 0.05),
        yemeksepeti: Math.round(revenue * 0.04),
        getir: Math.round(revenue * 0.04),
        trendyol: Math.round(revenue * 0.02)
      }
    });
  }
  DB.set('sales_history', sales);
  DB.set('initialized_gohealthy_v2', true);
  DB.set('initialized', true);
  
  showToast('✓ Kardo POS Menüsü ve Verileri başarıyla yüklendi!', 'success');
  setTimeout(() => location.reload(), 1200);
}

// LocalStorage kullanım miktarını hesapla
function getStorageUsage() {
  let total = 0;
  Object.keys(localStorage).filter(k => k.startsWith('rms_')).forEach(k => {
    total += (localStorage.getItem(k) || '').length;
  });
  return (total / 1024).toFixed(1); // KB
}
