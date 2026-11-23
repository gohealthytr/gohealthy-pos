// ===== PERSONEL YÖNETİMİ =====
function renderStaff() {
  setActivePage('staff');
  const staff = DB.get('staff', []);
  const active = staff.filter(s => s.active);
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  const headerButtonHTML = isBoss ? `
    <span class="badge badge-success" style="padding:8px 16px;font-size:12px;border-radius:20px;font-weight:700;">👑 Patron Modu (Salt-Okunur)</span>
  ` : `
    <button class="btn btn-primary" onclick="addStaffModal()">➕ Personel Ekle</button>
  `;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">👥 Personel Yönetimi</div>
        <div class="page-header-sub">${active.length} aktif çalışan</div>
      </div>
      ${headerButtonHTML}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${staff.map(s => `
        <div class="card" style="position:relative;${!s.active ? 'opacity:0.6;' : ''}">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
            <div style="
              width:52px;height:52px;border-radius:50%;flex-shrink:0;
              background:linear-gradient(135deg,var(--primary),var(--accent));
              display:flex;align-items:center;justify-content:center;
              font-size:20px;font-weight:700;
            ">${s.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
            <div>
              <div style="font-size:16px;font-weight:700;">${s.name}</div>
              <div style="font-size:12px;color:var(--text3);">${s.role}</div>
            </div>
            <span class="badge ${s.active ? 'badge-success' : 'badge-danger'}" style="margin-left:auto;">
              ${s.active ? 'Aktif' : 'Pasif'}
            </span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text3);">📞 Telefon</span>
              <span>${s.phone}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text3);">💰 Maaş</span>
              <span style="font-weight:600;color:var(--success);">${formatCurrency(s.salary)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text3);">📅 Başlangıç</span>
              <span>${formatDate(s.startDate)}</span>
            </div>
          </div>
          ${isBoss ? '' : `
          <div style="display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
            <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="editStaffModal(${s.id})">✏️ Düzenle</button>
            <button class="btn ${s.active ? 'btn-warning' : 'btn-success'} btn-sm" style="flex:1;" onclick="toggleStaff(${s.id})">
              ${s.active ? '⏸ Pasif Yap' : '▶ Aktif Yap'}
            </button>
          </div>
          `}
        </div>`).join('')}
    </div>
  `;
}

function toggleStaff(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Personel durumu değiştirilemez', 'warning');
    return;
  }
  const staff = DB.get('staff', []);
  const s = staff.find(s => s.id === id);
  if (s) { s.active = !s.active; DB.set('staff', staff); renderStaff(); }
}

function addStaffModal(editId = null) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Personel eklenemez/düzenlenemez', 'warning');
    return;
  }
  const staff = DB.get('staff', []);
  const s = editId ? staff.find(s => s.id === editId) : null;
  const roles = ['Garson', 'Aşçı', 'Kasiyer', 'Müdür', 'Temizlik', 'Güvenlik', 'Komi'];
  showModal(`
    <div class="modal-header">
      <div class="modal-title">${editId ? '✏️ Personeli Düzenle' : '➕ Yeni Personel'}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Ad Soyad</label>
      <input class="form-control" id="st-name" value="${s?.name || ''}" placeholder="Ad Soyad">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Görev</label>
        <select class="form-control" id="st-role">
          ${roles.map(r => `<option ${s?.role === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Telefon</label>
        <input class="form-control" id="st-phone" value="${s?.phone || ''}" placeholder="05xx xxx xx xx">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Maaş (₺)</label>
        <input class="form-control" id="st-salary" type="number" value="${s?.salary || ''}" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Başlangıç Tarihi</label>
        <input class="form-control" id="st-date" type="date" value="${s?.startDate || new Date().toISOString().split('T')[0]}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveStaff(${editId || 'null'})">${editId ? 'Güncelle' : 'Ekle'}</button>
    </div>
  `);
}

function editStaffModal(id) { addStaffModal(id); }

function saveStaff(editId) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Personel kaydedilemez', 'warning');
    return;
  }
  const name = document.getElementById('st-name').value.trim();
  const role = document.getElementById('st-role').value;
  const phone = document.getElementById('st-phone').value.trim();
  const salary = parseFloat(document.getElementById('st-salary').value) || 0;
  const startDate = document.getElementById('st-date').value;
  if (!name) { showToast('Ad Soyad gerekli', 'error'); return; }
  const staff = DB.get('staff', []);
  if (editId) {
    const s = staff.find(s => s.id === editId);
    if (s) Object.assign(s, { name, role, phone, salary, startDate });
  } else {
    staff.push({ id: genId(staff), name, role, phone, salary, startDate, active: true });
  }
  DB.set('staff', staff);
  closeModal();
  showToast(editId ? 'Personel güncellendi' : 'Personel eklendi', 'success');
  renderStaff();
}

// ===== RAPORLAR =====
if (!window._reportsPeriod) window._reportsPeriod = '30';

function changeReportPeriod(p) {
  window._reportsPeriod = p;
  renderReports();
}

function renderReports() {
  setActivePage('reports');
  const period = window._reportsPeriod; // '30', '180' veya '365'
  const sales = DB.get('sales_history', []);
  const menu = DB.get('menu', []);
  const orders = DB.get('orders', []);
  
  // Veriyi seçilen döneme göre sınırla
  const daysLimit = parseInt(period);
  const slicedSales = sales.slice(-daysLimit);
  
  const totalRevenue = slicedSales.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = slicedSales.reduce((s, d) => s + d.orders, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // İstatistik etiketlerini ve değerlerini uyarla
  let avgLabel = 'Günlük Ortalama';
  let avgVal = totalRevenue / Math.max(1, slicedSales.length);
  let periodLabel = `Son ${daysLimit} Günlük Rapor`;
  
  if (period === '180') {
    avgLabel = 'Aylık Ortalama Ciro';
    avgVal = totalRevenue / 6;
    periodLabel = 'Son 6 Aylık Rapor';
  } else if (period === '365') {
    avgLabel = 'Aylık Ortalama Ciro';
    avgVal = totalRevenue / 12;
    periodLabel = 'Son 12 Aylık Rapor';
  }

  // Aylık Kümeleme (6 Ay ve 12 Ay için)
  const monthly = {};
  slicedSales.forEach(s => {
    const d = new Date(s.date);
    const monthKey = d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' }); // Örn: "Mayıs 2026"
    if (!monthly[monthKey]) {
      monthly[monthKey] = { label: monthKey, revenue: 0, orders: 0 };
    }
    monthly[monthKey].revenue += s.revenue;
    monthly[monthKey].orders += s.orders;
  });
  const monthlyLabels = Object.keys(monthly);
  const monthlyData = Object.values(monthly).map(m => m.revenue);

  // En çok sipariş edilen ürünler (Oturum verilerinden çekilir)
  const itemCounts = {};
  orders.forEach(o => o.items?.forEach(i => {
    itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty;
  }));
  const topItems = Object.entries(itemCounts).sort((a,b) => b[1]-a[1]).slice(0,5);

  // Ödeme Yöntemleri Dağılımı hesapla
  const paymentTotals = {};
  const allMethods = DB.get('payment_methods', []);
  allMethods.forEach(pm => {
    paymentTotals[pm.id] = { name: pm.name, icon: pm.icon, total: 0 };
  });

  slicedSales.forEach(s => {
    if (s.payments) {
      Object.keys(s.payments).forEach(k => {
        if (paymentTotals[k]) {
          paymentTotals[k].total += s.payments[k];
        } else {
          const found = allMethods.find(pm => pm.id === k);
          paymentTotals[k] = { 
            name: found?.name || k, 
            icon: found?.icon || '💳', 
            total: s.payments[k] 
          };
        }
      });
    }
  });

  const nonZeroPayments = Object.values(paymentTotals).filter(pt => pt.total > 0);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">📊 Raporlar & Analiz</div>
        <div class="page-header-sub">${periodLabel}</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-success" onclick="endOfDayModal()">☀️ Gün Sonu Yap</button>
      </div>
    </div>

    <!-- ZAMAN FİLTRELERİ (TABS) -->
    <div class="tabs" id="report-tabs" style="margin-bottom:20px;">
      <button class="tab-btn ${period === '30' ? 'active' : ''}" onclick="changeReportPeriod('30')">Son 30 Gün</button>
      <button class="tab-btn ${period === '180' ? 'active' : ''}" onclick="changeReportPeriod('180')">Son 6 Ay</button>
      <button class="tab-btn ${period === '365' ? 'active' : ''}" onclick="changeReportPeriod('365')">Son 12 Ay (1 Yıl)</button>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card green">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${formatCurrency(totalRevenue)}</div>
        <div class="stat-label">Toplam Gelir</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">🧾</div>
        <div class="stat-value">${totalOrders}</div>
        <div class="stat-label">Toplam Sipariş</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">📈</div>
        <div class="stat-value">${formatCurrency(avgOrder)}</div>
        <div class="stat-label">Ortalama Sipariş</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${formatCurrency(avgVal)}</div>
        <div class="stat-label">${avgLabel}</div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px;margin-bottom:20px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📈 Ciro Gelişim Grafiği (${period === '30' ? 'Günlük' : 'Aylık'})</div>
        </div>
        <canvas id="trendChart" height="200"></canvas>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏆 En Çok Satan Ürünler</div>
        </div>
        ${topItems.length === 0 ? `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Veri yok</div></div>` :
          topItems.map(([name, qty], i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
              <div style="
                width:28px;height:28px;border-radius:50%;
                background:${['var(--accent)','var(--text2)','rgba(205,127,50,0.8)','var(--info)','var(--text3)'][i]};
                display:flex;align-items:center;justify-content:center;
                font-size:12px;font-weight:800;color:var(--bg);flex-shrink:0;
              ">${i+1}</div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${name}</div>
                <div style="background:var(--bg3);border-radius:4px;height:6px;margin-top:4px;overflow:hidden;">
                  <div style="height:100%;width:${Math.round(qty/topItems[0][1]*100)}%;background:var(--primary);border-radius:4px;"></div>
                </div>
              </div>
              <div style="font-weight:700;color:var(--primary);">${qty} adet</div>
            </div>`).join('')}
      </div>
    </div>

    <!-- ÖDEME YÖNTEMLERİ GRAFİĞİ VE DETAYLARI -->
    <div class="grid-2" style="gap:20px;margin-bottom:20px;">
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
        <div class="card-header">
          <div class="card-title">💳 Ödeme Yöntemleri Dağılımı</div>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:10px 0;height:240px;position:relative;">
          ${nonZeroPayments.length === 0 ? `
            <div class="empty-state"><div class="empty-icon">💳</div><div class="empty-text">Henüz ödeme kaydı bulunamadı</div></div>
          ` : `
            <canvas id="paymentsDoughnutChart" style="max-height:220px;"></canvas>
          `}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">💳 Ödeme Tipi Detayları</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:10px;">
          ${nonZeroPayments.length === 0 ? `
            <div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Veri yok</div></div>
          ` : nonZeroPayments.sort((a,b) => b.total - a.total).map((pt, i) => {
            const pct = totalRevenue > 0 ? (pt.total / totalRevenue * 100).toFixed(1) : 0;
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);">
                <div style="font-size:20px;flex-shrink:0;">${pt.icon}</div>
                <div style="flex:1;">
                  <div style="font-size:13px;font-weight:600;display:flex;justify-content:space-between;">
                    <span>${pt.name}</span>
                    <span style="color:var(--text3);">${pct}%</span>
                  </div>
                  <div style="background:var(--bg3);border-radius:4px;height:6px;margin-top:4px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${[
                      '#ff6b35','#28a745','#007bff','#e83e8c','#fd7e14','#20c997','#17a2b8','#6f42c1'
                    ][i % 8]};border-radius:4px;"></div>
                  </div>
                </div>
                <div style="font-weight:700;color:var(--success);text-align:right;">${formatCurrency(pt.total)}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">📅 Satış Detay Tablosu (${period === '30' ? 'Günlük' : 'Aylık'})</div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${period === '30' ? 'Tarih' : 'Ay'}</th>
            <th>Sipariş Sayısı</th>
            <th>Toplam Gelir</th>
            <th>Ortalama Sipariş</th>
          </tr>
        </thead>
        <tbody>
          ${period === '30' ? 
            [...slicedSales].reverse().slice(0,15).map(d => `
              <tr>
                <td>${formatDate(d.date)}</td>
                <td>${d.orders}</td>
                <td style="font-weight:600;color:var(--success);">${formatCurrency(d.revenue)}</td>
                <td>${d.orders > 0 ? formatCurrency(d.revenue / d.orders) : '-'}</td>
              </tr>`).join('')
            :
            [...monthlyLabels].reverse().map(mKey => {
              const m = monthly[mKey];
              return `
                <tr>
                  <td><strong>${m.label}</strong></td>
                  <td>${m.orders}</td>
                  <td style="font-weight:600;color:var(--success);">${formatCurrency(m.revenue)}</td>
                  <td>${m.orders > 0 ? formatCurrency(m.revenue / m.orders) : '-'}</td>
                </tr>`;
            }).join('')
          }
        </tbody>
      </table>
    </div>
  `;

  setTimeout(() => {
    const ctx = document.getElementById('trendChart');
    if (ctx && window.Chart) {
      const isMonthly = period !== '30';
      const labels = isMonthly ? monthlyLabels : slicedSales.map(s => new Date(s.date).toLocaleDateString('tr-TR', { day:'2-digit', month:'short' }));
      const chartData = isMonthly ? monthlyData : slicedSales.map(s => s.revenue);

      // Mevcut grafik nesnesi varsa temizle
      if (window.myTrendChart) {
        window.myTrendChart.destroy();
      }

      window.myTrendChart = new Chart(ctx, {
        type: isMonthly ? 'bar' : 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Gelir (₺)',
            data: chartData,
            borderColor: 'var(--primary)',
            backgroundColor: isMonthly ? 'rgba(255,107,53,0.7)' : 'rgba(255,107,53,0.1)',
            borderWidth: 2,
            borderRadius: isMonthly ? 6 : 0,
            fill: !isMonthly,
            tension: 0.4,
            pointBackgroundColor: 'var(--primary)',
            pointRadius: isMonthly ? 0 : 3,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#A8ADCE', maxTicksLimit: isMonthly ? 12 : 10 } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#A8ADCE' } }
          }
        }
      });
    }

    // Ödeme yöntemleri Doughnut Chart
    const paymentsCtx = document.getElementById('paymentsDoughnutChart');
    if (paymentsCtx && window.Chart && nonZeroPayments.length > 0) {
      if (window.myPaymentsChart) {
        window.myPaymentsChart.destroy();
      }

      window.myPaymentsChart = new Chart(paymentsCtx, {
        type: 'doughnut',
        data: {
          labels: nonZeroPayments.map(pt => pt.name),
          datasets: [{
            data: nonZeroPayments.map(pt => pt.total),
            backgroundColor: [
              '#ff6b35','#28a745','#007bff','#e83e8c','#fd7e14','#20c997','#17a2b8','#6f42c1'
            ],
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#A8ADCE',
                font: { size: 11, family: 'Outfit, sans-serif' },
                boxWidth: 12
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }, 100);
}
}

// renderSettings, saveSettings, exportData, resetData -> history.js dosyasında tanımlı
