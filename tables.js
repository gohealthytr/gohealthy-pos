// ===== MASA YÖNETİMİ =====
function renderTables() {
  setActivePage('tables');
  const tables = DB.get('tables', []);
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  const headerButtonsHTML = isBoss ? `
    <span class="badge badge-success" style="padding:8px 16px;font-size:12px;border-radius:20px;font-weight:700;">👑 Patron Modu (Salt-Okunur)</span>
  ` : `
    <div style="display:flex;gap:10px;">
      <button class="btn btn-secondary" onclick="addTableModal()">➕ Masa Ekle</button>
      <button class="btn btn-primary" onclick="renderOrders()">🛒 Sipariş Aç</button>
    </div>
  `;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">🪑 Masa Yönetimi</div>
        <div class="page-header-sub">
          Toplam ${tables.length} masa | Dolu: ${tables.filter(t=>t.status==='occupied').length} | Boş: ${tables.filter(t=>t.status==='empty').length}
        </div>
      </div>
      ${headerButtonsHTML}
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;padding:8px 14px;background:rgba(32,201,151,0.1);border:1px solid rgba(32,201,151,0.3);border-radius:8px;">
        🟢 <span style="color:var(--success);">Boş Masa</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;padding:8px 14px;background:rgba(255,107,53,0.1);border:1px solid rgba(255,107,53,0.3);border-radius:8px;">
        🔴 <span style="color:var(--primary);">Dolu Masa</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;padding:8px 14px;background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:8px;">
        🟡 <span style="color:var(--warning);">Rezerveli</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;">
      ${tables.map(t => renderTableCard(t)).join('')}
    </div>
  `;
}

function renderTableCard(t) {
  const colorMap = { empty: 'success', occupied: 'orange', reserved: 'warning' };
  const bgMap = {
    empty: 'rgba(32,201,151,0.08)',
    occupied: 'rgba(255,107,53,0.12)',
    reserved: 'rgba(255,193,7,0.08)'
  };
  const borderMap = {
    empty: 'rgba(32,201,151,0.3)',
    occupied: 'var(--primary)',
    reserved: 'rgba(255,193,7,0.3)'
  };
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.tableId === t.id && o.status !== 'closed');
  const elapsed = order ? Math.floor((Date.now() - new Date(order.createdAt)) / 60000) : 0;
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  let actionButtonsHTML = '';
  if (isBoss) {
    if (t.status === 'occupied') {
      actionButtonsHTML = `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openTableOrder(${t.id})" style="width:100%;justify-content:center;">🔍 Siparişi Gör</button>`;
    } else if (t.status === 'reserved') {
      actionButtonsHTML = `<span class="badge badge-warning" style="width:100%;text-align:center;padding:6px;font-size:11px;border-radius:6px;cursor:default;">🟡 Rezerve</span>`;
    } else {
      actionButtonsHTML = `<span class="badge badge-success" style="width:100%;text-align:center;padding:6px;font-size:11px;border-radius:6px;cursor:default;">🟢 Boş</span>`;
    }
  } else {
    actionButtonsHTML = t.status === 'empty' ? `
      <button class="btn btn-success btn-sm" onclick="event.stopPropagation();openTableOrder(${t.id})">Sipariş Aç</button>
      <button class="btn btn-warning btn-sm" onclick="event.stopPropagation();reserveTable(${t.id})">Rezerve</button>
    ` : t.status === 'occupied' ? `
      <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openTableOrder(${t.id})">Sipariş</button>
      <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();closeTableOrder(${t.id})">Kapat</button>
    ` : `
      <button class="btn btn-success btn-sm" onclick="event.stopPropagation();setTableStatus(${t.id},'empty')">Boşalt</button>
      <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openTableOrder(${t.id})">Aç</button>
    `;
  }

  return `
    <div style="
      background:${bgMap[t.status]};
      border:2px solid ${borderMap[t.status]};
      border-radius:16px;padding:18px;cursor:pointer;
      transition:all 0.2s;position:relative;
    " onclick="tableAction(${t.id})"
      onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="font-size:32px;text-align:center;">
        ${t.status === 'occupied' ? '🔴' : t.status === 'reserved' ? '🟡' : '🟢'}
      </div>
      <div style="text-align:center;margin-top:10px;">
        <div style="font-size:18px;font-weight:800;">${t.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${t.capacity} Kişilik</div>
      </div>
      ${t.status === 'occupied' && order ? `
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);text-align:center;">
          <div style="font-size:12px;font-weight:700;color:var(--primary);">${formatCurrency(order.total || 0)}</div>
          <div style="font-size:10px;color:var(--text3);">${elapsed} dk</div>
        </div>` : ''}
      <div style="display:flex;gap:6px;margin-top:12px;justify-content:center;">
        ${actionButtonsHTML}
      </div>
    </div>`;
}

function tableAction(id) {
  const tables = DB.get('tables', []);
  const t = tables.find(t => t.id === id);
  if (t && t.status === 'occupied') openTableOrder(id);
}

function setTableStatus(id, status) {
  const tables = DB.get('tables', []);
  const t = tables.find(t => t.id === id);
  if (t) { t.status = status; DB.set('tables', tables); renderTables(); }
}

function reserveTable(id) {
  setTableStatus(id, 'reserved');
  showToast('Masa rezerve edildi', 'success');
}

function openTableOrder(tableId) {
  const tables = DB.get('tables', []);
  const t = tables.find(t => t.id === tableId);
  if (!t) return;
  const orders = DB.get('orders', []);
  let order = orders.find(o => o.tableId === tableId && o.status !== 'closed');
  if (!order) {
    order = {
      id: genId(orders), tableId, tableName: t.name,
      items: [], status: 'pending', total: 0,
      createdAt: new Date().toISOString(), note: ''
    };
    orders.push(order);
    DB.set('orders', orders);
    if (t.status !== 'occupied') { t.status = 'occupied'; DB.set('tables', tables); }
  }
  renderOrderPOS(order.id);
}

function closeTableOrder(tableId) {
  const tables = DB.get('tables', []);
  const t = tables.find(t => t.id === tableId);
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.tableId === tableId && o.status !== 'closed');
  if (order) {
    order.status = 'closed';
    order.closedAt = new Date().toISOString();
    DB.set('orders', orders);
    // Satış geçmişini güncelle
    const today = new Date().toISOString().split('T')[0];
    const sales = DB.get('sales_history', []);
    let todaySale = sales.find(s => s.date === today);
    if (!todaySale) { todaySale = { date: today, orders: 0, revenue: 0 }; sales.push(todaySale); }
    todaySale.orders++;
    todaySale.revenue += order.total || 0;
    DB.set('sales_history', sales);
  }
  if (t) { t.status = 'empty'; t.orderId = null; DB.set('tables', tables); }
  showToast('Masa hesabı kapatıldı', 'success');
  renderTables();
}

function addTableModal() {
  showModal(`
    <div class="modal-header">
      <div class="modal-title">➕ Yeni Masa Ekle</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Masa Adı</label>
      <input class="form-control" id="new-table-name" placeholder="Masa 21" />
    </div>
    <div class="form-group">
      <label class="form-label">Kapasite</label>
      <input class="form-control" id="new-table-cap" type="number" value="4" min="1" max="20" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="confirmAddTable()">Ekle</button>
    </div>
  `);
}

function confirmAddTable() {
  const name = document.getElementById('new-table-name').value.trim();
  const capacity = parseInt(document.getElementById('new-table-cap').value) || 4;
  if (!name) { showToast('Masa adı gerekli', 'error'); return; }
  const tables = DB.get('tables', []);
  tables.push({ id: genId(tables), name, capacity, status: 'empty', orderId: null });
  DB.set('tables', tables);
  closeModal();
  showToast('Masa eklendi', 'success');
  renderTables();
}
