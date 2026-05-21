// ===== QR MENÜ YARDIMCI FONKSİYONU =====
function getQRMenuUrl(tableId) {
  const s = DB.get('settings', {});
  if (s.qr_menu_base_url) {
    let base = s.qr_menu_base_url.trim();
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    if (!base.endsWith('qr-menu.html')) {
      base += '/qr-menu.html';
    }
    return `${base}?table=${tableId}`;
  }
  // Vercel veya başka bir genel bulut alan adında çalışıyorsa origin'i kullan
  if (window.location.origin && window.location.origin !== 'file://') {
    let pathname = window.location.pathname.replace('index.html', '');
    if (!pathname.endsWith('/')) {
      pathname += '/';
    }
    return window.location.origin + pathname + 'qr-menu.html?table=' + tableId;
  }
  // Varsayılan / Fallback (e.g. Local file open, default Vercel project placeholder)
  return `https://gohealthy-poss.vercel.app/qr-menu.html?table=${tableId}`;
}

// ===== QR MENÜ YÖNETİCİSİ =====
function renderQRManager() {
  setActivePage('qr');
  const tables = DB.get('tables', []);
  const s = DB.get('settings', {});

  const isLocalFile = window.location.protocol === 'file:';
  const hasBaseUrl = !!s.qr_menu_base_url;

  let warningHTML = '';
  if (isLocalFile && !hasBaseUrl) {
    warningHTML = `
      <div style="
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.3);
        border-radius: var(--radius);
        padding: 16px;
        margin-bottom: 20px;
        color: #ff6b6b;
        font-size: 13px;
        line-height: 1.6;
      ">
        ⚠️ <strong>Alan Adı Yapılandırması Eksik:</strong> Sistemi bilgisayarınızda yerel bir dosyadan (<code>file://</code>) çalıştırıyorsunuz. Müşterilerinizin telefonlarından menüyü görebilmeleri için lütfen <strong><a href="#" onclick="navigate('settings'); return false;" style="color:#ff8e8e; text-decoration:underline; font-weight: 700;">Ayarlar</a></strong> sayfasından <strong>QR Menü Alan Adı (Vercel URL)</strong> bilginizi girin (Örn: <code>https://gohealthy-poss.vercel.app</code>).
      </div>
    `;
  } else if (hasBaseUrl) {
    warningHTML = `
      <div style="
        background: rgba(40, 167, 69, 0.1);
        border: 1px solid rgba(40, 167, 69, 0.3);
        border-radius: var(--radius);
        padding: 16px;
        margin-bottom: 20px;
        color: #28a745;
        font-size: 13px;
        line-height: 1.6;
      ">
        ⚡ <strong>Aktif Vercel Bağlantısı:</strong> QR kodlar tanımladığınız Vercel bulut adresi üzerinden üretiliyor: <a href="${s.qr_menu_base_url}" target="_blank" style="color:#28a745; text-decoration:underline; font-weight:700;">${s.qr_menu_base_url}</a>
      </div>
    `;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">📱 QR Kod Menü Yönetimi</div>
        <div class="page-header-sub">Masalara özel QR kod etiketleri ve canlı mobil menü yönetimi</div>
      </div>
    </div>

    ${warningHTML}

    <!-- QR MENÜ GENEL BİLGİSİ -->
    <div style="
      background:linear-gradient(135deg,rgba(40,116,240,0.1),rgba(111,66,193,0.06));
      border:1px solid rgba(40,116,240,0.25);border-radius:var(--radius);
      padding:20px;margin-bottom:24px;
    ">
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
        <div style="font-size:40px;">📱</div>
        <div style="flex:1;min-width:250px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Müşteriler İçin Temassız Mobil Menü</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.6;">
            ✅ Masalara yerleştireceğiniz QR kodlar sayesinde müşterileriniz cep telefonlarından menünüzü anında inceleyebilir.<br>
            ✅ <strong>Server/Sunucu Gerektirmez:</strong> Menü güncellemeleriniz anında yansır.<br>
            ✅ Aşağıdan masayı seçip <strong>"QR Kod Kartı Üret"</strong> butonuna tıklayarak masaya özel baskı şablonunu yazdırabilirsiniz.
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${tables.map(t => {
        const qrUrl = getQRMenuUrl(t.id);
        const apiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=255-107-53&data=${encodeURIComponent(qrUrl)}`;
        
        return `
          <div class="card" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px;justify-content:space-between;">
            <div style="font-size:32px;margin-bottom:8px;">🪑</div>
            <div style="font-size:18px;font-weight:800;margin-bottom:4px;">${t.name}</div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:16px;">Kapasite: ${t.capacity} Kişilik</div>
            
            <div style="
              width:120px;height:120px;border-radius:10px;background:#fff;
              display:flex;align-items:center;justify-content:center;
              box-shadow:var(--shadow);margin-bottom:20px;padding:8px;
            ">
              <img src="${apiQrUrl}" alt="${t.name} QR" style="width:100%;height:100%;object-fit:contain;">
            </div>

            <div style="display:flex;gap:8px;width:100%;margin-top:auto;">
              <button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;" onclick="window.open('qr-menu.html?table=${t.id}', '_blank')">
                🔍 Önizle
              </button>
              <button class="btn btn-primary btn-sm" style="flex:1.5;justify-content:center;background:var(--primary);" onclick="printTableQR(${t.id})">
                🖨️ Kartı Yazdır
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function printTableQR(tableId) {
  const tables = DB.get('tables', []);
  const t = tables.find(x => x.id === tableId);
  const s = DB.get('settings', {});
  if (!t) return;

  const qrUrl = getQRMenuUrl(t.id);
  const apiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=255-107-53&data=${encodeURIComponent(qrUrl)}`;

  const win = window.open('', '_blank', 'width=500,height=700');
  win.document.write(`
    <html>
    <head>
      <title>${t.name} QR Kartı - ${s.name || 'Restoran'}</title>
      <style>
        body {
          font-family: 'Inter', system-ui, sans-serif;
          margin: 0;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8f9fa;
        }
        .qr-card {
          width: 380px;
          border: 2px solid #ff6b35;
          border-radius: 24px;
          background: #ffffff;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(255,107,53,0.1);
          text-align: center;
          box-sizing: border-box;
        }
        .logo {
          font-size: 28px;
          margin-bottom: 5px;
        }
        .brand-name {
          font-weight: 800;
          font-size: 22px;
          color: #111;
          margin-bottom: 2px;
          letter-spacing: -0.5px;
        }
        .brand-sub {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #666;
          margin-bottom: 24px;
        }
        .table-badge {
          display: inline-block;
          background: #ff6b35;
          color: white;
          font-weight: 800;
          font-size: 16px;
          padding: 8px 24px;
          border-radius: 50px;
          margin-bottom: 24px;
          box-shadow: 0 4px 10px rgba(255,107,53,0.3);
        }
        .qr-container {
          width: 200px;
          height: 200px;
          margin: 0 auto 24px auto;
          padding: 12px;
          border: 1px solid #eee;
          border-radius: 16px;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-img {
          width: 100%;
          height: 100%;
        }
        .instructions {
          font-size: 13px;
          color: #444;
          line-height: 1.6;
          margin-bottom: 0;
          font-weight: 500;
        }
        .footer-note {
          font-size: 10px;
          color: #999;
          margin-top: 20px;
        }
        @media print {
          body {
            background: none;
            padding: 0;
          }
          .qr-card {
            border: 2px solid #ff6b35 !important;
            box-shadow: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="qr-card">
        <div class="logo">🍴</div>
        <div class="brand-name">${s.name || 'Restoran'}</div>
        <div class="brand-sub">DİJİTAL QR MENÜ</div>
        
        <div class="table-badge">${t.name.toUpperCase()}</div>
        
        <div class="qr-container">
          <img class="qr-img" src="${apiQrUrl}" alt="QR Code">
        </div>
        
        <p class="instructions">
          Akıllı telefonunuzun kamerasını QR koda doğrultarak temassız menümüzü anında görüntüleyebilirsiniz.
        </p>
        
        <div class="footer-note">Kardo POS Akıllı Masa Etiket Sistemi</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  // Yazdırma işlemi için resmin yüklenmesini bekleyelim
  win.onload = function() {
    win.print();
  };
}
