// ===== DASHBOARD =====
function renderDashboard() {
  const orders = DB.get('orders', []);
  const sales = DB.get('sales_history', []);
  const tables = DB.get('tables', []);
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.find(s => s.date === today) || { revenue: 0, orders: 0 };
  const activeOrders = orders.filter(o => o.status !== 'closed');
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const yesterday = sales[sales.length - 2];
  const revChange = yesterday ? ((todaySales.revenue - yesterday.revenue) / (yesterday.revenue || 1) * 100).toFixed(1) : 0;

  const recentOrders = orders.slice(-5).reverse();
  const inventory = DB.get('inventory', []);
  const lowStock = inventory.filter(i => i.quantity <= i.minQty);

  const isBoss = DB.get('user_role', 'manager') === 'boss';
  const headerButtonsHTML = isBoss ? `
    <span class="badge badge-success" style="padding:8px 16px;font-size:12px;border-radius:20px;font-weight:700;">👑 Patron Modu (Salt-Okunur)</span>
  ` : `
    <div style="display:flex;gap:10px;">
      <button class="btn btn-success" onclick="endOfDayModal()">☀️ Gün Sonu Yap</button>
      <button class="btn btn-primary" onclick="renderOrders()">➕ Yeni Sipariş</button>
    </div>
  `;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">📊 Dashboard</div>
        <div class="page-header-sub">${new Date().toLocaleDateString('tr-TR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
      </div>
      ${headerButtonsHTML}
    </div>

    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${formatCurrency(todaySales.revenue)}</div>
        <div class="stat-label">Bugünkü Gelir</div>
        <div class="stat-change ${revChange >= 0 ? 'up' : 'down'}">
          ${revChange >= 0 ? '▲' : '▼'} %${Math.abs(revChange)} dünden
        </div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">🧾</div>
        <div class="stat-value">${todaySales.orders}</div>
        <div class="stat-label">Bugünkü Siparişler</div>
        <div class="stat-change up">▲ Aktif: ${activeOrders.length}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">🪑</div>
        <div class="stat-value">${occupiedTables}/${tables.length}</div>
        <div class="stat-label">Dolu Masalar</div>
        <div class="stat-change ${occupiedTables > 0 ? 'up' : ''}">
          %${Math.round(occupiedTables/tables.length*100)} doluluk
        </div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${lowStock.length}</div>
        <div class="stat-label">Düşük Stok Uyarısı</div>
        <div class="stat-change ${lowStock.length > 0 ? 'down' : 'up'}">
          ${lowStock.length > 0 ? '⚠️ Kontrol gerekli' : '✓ Stok iyi durumda'}
        </div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px;">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📈 Son 7 Günlük Gelir</div>
            <div class="card-subtitle">Günlük ciro takibi</div>
          </div>
        </div>
        <canvas id="revenueChart" height="180"></canvas>
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🧾 Son Siparişler</div>
            <div class="card-subtitle">${recentOrders.length} sipariş</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="renderOrders()">Tümü</button>
        </div>
        ${recentOrders.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🧾</div>
            <div class="empty-text">Henüz sipariş yok</div>
          </div>` : `
        <table class="data-table">
          <thead><tr><th>Masa</th><th>Tutar</th><th>Durum</th><th>Saat</th></tr></thead>
          <tbody>
            ${recentOrders.map(o => `
              <tr>
                <td><strong>${o.tableName}</strong></td>
                <td>${formatCurrency(o.total || 0)}</td>
                <td><span class="badge badge-${o.status === 'closed' ? 'success' : o.status === 'ready' ? 'warning' : 'info'}">${statusLabel(o.status)}</span></td>
                <td>${formatTime(o.createdAt)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>

    <div class="grid-2" style="gap:20px;margin-top:20px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">🪑 Masa Durumu</div>
          <button class="btn btn-secondary btn-sm" onclick="renderTables()">Yönet</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
          ${tables.slice(0,20).map(t => `
            <div onclick="renderTables()" style="
              background:${t.status === 'occupied' ? 'rgba(255,107,53,0.2)' : t.status === 'reserved' ? 'rgba(255,193,7,0.15)' : 'var(--bg3)'};
              border:1px solid ${t.status === 'occupied' ? 'var(--primary)' : t.status === 'reserved' ? 'var(--warning)' : 'var(--border)'};
              border-radius:8px;padding:8px;text-align:center;cursor:pointer;
              transition:all 0.2s;font-size:12px;
            ">
              <div style="font-size:16px;">${t.status === 'occupied' ? '🔴' : t.status === 'reserved' ? '🟡' : '🟢'}</div>
              <div style="font-weight:600;margin-top:2px;">${t.id}</div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text3);">
          <span>🟢 Boş: ${tables.filter(t=>t.status==='empty').length}</span>
          <span>🔴 Dolu: ${tables.filter(t=>t.status==='occupied').length}</span>
          <span>🟡 Rezerve: ${tables.filter(t=>t.status==='reserved').length}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚠️ Düşük Stok</div>
          <button class="btn btn-secondary btn-sm" onclick="renderInventory()">Stok Yönetimi</button>
        </div>
        ${lowStock.length === 0 ? `
          <div class="alert alert-success">✓ Tüm stoklar yeterli seviyede</div>` :
          lowStock.map(i => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-size:13px;font-weight:600;">${i.name}</div>
                <div style="font-size:11px;color:var(--text3);">Min: ${i.minQty} ${i.unit}</div>
              </div>
              <div style="text-align:right;">
                <div style="color:var(--danger);font-weight:700;">${i.quantity} ${i.unit}</div>
                <div style="font-size:11px;color:var(--text3);">Kalan</div>
              </div>
            </div>`).join('')
        }
      </div>
    </div>
  `;

  // Grafik
  setTimeout(() => {
    const last7 = sales.slice(-7);
    const ctx = document.getElementById('revenueChart');
    if (ctx && window.Chart) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: last7.map(s => new Date(s.date).toLocaleDateString('tr-TR', { day:'2-digit', month:'short' })),
          datasets: [{
            label: 'Gelir (₺)',
            data: last7.map(s => s.revenue),
            backgroundColor: 'rgba(255,107,53,0.7)',
            borderColor: 'var(--primary)',
            borderWidth: 2,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#A8ADCE' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#A8ADCE' } }
          }
        }
      });
    }
  }, 100);
}

function statusLabel(s) {
  return { pending: 'Bekliyor', preparing: 'Hazırlanıyor', ready: 'Hazır', closed: 'Kapalı' }[s] || s;
}

// ===== GÜN SONU & OTOMATİK FİZİKSEL YEDEKLEME SİSTEMİ =====
function endOfDayModal() {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Gün sonu kapatması yapılamaz (Salt-Okunur)', 'warning');
    return;
  }
  const orders = DB.get('orders', []);
  const sales = DB.get('sales_history', []);
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Bugüne ait kapatılmış siparişlerin cirosu
  const todayClosedOrders = orders.filter(o => o.status === 'closed' && (o.closedAt && o.closedAt.startsWith(todayStr)));
  const currentSessionRevenue = todayClosedOrders.reduce((s, o) => s + (o.finalTotal || o.total || 0), 0);
  const currentSessionOrdersCount = todayClosedOrders.length;
  
  // Bugüne ait kaydedilmiş genel geçmiş cirosu
  const todayHistoryEntry = sales.find(s => s.date === todayStr) || { revenue: 0, orders: 0 };
  
  // Toplam Bugünkü Gelir (Session + önceden kaydedilmiş)
  const totalRevenue = Math.max(currentSessionRevenue, todayHistoryEntry.revenue);
  const totalOrders = Math.max(currentSessionOrdersCount, todayHistoryEntry.orders);
  
  const activeOrders = orders.filter(o => o.status !== 'closed').length;
  const tables = DB.get('tables', []);
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;

  showModal(`
    <div class="modal-header">
      <div class="modal-title">☀️ Gün Sonu Raporu & Yedekleme</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:48px;margin-bottom:12px;">☀️</div>
      <h3 style="margin-bottom:6px;font-weight:800;color:var(--text);">Restoranda Günü Sonlandırın</h3>
      <p style="font-size:12px;color:var(--text3);">${new Date().toLocaleDateString('tr-TR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
    </div>
    
    <div style="
      background:var(--bg3);border-radius:10px;padding:16px;
      margin:16px 0;display:flex;flex-direction:column;gap:12px;
      border:1px solid var(--border);
    ">
      <div style="display:flex;justify-content:space-between;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:8px;">
        <span style="color:var(--text2);">Toplam Bugünkü Ciro:</span>
        <strong style="color:var(--success);font-size:16px;">${formatCurrency(totalRevenue)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:8px;">
        <span style="color:var(--text2);">Kapatılan Fiş Sayısı:</span>
        <strong>${totalOrders} adet</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:8px;">
        <span style="color:var(--text2);">Aktif Açık Masalar:</span>
        <strong style="color:${activeOrders > 0 ? 'var(--warning)' : 'var(--success)'};">${activeOrders} adet masada hesap açık</strong>
      </div>
    </div>

    ${activeOrders > 0 ? `
      <div class="alert alert-warning" style="font-size:12px;margin-bottom:16px;line-height:1.5;">
        ⚠️ <strong>Dikkat!</strong> Henüz hesabı kapatılmamış <strong>${activeOrders} adet aktif sipariş</strong> bulunuyor. Günü kapatmadan önce bu masaların hesaplarını kapatmanızı öneririz.
      </div>
    ` : `
      <div class="alert alert-success" style="font-size:12px;margin-bottom:16px;line-height:1.5;">
        ✓ Tüm masalar kapatıldı. Sistem gün sonu işlemlerine tamamen hazır!
      </div>
    `}

    <div style="font-size:11px;color:var(--text3);line-height:1.6;margin-bottom:16px;background:rgba(32,201,151,0.08);padding:10px;border-radius:6px;border:1px solid rgba(32,201,151,0.2);">
      💡 <strong>Güvenlik Bilgisi:</strong> "Günü Kapat ve Verileri İndir" butonuna bastığınızda, günün finansal özeti kapatılacak, tüm verileriniz IndexedDB'de kalıcı yedeklenecek ve bilgisayarınızın diskine **kardopos-yedek-tarih.json** dosyası otomatik olarak indirilecektir.
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-success" onclick="confirmEndOfDay(${totalRevenue}, ${totalOrders})">☀️ Günü Kapat ve Verileri İndir</button>
    </div>
  `);
}

function confirmEndOfDay(revenue, ordersCount) {
  if (DB.get('user_role', 'manager') === 'boss') return;
  // Günü kapat
  closeModal();
  
  // 1. Önce veriyi dışa aktar (JSON Yedek İndirme)
  exportData();
  
  // 2. Bir de şık bir Gün Sonu metin dosyası indir
  try {
    const s = DB.get('settings', {});
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
    const txtContent = `--------------------------------------------------
GÜN SONU FİNANSAL RAPORU - Kardo POS Clone
--------------------------------------------------
Tarih: ${new Date().toLocaleString('tr-TR')}
İşletme: ${s.name || 'Restoranım'}
Adres: ${s.address || '-'}
Telefon: ${s.phone || '-'}
--------------------------------------------------
Bugünkü Ciro: ${formatCurrency(revenue)}
Kapatılan Sipariş: ${ordersCount} adet
KDV Oranı: %${s.tax || 8}
Para Birimi: ${s.currency || '₺'}
--------------------------------------------------
Verileriniz LocalStorage ve IndexedDB (Çift Katman)
üzerinde güvence altına alınmıştır. Bu dosya ve 
JSON yedeği bilgisayarınızın sabit diskindedir.
--------------------------------------------------`;

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kardopos-gunsonu-${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    console.error('Metin raporu oluşturulamadı:', e);
  }

  showToast('☀️ Gün başarıyla kapatıldı! Veri yedekleri diske indirildi.', 'success');
}
