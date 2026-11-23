// ===== MUTFAK EKRANI (KDS) =====
function renderKitchen() {
  setActivePage('kitchen');
  const orders = DB.get('orders', []).filter(o => o.status !== 'closed');

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">👨‍🍳 Mutfak Ekranı</div>
        <div class="page-header-sub">${orders.length} aktif sipariş</div>
      </div>
      <button class="btn btn-secondary" onclick="renderKitchen()">🔄 Yenile</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;" id="kitchen-grid">
      ${orders.length === 0 ? `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">👨‍🍳</div>
          <div class="empty-text">Mutfakta bekleyen sipariş yok</div>
        </div>` :
        orders.map(o => renderKitchenCard(o)).join('')}
    </div>
  `;

  // Otomatik yenile (30 saniye)
  if (window._kitchenTimer) clearInterval(window._kitchenTimer);
  window._kitchenTimer = setInterval(() => {
    if (document.querySelector('.page-header-title')?.textContent.includes('Mutfak')) renderKitchen();
    else clearInterval(window._kitchenTimer);
  }, 30000);
}

function renderKitchenCard(o) {
  const elapsed = Math.floor((Date.now() - new Date(o.createdAt)) / 60000);
  const urgent = elapsed >= 20;
  const warning = elapsed >= 10 && elapsed < 20;
  const borderColor = urgent ? 'var(--danger)' : warning ? 'var(--warning)' : o.status === 'ready' ? 'var(--success)' : 'var(--border)';
  const bgColor = urgent ? 'rgba(255,71,87,0.08)' : warning ? 'rgba(255,193,7,0.08)' : o.status === 'ready' ? 'rgba(32,201,151,0.08)' : 'var(--surface)';
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  let footerHTML = '';
  if (isBoss) {
    if (o.status === 'pending') {
      footerHTML = `<div style="text-align:center;width:100%;color:var(--info);font-weight:600;padding:8px;background:rgba(54,162,235,0.1);border-radius:6px;">⌛ Beklemede (Salt-Okunur)</div>`;
    } else if (o.status === 'preparing') {
      footerHTML = `<div style="text-align:center;width:100%;color:var(--warning);font-weight:600;padding:8px;background:rgba(255,193,7,0.1);border-radius:6px;">👨‍🍳 Hazırlanıyor (Salt-Okunur)</div>`;
    } else {
      footerHTML = `<div style="text-align:center;width:100%;color:var(--success);font-weight:600;padding:8px;background:rgba(32,201,151,0.1);border-radius:6px;">✓ Servise Hazır</div>`;
    }
  } else {
    if (o.status === 'pending') {
      footerHTML = `<button class="btn btn-warning" style="flex:1;" onclick="kitchenUpdateStatus(${o.id},'preparing')">👨‍🍳 Hazırlanıyor</button>`;
    } else if (o.status === 'preparing') {
      footerHTML = `<button class="btn btn-success" style="flex:1;" onclick="kitchenUpdateStatus(${o.id},'ready')">✓ Hazır</button>`;
    } else {
      footerHTML = `<div style="text-align:center;width:100%;color:var(--success);font-weight:600;padding:8px;">✓ Servise Hazır</div>`;
    }
  }

  return `
    <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:var(--radius);padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div>
          <div style="font-size:18px;font-weight:800;">${o.tableName}</div>
          <div style="font-size:11px;color:var(--text3);">Sipariş #${o.id}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22px;font-weight:800;color:${urgent ? 'var(--danger)' : warning ? 'var(--warning)' : 'var(--text2)'};">${elapsed} dk</div>
          <span class="badge badge-${o.status === 'ready' ? 'success' : o.status === 'preparing' ? 'warning' : 'info'}">${statusLabel(o.status)}</span>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
        ${o.items.map(i => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="
              width:28px;height:28px;border-radius:50%;
              background:var(--primary);color:white;
              display:flex;align-items:center;justify-content:center;
              font-size:13px;font-weight:800;flex-shrink:0;
            ">${i.qty}</div>
            <span style="font-size:14px;font-weight:500;">${i.name}</span>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        ${footerHTML}
      </div>
    </div>`;
}

function kitchenUpdateStatus(orderId, status) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Mutfak sipariş durumu değiştirilemez', 'warning');
    return;
  }
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === orderId);
  if (order) { order.status = status; DB.set('orders', orders); }
  showToast(statusLabel(status) + ' olarak işaretlendi', 'success');
  renderKitchen();
}

// ===== STOK TAKİBİ =====
function renderInventory() {
  setActivePage('inventory');
  const inv = DB.get('inventory', []);
  const lowStock = inv.filter(i => i.quantity <= i.minQty);
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  const headerButtonHTML = isBoss ? `
    <span class="badge badge-success" style="padding:8px 16px;font-size:12px;border-radius:20px;font-weight:700;">👑 Patron Modu (Salt-Okunur)</span>
  ` : `
    <button class="btn btn-primary" onclick="addInventoryModal()">➕ Malzeme Ekle</button>
  `;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">📦 Stok Takibi</div>
        <div class="page-header-sub">${inv.length} malzeme | ${lowStock.length} düşük stok uyarısı</div>
      </div>
      ${headerButtonHTML}
    </div>

    ${lowStock.length > 0 ? `
      <div class="alert alert-warning">
        ⚠️ <strong>${lowStock.length} malzeme</strong> minimum stok seviyesinin altında: ${lowStock.map(i => i.name).join(', ')}
      </div>` : ''}

    <div class="card" style="overflow:hidden;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Malzeme</th><th>Birim</th><th>Mevcut</th><th>Min. Stok</th><th>Durum</th><th>Birim Maliyet</th>${isBoss ? '' : '<th>İşlem</th>'}
          </tr>
        </thead>
        <tbody>
          ${inv.map(i => {
            const pct = Math.min(100, Math.round(i.quantity / (i.minQty * 3) * 100));
            const color = i.quantity <= i.minQty ? 'var(--danger)' : i.quantity <= i.minQty * 1.5 ? 'var(--warning)' : 'var(--success)';
            
            const actionTd = isBoss ? '' : `
              <td>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-success btn-sm" onclick="stockInModal(${i.id})">+Giriş</button>
                  <button class="btn btn-warning btn-sm" onclick="stockOutModal(${i.id})">-Çıkış</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteInventory(${i.id})">🗑️</button>
                </div>
              </td>
            `;

            return `
              <tr>
                <td><strong>${i.name}</strong></td>
                <td>${i.unit}</td>
                <td style="font-weight:700;color:${color};">${i.quantity} ${i.unit}</td>
                <td style="color:var(--text3);">${i.minQty} ${i.unit}</td>
                <td>
                  <div style="background:var(--bg3);border-radius:20px;height:8px;width:100px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${color};border-radius:20px;transition:width 0.3s;"></div>
                  </div>
                </td>
                <td>${formatCurrency(i.cost)}</td>
                ${actionTd}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function stockInModal(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Stok girişi yapılamaz', 'warning');
    return;
  }
  const inv = DB.get('inventory', []);
  const item = inv.find(i => i.id === id);
  showModal(`
    <div class="modal-header">
      <div class="modal-title">➕ Stok Girişi — ${item.name}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Miktar (${item.unit})</label>
      <input class="form-control" id="stock-qty" type="number" placeholder="0" min="1">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-success" onclick="confirmStockIn(${id})">Giriş Yap</button>
    </div>
  `);
}

function confirmStockIn(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Stok girişi yapılamaz', 'warning');
    return;
  }
  const qty = parseFloat(document.getElementById('stock-qty').value) || 0;
  if (qty <= 0) { showToast('Geçerli miktar girin', 'error'); return; }
  const inv = DB.get('inventory', []);
  const item = inv.find(i => i.id === id);
  if (item) { item.quantity += qty; DB.set('inventory', inv); }
  closeModal();
  showToast(`${qty} ${item.unit} stok girişi yapıldı`, 'success');
  renderInventory();
}

function stockOutModal(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Stok çıkışı yapılamaz', 'warning');
    return;
  }
  const inv = DB.get('inventory', []);
  const item = inv.find(i => i.id === id);
  showModal(`
    <div class="modal-header">
      <div class="modal-title">➖ Stok Çıkışı — ${item.name}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Miktar (${item.unit}) — Mevcut: ${item.quantity}</label>
      <input class="form-control" id="stock-qty" type="number" placeholder="0" min="1" max="${item.quantity}">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-warning" onclick="confirmStockOut(${id})">Çıkış Yap</button>
    </div>
  `);
}

function confirmStockOut(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Stok çıkışı yapılamaz', 'warning');
    return;
  }
  const qty = parseFloat(document.getElementById('stock-qty').value) || 0;
  const inv = DB.get('inventory', []);
  const item = inv.find(i => i.id === id);
  if (qty <= 0 || qty > item.quantity) { showToast('Geçersiz miktar', 'error'); return; }
  item.quantity -= qty;
  DB.set('inventory', inv);
  closeModal();
  showToast(`${qty} ${item.unit} stok çıkışı yapıldı`, 'success');
  renderInventory();
}

function deleteInventory(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Malzeme silinemez', 'warning');
    return;
  }
  if (!confirm('Bu malzemeyi silmek istiyor musunuz?')) return;
  DB.set('inventory', DB.get('inventory', []).filter(i => i.id !== id));
  showToast('Malzeme silindi', 'success');
  renderInventory();
}

function addInventoryModal() {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Malzeme eklenemez', 'warning');
    return;
  }
  showModal(`
    <div class="modal-header">
      <div class="modal-title">➕ Yeni Malzeme</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Malzeme Adı</label>
      <input class="form-control" id="inv-name" placeholder="Örn: Pirinç">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Birim</label>
        <select class="form-control" id="inv-unit">
          <option>kg</option><option>lt</option><option>adet</option><option>paket</option><option>gr</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mevcut Miktar</label>
        <input class="form-control" id="inv-qty" type="number" placeholder="0">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Min. Stok</label>
        <input class="form-control" id="inv-min" type="number" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Birim Maliyet (₺)</label>
        <input class="form-control" id="inv-cost" type="number" placeholder="0">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveInventory()">Ekle</button>
    </div>
  `);
}

function saveInventory() {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Malzeme kaydedilemez', 'warning');
    return;
  }
  const name = document.getElementById('inv-name').value.trim();
  const unit = document.getElementById('inv-unit').value;
  const quantity = parseFloat(document.getElementById('inv-qty').value) || 0;
  const minQty = parseFloat(document.getElementById('inv-min').value) || 0;
  const cost = parseFloat(document.getElementById('inv-cost').value) || 0;
  if (!name) { showToast('Malzeme adı gerekli', 'error'); return; }
  const inv = DB.get('inventory', []);
  inv.push({ id: genId(inv), name, unit, quantity, minQty, cost });
  DB.set('inventory', inv);
  closeModal();
  showToast('Malzeme eklendi', 'success');
  renderInventory();
}
