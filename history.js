// ===== GEÇMİŞ SİPARİŞLER SAYFASI =====
function renderHistory() {
  setActivePage('history');
  const orders = DB.get('orders', []).filter(o => o.status === 'closed').reverse();
  const sales  = DB.get('sales_history', []);

  // Özet hesapla
  const totalRevenue = orders.reduce((s, o) => s + (o.finalTotal || o.total || 0), 0);
  const totalOrders  = orders.length;

  // Tarih filtresi state
  if (!window._histFilter) window._histFilter = 'all';

  const filterOrders = (filter) => {
    const now = new Date();
    return orders.filter(o => {
      const d = new Date(o.closedAt || o.createdAt);
      if (filter === 'today') {
        return d.toDateString() === now.toDateString();
      } else if (filter === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      } else if (filter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const renderTable = (filtered) => {
    if (filtered.length === 0) return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">Bu dönemde kapalı sipariş yok</div>
      </div>`;
    return `
      <table class="data-table">
        <thead>
          <tr><th>#</th><th>Masa</th><th>Tarih</th><th>Saat</th><th>Ürünler</th><th>Tutar</th><th>İşlem</th></tr>
        </thead>
        <tbody>
          ${filtered.map(o => {
            const total = o.finalTotal || o.total || 0;
            const date  = new Date(o.closedAt || o.createdAt);
            return `
              <tr>
                <td style="color:var(--text3);">#${o.id}</td>
                <td><strong>${o.tableName}</strong></td>
                <td>${date.toLocaleDateString('tr-TR')}</td>
                <td>${date.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'})}</td>
                <td style="color:var(--text2);">${(o.items||[]).length} ürün</td>
                <td style="font-weight:700;color:var(--success);">${formatCurrency(total)}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="showOrderDetail(${o.id})">📋 Detay</button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  };

  const current = filterOrders(window._histFilter);
  const currentRevenue = current.reduce((s,o) => s + (o.finalTotal||o.total||0), 0);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">📋 Sipariş Geçmişi</div>
        <div class="page-header-sub">Tüm zamanlar: ${totalOrders} sipariş · ${formatCurrency(totalRevenue)} toplam ciro</div>
      </div>
      <button class="btn btn-primary" onclick="exportData()">📤 Excel/JSON Yedek</button>
    </div>

    <div class="tabs" id="hist-tabs">
      <button class="tab-btn ${window._histFilter==='today'?'active':''}"  onclick="histFilter('today',this)">Bugün</button>
      <button class="tab-btn ${window._histFilter==='week'?'active':''}"   onclick="histFilter('week',this)">Bu Hafta</button>
      <button class="tab-btn ${window._histFilter==='month'?'active':''}"  onclick="histFilter('month',this)">Bu Ay</button>
      <button class="tab-btn ${window._histFilter==='all'?'active':''}"    onclick="histFilter('all',this)">Tümü</button>
    </div>

    <div class="stats-grid" style="margin-bottom:20px;">
      <div class="stat-card green">
        <div class="stat-icon">💰</div>
        <div class="stat-value" id="hist-rev">${formatCurrency(currentRevenue)}</div>
        <div class="stat-label">Dönem Cirosu</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">🧾</div>
        <div class="stat-value" id="hist-cnt">${current.length}</div>
        <div class="stat-label">Sipariş Sayısı</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">📈</div>
        <div class="stat-value" id="hist-avg">${current.length > 0 ? formatCurrency(currentRevenue/current.length) : formatCurrency(0)}</div>
        <div class="stat-label">Ortalama Sipariş</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-icon">💾</div>
        <div class="stat-value">${getStorageUsage()} KB</div>
        <div class="stat-label">Kayıtlı Veri</div>
      </div>
    </div>

    <div class="card" style="overflow:hidden;" id="hist-table-card">
      ${renderTable(current)}
    </div>
  `;

  window._histRenderTable = renderTable;
}

function histFilter(filter, btn) {
  window._histFilter = filter;
  document.querySelectorAll('#hist-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Yeniden hesapla
  const orders = DB.get('orders', []).filter(o => o.status === 'closed').reverse();
  const now = new Date();
  const filtered = orders.filter(o => {
    const d = new Date(o.closedAt || o.createdAt);
    if (filter === 'today')  return d.toDateString() === now.toDateString();
    if (filter === 'week')   { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
    if (filter === 'month')  return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    return true;
  });

  const rev = filtered.reduce((s,o) => s + (o.finalTotal||o.total||0), 0);
  document.getElementById('hist-rev').textContent = formatCurrency(rev);
  document.getElementById('hist-cnt').textContent = filtered.length;
  document.getElementById('hist-avg').textContent = filtered.length > 0 ? formatCurrency(rev/filtered.length) : formatCurrency(0);
  document.getElementById('hist-table-card').innerHTML = window._histRenderTable(filtered);
}

function showOrderDetail(orderId) {
  const orders = DB.get('orders', []);
  const o = orders.find(o => o.id === orderId);
  if (!o) return;
  const s = DB.get('settings', {});
  const tax = (o.total||0) * (s.tax||8) / 100;
  const total = o.finalTotal || (o.total||0) + tax;
  const date = new Date(o.closedAt || o.createdAt);

  showModal(`
    <div class="modal-header">
      <div class="modal-title">📋 Sipariş Detayı — ${o.tableName}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="display:flex;gap:20px;margin-bottom:16px;font-size:13px;">
      <div><span style="color:var(--text3);">Sipariş #</span> <strong>${o.id}</strong></div>
      <div><span style="color:var(--text3);">Tarih:</span> <strong>${date.toLocaleDateString('tr-TR')}</strong></div>
      <div><span style="color:var(--text3);">Saat:</span> <strong>${date.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</strong></div>
    </div>
    <table class="data-table" style="margin-bottom:16px;">
      <thead><tr><th>Ürün</th><th>Adet</th><th>Birim</th><th>Toplam</th></tr></thead>
      <tbody>
        ${(o.items||[]).map(i => `
          <tr>
            <td>${i.name}</td>
            <td>${i.qty}</td>
            <td>${formatCurrency(i.price)}</td>
            <td style="font-weight:600;">${formatCurrency(i.qty*i.price)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:6px;font-size:14px;">
      <div style="display:flex;justify-content:space-between;color:var(--text2);">
        <span>Ara Toplam</span><span>${formatCurrency(o.total||0)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:var(--text2);">
        <span>KDV (%${s.tax||8})</span><span>${formatCurrency(tax)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:var(--primary);margin-top:8px;">
        <span>TOPLAM</span><span>${formatCurrency(total)}</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Kapat</button>
      <button class="btn btn-primary" onclick="printBill(${o.id});closeModal()">🖨️ Yazdır</button>
    </div>
  `);
}

// ===== GÜNCELLENMİŞ AYARLAR SAYFASI =====
// ===== GÜNCELLENMİŞ AYARLAR SAYFASI =====
function renderSettings() {
  setActivePage('settings');
  const s = DB.get('settings', {});
  const lastSaved = localStorage.getItem('rms_last_saved');
  const storageKB = getStorageUsage();

  const currentRole = DB.get('user_role', 'manager');
  const config = DB.get('firebase_config', null);
  const configStr = config ? JSON.stringify(config, null, 2) : '';

  let cloudStatusHTML = '';
  if (window._firebaseDB) {
    cloudStatusHTML = `<span class="badge badge-success" style="font-size:11px;padding:3px 8px;border-radius:20px;font-weight:700;">🟢 Canlı Bulut Aktif</span>`;
  } else if (config) {
    cloudStatusHTML = `<span class="badge badge-danger" style="font-size:11px;padding:3px 8px;border-radius:20px;font-weight:700;">🔴 Çevrimdışı</span>`;
  } else {
    cloudStatusHTML = `<span class="badge badge-info" style="font-size:11px;padding:3px 8px;border-radius:20px;font-weight:700;">⚪ Yapılandırılmadı</span>`;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-title">⚙️ Ayarlar & Veri Güvenliği</div>
    </div>

    <!-- VERİ GÜVENLİĞİ UYARISI -->
    <div style="
      background:linear-gradient(135deg,rgba(255,193,7,0.12),rgba(255,107,53,0.08));
      border:1px solid rgba(255,193,7,0.3);border-radius:var(--radius);
      padding:20px;margin-bottom:24px;
    ">
      <div style="font-size:15px;font-weight:700;margin-bottom:10px;">🔒 Veri Güvenliği Bilgisi</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.7;">
        ✅ Verileriniz bu bilgisayarın tarayıcısında <strong>kalıcı olarak</strong> saklanmaktadır.<br>
        ✅ Bilgisayar kapatılsa bile veriler kaybolmaz.<br>
        ⚠️ Tarayıcı geçmişi/önbellek <strong>temizlenirse</strong> veriler silinebilir.<br>
        💡 <strong>Önerimiz:</strong> Her gün iş bitiminde aşağıdaki "Günlük Yedek Al" butonuna tıklayın.
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="exportData()">📥 Şimdi Yedek Al</button>
        <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">📤 Yedeği Geri Yükle</button>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(this.files[0])">
      </div>
    </div>

    <div class="grid-2" style="gap:20px;">
      <!-- SOL SÜTUN -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- RESTORAN BİLGİLERİ -->
        <div class="card">
          <div class="card-header"><div class="card-title">🏪 Restoran Bilgileri</div></div>
          <div class="form-group">
            <label class="form-label">Restoran Adı</label>
            <input class="form-control" id="s-name" value="${s.name||''}" placeholder="Restoran adı">
          </div>
          <div class="form-group">
            <label class="form-label">Adres</label>
            <input class="form-control" id="s-addr" value="${s.address||''}" placeholder="Adres">
          </div>
          <div class="form-group">
            <label class="form-label">Telefon</label>
            <input class="form-control" id="s-phone" value="${s.phone||''}" placeholder="0 (5xx) xxx xx xx">
          </div>
          <div class="form-group">
            <label class="form-label">QR Menü Alan Adı (Vercel URL)</label>
            <input class="form-control" id="s-qr-url" value="${s.qr_menu_base_url||''}" placeholder="https://gohealthy-poss.vercel.app">
            <small style="color:var(--text3);font-size:11px;">Müşterilerin QR menüyü göreceği Vercel web sitesi adresiniz.</small>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">KDV Oranı (%)</label>
              <input class="form-control" id="s-tax" type="number" value="${s.tax||8}" min="0" max="100">
            </div>
            <div class="form-group">
              <label class="form-label">Para Birimi</label>
              <select class="form-control" id="s-currency">
                <option ${s.currency==='₺'?'selected':''}>₺</option>
                <option ${s.currency==='$'?'selected':''}>$</option>
                <option ${s.currency==='€'?'selected':''}>€</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" onclick="saveSettings()">💾 Kaydet</button>
        </div>

        <!-- ☁️ PATRON POS & BULUT ENTEGRASYONU -->
        <div class="card" style="background:linear-gradient(135deg,rgba(40,116,240,0.06),rgba(111,66,193,0.06));border:1px solid rgba(40,116,240,0.25);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="font-size:16px;font-weight:700;">☁️ Patron POS & Bulut Entegrasyonu</div>
            ${cloudStatusHTML}
          </div>
          
          <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:14px;background:rgba(40,116,240,0.1);padding:10px 14px;border-radius:8px;">
            📱 Telefonunuzdan canlı takip yapabilmek için sistemi Google Firebase veritabanı ile eşleştirin. 
            Bu entegrasyon <strong>%100 ücretsizdir</strong> ve sunucu kurma zahmeti gerektirmez.
          </div>

          <div class="form-group">
            <label class="form-label">Kullanıcı Rolü</label>
            <select class="form-control" id="s-role">
              <option value="manager" ${currentRole==='manager'?'selected':''}>💼 Yönetici (POS Terminali - Ana Kasa)</option>
              <option value="boss" ${currentRole==='boss'?'selected':''}>👑 Patron (Cep Telefonu - Salt-Okunur)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Firebase Yapılandırma Kodu (firebaseConfig)</label>
            <textarea class="form-control" id="s-firebase-config" rows="6" style="font-family:monospace;font-size:11px;" placeholder="const firebaseConfig = {\n  apiKey: '...',\n  databaseURL: '...',\n  ...\n};">${configStr}</textarea>
          </div>

          <div style="font-size:11px;color:var(--text3);margin-bottom:14px;line-height:1.6;border-top:1px solid var(--border);padding-top:12px;">
            💡 <strong>Hızlı Kurulum Rehberi (Ücretsiz):</strong><br>
            1. <a href="https://console.firebase.google.com/" target="_blank" style="color:var(--primary);text-decoration:underline;">Firebase Konsolu</a>'nda ücretsiz proje açın.<br>
            2. Web Uygulaması (</>) ekleyip yapılandırma kodunun tamamını kopyalayıp buraya yapıştırın.<br>
            3. Sol menüden <strong>Realtime Database</strong> oluşturun ve Kurallar (Rules) sekmesinde <code>".read": true, ".write": true</code> olarak ayarlayıp yayınlayın.
          </div>

          <button class="btn btn-primary" onclick="saveCloudSettings()" style="width:100%;justify-content:center;background:var(--primary);">
            ☁️ Bulut Bağlantısını Kur ve Kaydet
          </button>
        </div>
      </div>

      <!-- SAĞ SÜTUN -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- SİSTEM DURUMU -->
        <div class="card">
          <div class="card-header"><div class="card-title">📊 Sistem Durumu</div></div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;">
            ${[
              ['Toplam Sipariş', DB.get('orders',[]).length + ' adet'],
              ['Kapalı Sipariş', DB.get('orders',[]).filter(o=>o.status==='closed').length + ' adet'],
              ['Menü Ürünleri',  DB.get('menu',[]).length + ' ürün'],
              ['Masalar',        DB.get('tables',[]).length + ' masa'],
              ['Personel',       DB.get('staff',[]).length + ' kişi'],
              ['Kayıtlı Veri',   storageKB + ' KB'],
              ['Son Kayıt',      lastSaved ? new Date(lastSaved).toLocaleString('tr-TR') : 'Bilgi yok'],
              ['Versiyon',       'v2.0.0'],
            ].map(([label, val]) => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                <span style="color:var(--text3);">${label}</span>
                <strong>${val}</strong>
              </div>`).join('')}
          </div>
        </div>

        <!-- 💳 ÖDEME YÖNTEMLERİ -->
        <div class="card">
          <div class="card-header"><div class="card-title">💳 Ödeme Yöntemleri</div></div>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">
            ${(DB.get('payment_methods') || []).map(pm => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px dashed var(--border);">
                <span>${pm.icon} ${pm.name}</span>
                <label class="switch-container" style="position:relative;display:inline-block;width:34px;height:20px;">
                  <input type="checkbox" ${pm.active ? 'checked' : ''} 
                    ${currentRole === 'boss' ? 'disabled' : ''} 
                    onchange="togglePaymentMethod('${pm.id}', this.checked)"
                    style="opacity:0;width:0;height:0;margin:0;">
                  <span style="
                    position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;
                    background-color:${pm.active ? 'var(--primary)' : '#555'};
                    transition:.4s;border-radius:20px;
                  ">
                    <span style="
                      position:absolute;content:'';height:14px;width:14px;left:3px;bottom:3px;
                      background-color:white;transition:.4s;border-radius:50%;
                      transform:${pm.active ? 'translateX(14px)' : 'translateX(0)'};
                    "></span>
                  </span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- VERİ İŞLEMLERİ -->
        <div class="card">
          <div class="card-header"><div class="card-title">🗄️ Veri İşlemleri</div></div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-success" onclick="exportData()" style="justify-content:center;">
              📥 Günlük Yedek Al (JSON)
            </button>
            <button class="btn btn-secondary" onclick="document.getElementById('import-file2').click()" style="justify-content:center;">
              📤 Yedeği Geri Yükle
            </button>
            <input type="file" id="import-file2" accept=".json" style="display:none" onchange="importData(this.files[0])">
            <div style="font-size:11px;color:var(--text3);padding:8px;background:var(--bg3);border-radius:6px;line-height:1.5;">
              💡 Yedek dosyasını <strong>Belgeler</strong> veya <strong>Masaüstü</strong> klasörüne kaydedin.
              Her ay yedek klasörü oluşturmanızı öneririz.
            </div>
            <button class="btn btn-success" onclick="resetToKardoPreset()" style="justify-content:center;margin-top:4px;background:#28a745;">
              🍢 KARDO POS Menüsünü Kur
            </button>
            <button class="btn btn-success" onclick="resetToGoHealthy()" style="justify-content:center;margin-top:4px;">
              🌱 GO HEALTHY Menüsünü Kur
            </button>
            <button class="btn btn-danger" onclick="resetData()" style="justify-content:center;margin-top:4px;">
              🗑️ Tüm Verileri Sıfırla
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveCloudSettings() {
  const role = document.getElementById('s-role').value;
  const configRaw = document.getElementById('s-firebase-config').value.trim();
  
  if (configRaw) {
    const configParsed = parseFirebaseConfig(configRaw);
    if (!configParsed || !configParsed.apiKey || !configParsed.databaseURL) {
      showToast('❌ Geçersiz Firebase yapılandırması! apiKey ve databaseURL alanları bulunamadı.', 'error');
      return;
    }
    DB.set('firebase_config', configParsed);
  } else {
    // Config kaldırılırsa
    localStorage.removeItem('rms_firebase_config');
  }
  
  DB.set('user_role', role);
  showToast('✓ Bulut bağlantı ayarları kaydedildi. Bağlantı kuruluyor...', 'success');
  
  setTimeout(() => {
    location.reload();
  }, 1200);
}

function parseFirebaseConfig(inputText) {
  let parsed = null;
  try {
    parsed = JSON.parse(inputText);
  } catch (e) {
    // Metin içinden firebaseConfig = { ... } kısmını çıkarmayı dene
    const matches = inputText.match(/(\{[\s\S]*?apiKey[\s\S]*?\})/i);
    if (matches && matches[1]) {
      try {
        let clean = matches[1]
          .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":') // Anahtarları tırnağa al
          .replace(/'/g, '"') // Tek tırnakları çift tırnak yap
          .replace(/"\s*\+\s*"/g, '') // JS birleştirmelerini temizle
          .replace(/,\s*([\}\]])/g, '$1'); // Sondaki virgülleri temizle
        parsed = JSON.parse(clean);
      } catch (err) {
        console.warn('Firebase config regex parsing failed:', err);
      }
    }
  }
  
  if (parsed && parsed.projectId && !parsed.databaseURL) {
    parsed.databaseURL = `https://${parsed.projectId}-default-rtdb.firebaseio.com`;
  }
  return parsed;
}

function saveSettings() {
  DB.set('settings', {
    name:             document.getElementById('s-name').value.trim(),
    address:          document.getElementById('s-addr').value.trim(),
    phone:            document.getElementById('s-phone').value.trim(),
    tax:              parseFloat(document.getElementById('s-tax').value) || 8,
    currency:         document.getElementById('s-currency').value,
    qr_menu_base_url: document.getElementById('s-qr-url').value.trim(),
  });
  const el = document.getElementById('sidebar-restaurant-name');
  if (el) el.textContent = document.getElementById('s-name').value.trim();
  showToast('Ayarlar kaydedildi ✓', 'success');
}

function togglePaymentMethod(id, active) {
  const currentRole = DB.get('user_role', 'manager');
  if (currentRole === 'boss') {
    showToast('⚠️ Patron (Salt-Okunur) modunda ödeme yöntemi değiştirilemez!', 'error');
    renderSettings();
    return;
  }
  const methods = DB.get('payment_methods', []);
  const pm = methods.find(x => x.id === id);
  if (pm) {
    pm.active = active;
    DB.set('payment_methods', methods);
    showToast(`✓ ${pm.name} ödeme yöntemi ${active ? 'aktif' : 'pasif'} edildi.`, 'success');
    renderSettings();
  }
}
