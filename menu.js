// ===== MENÜ YÖNETİMİ =====
function renderMenu() {
  setActivePage('menu');
  const menu = DB.get('menu', []);
  const cats = DB.get('categories', []);
  const isBoss = DB.get('user_role', 'manager') === 'boss';

  const headerButtonsHTML = isBoss ? `
    <span class="badge badge-success" style="padding:8px 16px;font-size:12px;border-radius:20px;font-weight:700;">👑 Patron Modu (Salt-Okunur)</span>
  ` : `
    <div style="display:flex;gap:10px;">
      <button class="btn btn-secondary" onclick="addCategoryModal()">📁 Kategori Ekle</button>
      <button class="btn btn-primary" onclick="addMenuItemModal()">➕ Ürün Ekle</button>
    </div>
  `;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">🍽️ Menü Yönetimi</div>
        <div class="page-header-sub">${menu.length} ürün, ${cats.length} kategori</div>
      </div>
      ${headerButtonsHTML}
    </div>

    <div class="tabs">
      ${cats.map(c => `<button class="tab-btn" onclick="filterMenuByCat(${c.id},this)">${c.icon} ${c.name}</button>`).join('')}
      <button class="tab-btn active" onclick="filterMenuByCat(null,this)">Tümü</button>
    </div>

    <div class="card" style="overflow:hidden;">
      <table class="data-table" id="menu-table">
        <thead>
          <tr>
            <th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Maliyet</th><th>Kâr %</th><th>Durum</th>${isBoss ? '' : '<th>İşlem</th>'}
          </tr>
        </thead>
        <tbody id="menu-tbody">
          ${renderMenuRows(menu, cats)}
        </tbody>
      </table>
    </div>
  `;
}

function renderMenuRows(menu, cats) {
  if (menu.length === 0) return `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3);">Menü boş</td></tr>`;
  const isBoss = DB.get('user_role', 'manager') === 'boss';
  return menu.map(m => {
    const cat = cats.find(c => c.id === m.catId);
    const profit = m.cost > 0 ? ((m.price - m.cost) / m.price * 100).toFixed(0) : '-';
    
    const statusButton = isBoss ? `
      <span style="
        background:${m.active ? 'rgba(32,201,151,0.1)' : 'rgba(255,71,87,0.1)'};
        color:${m.active ? 'var(--success)' : 'var(--danger)'};
        border:none;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;display:inline-block;
      ">${m.active ? '✓ Aktif' : '✗ Pasif'}</span>
    ` : `
      <button onclick="toggleMenuItemActive(${m.id})" style="
        background:${m.active ? 'rgba(32,201,151,0.15)' : 'rgba(255,71,87,0.15)'};
        color:${m.active ? 'var(--success)' : 'var(--danger)'};
        border:none;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;cursor:pointer;
      ">${m.active ? '✓ Aktif' : '✗ Pasif'}</button>
    `;

    const actionTd = isBoss ? '' : `
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editMenuItemModal(${m.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMenuItem(${m.id})">🗑️</button>
        </div>
      </td>
    `;

    return `
      <tr>
        <td>
          <div style="font-weight:600;">${m.name}</div>
          <div style="font-size:11px;color:var(--text3);">${m.desc || ''}</div>
        </td>
        <td>${cat ? cat.icon + ' ' + cat.name : '-'}</td>
        <td style="font-weight:700;color:var(--primary);">${formatCurrency(m.price)}</td>
        <td style="color:var(--text2);">${formatCurrency(m.cost)}</td>
        <td>
          <span class="badge ${profit > 50 ? 'badge-success' : profit > 30 ? 'badge-warning' : 'badge-danger'}">
            %${profit}
          </span>
        </td>
        <td>${statusButton}</td>
        ${actionTd}
      </tr>`;
  }).join('');
}

function filterMenuByCat(catId, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const menu = DB.get('menu', []);
  const cats = DB.get('categories', []);
  const filtered = catId ? menu.filter(m => m.catId === catId) : menu;
  document.getElementById('menu-tbody').innerHTML = renderMenuRows(filtered, cats);
}

function toggleMenuItemActive(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Ürün durumu değiştirilemez', 'warning');
    return;
  }
  const menu = DB.get('menu', []);
  const item = menu.find(m => m.id === id);
  if (item) { item.active = !item.active; DB.set('menu', menu); renderMenu(); }
}

function deleteMenuItem(id) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Ürün silinemez', 'warning');
    return;
  }
  if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
  const menu = DB.get('menu', []).filter(m => m.id !== id);
  DB.set('menu', menu);
  showToast('Ürün silindi', 'success');
  renderMenu();
}

function addMenuItemModal(editId = null) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Ürün eklenemez/düzenlenemez', 'warning');
    return;
  }
  const cats = DB.get('categories', []);
  const menu = DB.get('menu', []);
  const item = editId ? menu.find(m => m.id === editId) : null;
  showModal(`
    <div class="modal-header">
      <div class="modal-title">${editId ? '✏️ Ürünü Düzenle' : '➕ Yeni Ürün'}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Ürün Adı</label>
        <input class="form-control" id="mi-name" value="${item?.name || ''}" placeholder="Ürün adı">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-control" id="mi-cat">
          ${cats.map(c => `<option value="${c.id}" ${item?.catId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Satış Fiyatı (₺)</label>
        <input class="form-control" id="mi-price" type="number" value="${item?.price || ''}" placeholder="0.00">
      </div>
      <div class="form-group">
        <label class="form-label">Maliyet (₺)</label>
        <input class="form-control" id="mi-cost" type="number" value="${item?.cost || ''}" placeholder="0.00">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Açıklama</label>
      <input class="form-control" id="mi-desc" value="${item?.desc || ''}" placeholder="Kısa açıklama">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveMenuItem(${editId || 'null'})">${editId ? 'Güncelle' : 'Ekle'}</button>
    </div>
  `);
}

function editMenuItemModal(id) { addMenuItemModal(id); }

function saveMenuItem(editId) {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Ürün kaydedilemez', 'warning');
    return;
  }
  const name = document.getElementById('mi-name').value.trim();
  const catId = parseInt(document.getElementById('mi-cat').value);
  const price = parseFloat(document.getElementById('mi-price').value) || 0;
  const cost = parseFloat(document.getElementById('mi-cost').value) || 0;
  const desc = document.getElementById('mi-desc').value.trim();
  if (!name || !price) { showToast('Ad ve fiyat zorunlu', 'error'); return; }
  const menu = DB.get('menu', []);
  if (editId) {
    const item = menu.find(m => m.id === editId);
    if (item) Object.assign(item, { name, catId, price, cost, desc });
  } else {
    menu.push({ id: genId(menu), name, catId, price, cost, desc, active: true, stock: 99 });
  }
  DB.set('menu', menu);
  closeModal();
  showToast(editId ? 'Ürün güncellendi' : 'Ürün eklendi', 'success');
  renderMenu();
}

function addCategoryModal() {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Kategori eklenemez', 'warning');
    return;
  }
  const icons = ['🥗','🍽️','🍕','🍔','🥤','🍰','🍜','🥩','🦐','🍣','☕','🍺'];
  showModal(`
    <div class="modal-header">
      <div class="modal-title">📁 Yeni Kategori</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Kategori Adı</label>
      <input class="form-control" id="cat-name" placeholder="Örn: Ara Sıcaklar">
    </div>
    <div class="form-group">
      <label class="form-label">İkon Seç</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${icons.map(i => `
          <button onclick="selectCatIcon(this,'${i}')" style="
            font-size:22px;width:40px;height:40px;border-radius:8px;
            border:2px solid var(--border);background:var(--bg3);cursor:pointer;
          ">${i}</button>`).join('')}
      </div>
      <input type="hidden" id="cat-icon" value="${icons[0]}">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveCategory()">Ekle</button>
    </div>
  `);
}

function selectCatIcon(btn, icon) {
  document.querySelectorAll('[onclick^="selectCatIcon"]').forEach(b => b.style.borderColor = 'var(--border)');
  btn.style.borderColor = 'var(--primary)';
  document.getElementById('cat-icon').value = icon;
}

function saveCategory() {
  if (DB.get('user_role', 'manager') === 'boss') {
    showToast('Patron Modu: Kategori kaydedilemez', 'warning');
    return;
  }
  const name = document.getElementById('cat-name').value.trim();
  const icon = document.getElementById('cat-icon').value;
  if (!name) { showToast('Kategori adı gerekli', 'error'); return; }
  const cats = DB.get('categories', []);
  cats.push({ id: genId(cats), name, icon });
  DB.set('categories', cats);
  closeModal();
  showToast('Kategori eklendi', 'success');
  renderMenu();
}
