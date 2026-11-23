// ===== SİPARİŞ YÖNETİMİ (POS) =====

let currentOrderId = null;
let selectedCatId = null;
let menuSearch = '';

function renderOrders() {
  setActivePage('orders');
  const orders = DB.get('orders', []);
  const active = orders.filter(o => o.status !== 'closed');
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  const newOrderBtn = isBoss ? `
    <span class="badge badge-success" style="padding:8px 16px;font-size:12px;border-radius:20px;font-weight:700;">👑 Patron Modu (Salt-Okunur)</span>
  ` : `
    <button class="btn btn-primary" onclick="newOrderModal()">➕ Yeni Sipariş</button>
  `;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">🛒 Sipariş Yönetimi</div>
        <div class="page-header-sub">${active.length} aktif sipariş</div>
      </div>
      ${newOrderBtn}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${active.length === 0 ? `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">🛒</div>
          <div class="empty-text">Aktif sipariş yok</div>
          <div class="empty-sub">Yeni sipariş açmak için butona tıklayın</div>
        </div>` :
        active.map(o => renderOrderCard(o)).join('')}
    </div>
  `;
}

function renderOrderCard(o) {
  const elapsed = Math.floor((Date.now() - new Date(o.createdAt)) / 60000);
  const statusColors = { pending: 'info', preparing: 'warning', ready: 'success' };
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  const actionButtonsHTML = isBoss ? `
    <div style="display:flex;gap:6px;">
      <button class="btn btn-primary btn-sm" style="font-weight:700;">🔍 İncele</button>
    </div>
  ` : `
    <div style="display:flex;gap:6px;">
      <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();printBill(${o.id})">🖨️</button>
      <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();closeOrder(${o.id})">Kapat</button>
    </div>
  `;

  return `
    <div class="card" style="cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;"
      onclick="renderOrderPOS(${o.id})"
      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-size:18px;font-weight:800;">${o.tableName}</div>
          <div style="font-size:11px;color:var(--text3);">Sipariş #${o.id} • ${elapsed} dk önce</div>
        </div>
        <span class="badge badge-${statusColors[o.status] || 'info'}">${statusLabel(o.status)}</span>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px;">
        ${(o.items || []).slice(0,3).map(i => `
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span>${i.qty}x ${i.name}</span>
            <span>${formatCurrency(i.qty * i.price)}</span>
          </div>`).join('')}
        ${o.items.length > 3 ? `<div style="font-size:11px;color:var(--text3);">+${o.items.length - 3} ürün daha</div>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-size:18px;font-weight:800;color:var(--primary);">${formatCurrency(o.total || 0)}</div>
        ${actionButtonsHTML}
      </div>
    </div>`;
}

function renderOrderPOS(orderId) {
  currentOrderId = orderId;
  setActivePage('orders');
  const cats = DB.get('categories', []);
  if (!selectedCatId) selectedCatId = cats[0]?.id;

  document.getElementById('page-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;height:calc(100vh - 120px);">
      <!-- MENÜ PANELİ -->
      <div style="display:flex;flex-direction:column;gap:16px;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <button class="btn btn-secondary" onclick="renderOrders()">← Geri</button>
          <div class="search-box">
            <span>🔍</span>
            <input type="text" placeholder="Ürün ara..." id="menu-search" oninput="menuSearch=this.value;renderMenuItems()">
          </div>
        </div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
          ${cats.map(c => `
            <button class="tab-btn ${selectedCatId === c.id ? 'active' : ''}"
              onclick="selectedCatId=${c.id};menuSearch='';document.getElementById('menu-search').value='';renderMenuItems()">
              ${c.icon} ${c.name}
            </button>`).join('')}
        </div>
        <div id="menu-items-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;overflow-y:auto;"></div>
      </div>
      <!-- SİPARİŞ PANELİ -->
      <div style="display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
        <div id="order-panel" style="flex:1;overflow-y:auto;"></div>
      </div>
    </div>`;

  renderMenuItems();
  renderOrderPanel();
}

function renderMenuItems() {
  const menu = DB.get('menu', []);
  const filtered = menu.filter(m => m.active &&
    (menuSearch ? m.name.toLowerCase().includes(menuSearch.toLowerCase()) : m.catId === selectedCatId)
  );
  const grid = document.getElementById('menu-items-grid');
  if (!grid) return;
  grid.innerHTML = filtered.length === 0 ? `<div style="color:var(--text3);padding:20px;">Ürün bulunamadı</div>` :
    filtered.map(m => `
      <div onclick="addItemToOrder(${m.id})" style="
        background:var(--surface);border:1px solid var(--border);border-radius:12px;
        padding:14px;cursor:pointer;transition:all 0.2s;
      "
      onmouseover="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
        <div style="font-size:24px;margin-bottom:8px;">
          ${['🥗','🍽️','🍕','🍔','🥤','🍰'][DB.get('categories',[]).findIndex(c=>c.id===m.catId)] || '🍴'}
        </div>
        <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${m.name}</div>
        <div style="font-size:15px;font-weight:800;color:var(--primary);">${formatCurrency(m.price)}</div>
      </div>`).join('');
}

function renderOrderPanel() {
  const panel = document.getElementById('order-panel');
  if (!panel) return;
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === currentOrderId);
  if (!order) return;
  const s = DB.get('settings', {});
  const taxRate = s.tax || 8;
  const subtotal = order.total || 0;
  const tax = subtotal * taxRate / 100;
  const total = subtotal + tax;
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  let itemsHTML = '';
  if (order.items.length === 0) {
    itemsHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <div class="empty-text">Sepet boş</div>
        <div class="empty-sub">Soldaki menüden ürün ekleyin</div>
      </div>`;
  } else {
    itemsHTML = order.items.map((item, idx) => {
      const qtyControls = isBoss ? `
        <span style="font-weight:700;min-width:20px;text-align:center;color:var(--text2);">${item.qty} adet</span>
      ` : `
        <button onclick="changeQty(${idx},-1)" style="
          width:26px;height:26px;border-radius:50%;border:1px solid var(--border2);
          background:var(--bg3);color:var(--text);cursor:pointer;font-size:14px;
        ">−</button>
        <span style="font-weight:700;min-width:20px;text-align:center;">${item.qty}</span>
        <button onclick="changeQty(${idx},1)" style="
          width:26px;height:26px;border-radius:50%;border:none;
          background:var(--primary);color:white;cursor:pointer;font-size:14px;
        ">+</button>
      `;

      const removeBtn = isBoss ? '' : `
        <button onclick="removeItem(${idx})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;">🗑️</button>
      `;

      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;">${item.name}</div>
            <div style="font-size:12px;color:var(--primary);">${formatCurrency(item.price)} / adet</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${qtyControls}
          </div>
          <div style="min-width:70px;text-align:right;font-weight:700;">${formatCurrency(item.qty * item.price)}</div>
          ${removeBtn}
        </div>`;
    }).join('');
  }

  const footerButtonsHTML = isBoss ? `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <span class="badge badge-success" style="padding:10px;text-align:center;font-size:12px;border-radius:8px;font-weight:700;display:block;width:100%;">👑 Canlı İzleme (Salt-Okunur)</span>
      <button class="btn btn-secondary" style="width:100%;justify-content:center;" onclick="printBill(${order.id})">🖨️ Adisyon Önizle</button>
    </div>
  ` : `
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary" style="flex:1;" onclick="printBill(${order.id})">🖨️ Adisyon</button>
      <button class="btn btn-primary" style="flex:2;" onclick="closeOrder(${order.id})">✓ Hesabı Kapat</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="updateOrderStatus(${order.id},'preparing')">👨‍🍳 Hazırlanıyor</button>
      <button class="btn btn-success btn-sm" style="flex:1;" onclick="updateOrderStatus(${order.id},'ready')">✓ Hazır</button>
    </div>
  `;

  panel.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid var(--border);background:var(--bg3);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:16px;font-weight:700;">${order.tableName}</div>
          <div style="font-size:11px;color:var(--text3);">Sipariş #${order.id}</div>
        </div>
        <span class="badge badge-${order.status === 'ready' ? 'success' : 'info'}">${statusLabel(order.status)}</span>
      </div>
    </div>
    <div style="flex:1;padding:12px;overflow-y:auto;">
      ${itemsHTML}
    </div>
    <div style="padding:16px;border-top:1px solid var(--border);background:var(--bg3);">
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text2);margin-bottom:4px;">
        <span>Ara Toplam</span><span>${formatCurrency(subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text2);margin-bottom:10px;">
        <span>KDV (%${taxRate})</span><span>${formatCurrency(tax)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:var(--primary);margin-bottom:14px;">
        <span>TOPLAM</span><span>${formatCurrency(total)}</span>
      </div>
      ${footerButtonsHTML}
    </div>`;
}

function addItemToOrder(menuId) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Siparişe ürün eklenemez (Salt-Okunur)', 'warning');
    return;
  }
  const menu = DB.get('menu', []);
  const item = menu.find(m => m.id === menuId);
  if (!item) return;
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === currentOrderId);
  if (!order) return;
  const existing = order.items.find(i => i.menuId === menuId);
  if (existing) existing.qty++;
  else order.items.push({ menuId, name: item.name, price: item.price, qty: 1 });
  order.total = order.items.reduce((s, i) => s + i.qty * i.price, 0);
  DB.set('orders', orders);
  renderOrderPanel();
  showToast(item.name + ' eklendi', 'success');
}

function changeQty(idx, delta) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Sipariş adeti değiştirilemez (Salt-Okunur)', 'warning');
    return;
  }
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === currentOrderId);
  if (!order) return;
  order.items[idx].qty += delta;
  if (order.items[idx].qty <= 0) order.items.splice(idx, 1);
  order.total = order.items.reduce((s, i) => s + i.qty * i.price, 0);
  DB.set('orders', orders);
  renderOrderPanel();
}

function removeItem(idx) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Ürün silinemez (Salt-Okunur)', 'warning');
    return;
  }
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === currentOrderId);
  if (!order) return;
  order.items.splice(idx, 1);
  order.total = order.items.reduce((s, i) => s + i.qty * i.price, 0);
  DB.set('orders', orders);
  renderOrderPanel();
}

function updateOrderStatus(orderId, status) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Sipariş durumu güncellenemez (Salt-Okunur)', 'warning');
    return;
  }
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === orderId);
  if (order) { order.status = status; DB.set('orders', orders); renderOrderPanel(); }
  showToast('Durum güncellendi: ' + statusLabel(status), 'info');
}

function closeOrder(orderId) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Sipariş kapatılamaz (Salt-Okunur)', 'warning');
    return;
  }
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const s = DB.get('settings', {});
  const tax = (order.total || 0) * (s.tax || 8) / 100;
  const finalTotal = (order.total || 0) + tax;

  const activeMethods = DB.get('payment_methods', []).filter(pm => pm.active);
  if (activeMethods.length === 0) {
    showToast('⚠️ Lütfen ayarlardan en az bir aktif ödeme yöntemi seçin.', 'warning');
    return;
  }

  showModal(`
    <div class="modal-header">
      <div class="modal-title">💳 Ödeme ve Hesap Kapatma</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="text-align:center;margin-bottom:20px;background:rgba(40,116,240,0.06);padding:16px;border-radius:12px;border:1px solid rgba(40,116,240,0.15);">
      <div style="font-size:13px;color:var(--text3);margin-bottom:4px;">${order.tableName} — Toplam Ödenecek Tutar</div>
      <div style="font-size:32px;font-weight:900;color:var(--primary);">${formatCurrency(finalTotal)}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">Ara Toplam: ${formatCurrency(order.total || 0)} + KDV (%${s.tax || 8}): ${formatCurrency(tax)}</div>
    </div>
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--text);">Ödeme Yöntemi Seçin:</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px;">
      ${activeMethods.map(pm => `
        <button class="btn btn-secondary" onclick="processPayment(${orderId}, '${pm.id}')" style="
          padding:14px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:6px;border-radius:12px;background:var(--bg3);border:1px solid var(--border);transition:all 0.2s;
          cursor:pointer;
        "
        onmouseover="this.style.borderColor='var(--primary)';this.style.background='rgba(40,116,240,0.05)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg3)'">
          <span style="font-size:20px;">${pm.icon}</span>
          <span style="font-size:12px;font-weight:700;color:var(--text);">${pm.name}</span>
        </button>
      `).join('')}
    </div>
    <div class="modal-footer" style="padding-top:10px;border-top:none;">
      <button class="btn btn-secondary" onclick="closeModal()" style="width:100%;justify-content:center;margin:0;">İptal</button>
    </div>
  `);
}

function processPayment(orderId, paymentMethodId) {
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const s = DB.get('settings', {});
  const tax = (order.total || 0) * (s.tax || 8) / 100;
  order.status = 'closed';
  order.closedAt = new Date().toISOString();
  order.finalTotal = (order.total || 0) + tax;
  order.paymentMethod = paymentMethodId;
  DB.set('orders', orders);

  // Masayı boşalt
  const tables = DB.get('tables', []);
  const t = tables.find(t => t.id === order.tableId);
  if (t) { t.status = 'empty'; DB.set('tables', tables); }

  // Satış geçmişini güncelle
  const today = new Date().toISOString().split('T')[0];
  const sales = DB.get('sales_history', []);
  let todaySale = sales.find(s => s.date === today);
  if (!todaySale) {
    todaySale = {
      date: today,
      orders: 0,
      revenue: 0,
      payments: {
        cash: 0,
        card: 0,
        sodexo: 0,
        multinet: 0,
        setcard: 0,
        yemeksepeti: 0,
        getir: 0,
        trendyol: 0
      }
    };
    sales.push(todaySale);
  }
  
  if (!todaySale.payments) {
    todaySale.payments = {
      cash: 0,
      card: 0,
      sodexo: 0,
      multinet: 0,
      setcard: 0,
      yemeksepeti: 0,
      getir: 0,
      trendyol: 0
    };
  }

  todaySale.orders++;
  todaySale.revenue += order.finalTotal;
  
  const paymentKey = paymentMethodId;
  todaySale.payments[paymentKey] = (todaySale.payments[paymentKey] || 0) + order.finalTotal;

  DB.set('sales_history', sales);
  
  closeModal();
  currentOrderId = null;
  showToast(`✓ Hesap kapatıldı (${DB.get('payment_methods', []).find(pm => pm.id === paymentMethodId)?.name || paymentMethodId})`, 'success');
  renderOrders();
}

function newOrderModal() {
  const tables = DB.get('tables', []).filter(t => t.status !== 'occupied');
  showModal(`
    <div class="modal-header">
      <div class="modal-title">➕ Yeni Sipariş</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Masa Seçin</label>
      <select class="form-control" id="sel-table">
        ${tables.map(t => `<option value="${t.id}">${t.name} (${t.capacity} kişilik)</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="startNewOrder()">Sipariş Aç</button>
    </div>
  `);
}

function startNewOrder() {
  const tableId = parseInt(document.getElementById('sel-table').value);
  closeModal();
  openTableOrder(tableId);
}

function printBill(orderId) {
  const orders = DB.get('orders', []);
  const order = orders.find(o => o.id === orderId);
  const s = DB.get('settings', {});
  if (!order) return;
  const tax = (order.total || 0) * (s.tax || 8) / 100;
  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(`
    <html><head><title>Adisyon</title>
    <style>body{font-family:monospace;padding:20px;max-width:300px;}
    h2{text-align:center;}hr{border:dashed 1px #ccc;}
    .row{display:flex;justify-content:space-between;}
    .total{font-weight:bold;font-size:18px;}</style></head>
    <body>
    <h2>${s.name || 'RESTORAN'}</h2>
    <p style="text-align:center;font-size:12px;">${s.address || ''}</p>
    <hr>
    <p>${order.tableName} | Sipariş #${order.id}</p>
    <p>${new Date().toLocaleString('tr-TR')}</p>
    <hr>
    ${order.items.map(i => `<div class="row"><span>${i.qty}x ${i.name}</span><span>${formatCurrency(i.qty*i.price)}</span></div>`).join('')}
    <hr>
    <div class="row"><span>Ara Toplam</span><span>${formatCurrency(order.total||0)}</span></div>
    <div class="row"><span>KDV (%${s.tax||8})</span><span>${formatCurrency(tax)}</span></div>
    <hr>
    <div class="row total"><span>TOPLAM</span><span>${formatCurrency((order.total||0)+tax)}</span></div>
    <hr>
    <p style="text-align:center;">Afiyet olsun! 🍽️</p>
    </body></html>`);
  win.document.close();
  win.print();
}
