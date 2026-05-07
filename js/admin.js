/**
 * MMO Shop VN - Admin Panel Logic
 */

let currentPage = 'dashboard';
let prodPageNum = 1;
const PROD_PER_PAGE = 10;
let editingOrderId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
  const loggedIn = sessionStorage.getItem('admin_logged');
  if (loggedIn) {
    showAdmin();
  } else {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
  }
});

// ===== AUTH =====
function doLogin(e) {
  e.preventDefault();
  const data = getData();
  const user = document.getElementById('loginUser').value;
  const pass = document.getElementById('loginPass').value;
  if (user === data.settings.adminUsername && pass === data.settings.adminPassword) {
    sessionStorage.setItem('admin_logged', '1');
    sessionStorage.setItem('admin_user', user);
    showAdmin();
  } else {
    document.getElementById('loginError').classList.add('show');
  }
}

function showAdmin() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
  const user = sessionStorage.getItem('admin_user') || 'Admin';
  document.getElementById('topbarUser').textContent = user;
  updateNavBadges();
  showPage('dashboard');
}

function doLogout() {
  if (!confirm('Bạn có muốn đăng xuất không?')) return;
  sessionStorage.removeItem('admin_logged');
  sessionStorage.removeItem('admin_user');
  location.reload();
}

function updateNavBadges() {
  const data = getData();
  const nb = document.getElementById('navProdCount');
  const ob = document.getElementById('navOrderCount');
  const ub = document.getElementById('navUserCount');
  if (nb) nb.textContent = data.products.filter(p => p.active).length;
  if (ob) ob.textContent = data.orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  if (ub) ub.textContent = (data.users || []).length;
}

// ===== PAGE NAVIGATION =====
function showPage(page) {
  currentPage = page;
  // Hide all pages
  ['dashboard', 'products', 'categories', 'orders', 'users', 'notifications', 'settings'].forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.style.display = 'none';
  });
  // Show current
  const target = document.getElementById('page-' + page);
  if (target) target.style.display = '';
  // Update nav
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  // Update title
  const titles = { dashboard: 'Dashboard', products: 'Quản lý sản phẩm', categories: 'Quản lý danh mục', orders: 'Quản lý đơn hàng', users: 'Quản lý người dùng', notifications: 'Thông báo', settings: 'Cài đặt' };
  document.getElementById('pageTitle').textContent = titles[page] || 'Admin';

  // Render page content
  if (page === 'dashboard') renderDashboard();
  else if (page === 'products') renderProductsTable();
  else if (page === 'categories') renderCategories();
  else if (page === 'orders') renderOrdersTable();
  else if (page === 'users') renderUsersTable();
  else if (page === 'notifications') renderNotificationsPage();
  else if (page === 'settings') loadSettings();
}

// ===== DASHBOARD =====
function renderDashboard() {
  const data = getData();
  const orders = data.orders;
  const products = data.products;
  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalProducts = products.filter(p => p.active).length;

  // Stats
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="stat-icon" style="background:rgba(124,58,237,.15);color:#7c3aed"><i class="fas fa-money-bill-wave"></i></div>
      <div class="stat-info"><h3>${fmtMoney(totalRevenue)}</h3><p>Doanh thu (hoàn thành)</p><div class="stat-change up"><i class="fas fa-arrow-up"></i> +12% tháng này</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15);color:#10b981"><i class="fas fa-shopping-bag"></i></div>
      <div class="stat-info"><h3>${totalOrders}</h3><p>Tổng đơn hàng</p><div class="stat-change up"><i class="fas fa-arrow-up"></i> +${pendingOrders} đang xử lý</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15);color:#06b6d4"><i class="fas fa-box-open"></i></div>
      <div class="stat-info"><h3>${totalProducts}</h3><p>Sản phẩm đang bán</p><div class="stat-change up"><i class="fas fa-arrow-up"></i> ${products.length} tổng cộng</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15);color:#f59e0b"><i class="fas fa-users"></i></div>
      <div class="stat-info"><h3>${(data.users || []).length}</h3><p>Tài khoản đăng ký</p><div class="stat-change up"><i class="fas fa-arrow-up"></i> ${[...new Set(orders.map(o => o.customer.email || o.customer.phone))].length} khách mua hàng</div></div></div>`;

  // Chart
  const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  const chartData = [320000, 580000, 450000, 890000, 720000, 1100000, 950000, 1350000, 1200000, 1600000, 1450000, 1800000];
  const maxVal = Math.max(...chartData);
  document.getElementById('chartBars').innerHTML = months.map((m, i) =>
    `<div class="chart-bar-wrap" title="${fmtMoney(chartData[i])}">
      <div class="chart-bar" style="height:${Math.max(8, (chartData[i] / maxVal) * 140)}px"></div>
      <span class="chart-label">${m}</span>
    </div>`).join('');

  // Recent orders table
  const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  document.getElementById('recentOrdersTable').innerHTML = `<table><thead><tr><th>Mã ĐH</th><th>Khách hàng</th><th>Tổng tiền</th><th>Ngày</th><th>Trạng thái</th></tr></thead><tbody>
    ${recentOrders.map(o => `<tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.customer.name}</td>
      <td class="td-price">${fmtMoney(o.total)}</td>
      <td style="color:var(--muted);font-size:12px">${fmtDate(o.date)}</td>
      <td>${statusBadge(o.status)}</td>
    </tr>`).join('')}
  </tbody></table>`;

  // Top products
  const top5 = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5);
  document.getElementById('topProductsList').innerHTML = top5.map(p =>
    `<div class="top-item">
      <img src="${p.image || `https://picsum.photos/seed/${p.id}/80/60`}" alt="${p.name}" onerror="this.style.background='var(--bg3)'">
      <div class="top-item-info"><h4>${p.name}</h4><p>${p.game || ''}</p></div>
      <div class="top-item-sold">${(p.sold || 0).toLocaleString()} đã bán</div>
    </div>`).join('');
}

// ===== PRODUCTS =====
function renderProductsTable() {
  const data = getData();
  const search = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  const catFilter = parseInt(document.getElementById('prodCatFilter')?.value || '0');
  const statusFilter = document.getElementById('prodStatusFilter')?.value || 'all';

  // Fill category filter dropdown
  const catSel = document.getElementById('prodCatFilter');
  if (catSel && catSel.options.length <= 1) {
    data.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      catSel.appendChild(opt);
    });
  }

  let products = data.products;
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search) || (p.game || '').toLowerCase().includes(search));
  if (catFilter > 0) products = products.filter(p => p.categoryId === catFilter);
  if (statusFilter === 'active') products = products.filter(p => p.active);
  else if (statusFilter === 'inactive') products = products.filter(p => !p.active);
  else if (statusFilter === 'hot') products = products.filter(p => p.hot);
  else if (statusFilter === 'featured') products = products.filter(p => p.featured);

  document.getElementById('prodCount').textContent = products.length;

  const total = products.length;
  const start = (prodPageNum - 1) * PROD_PER_PAGE;
  const slice = products.slice(start, start + PROD_PER_PAGE);

  document.getElementById('productsTableBody').innerHTML = slice.map(p => {
    const cat = data.categories.find(c => c.id === p.categoryId);
    return `<tr>
      <td style="color:var(--muted);font-size:12px">#${p.id}</td>
      <td><div class="td-product">
        <img src="${p.image || `https://picsum.photos/seed/${p.id}/80/60`}" alt="${p.name}" onerror="this.style.background='var(--bg3)'">
        <div><div class="td-product-name">${p.name}</div><div class="td-product-game">${p.game || ''}</div></div>
      </div></td>
      <td><span style="background:${cat ? cat.color + '22' : 'var(--bg3)'};color:${cat ? cat.color : 'var(--muted)'};padding:3px 8px;border-radius:6px;font-size:12px;font-weight:600">${cat ? cat.name : 'N/A'}</span></td>
      <td class="td-price">${fmtMoney(p.price)}${p.originalPrice > p.price ? `<div style="font-size:11px;color:var(--muted);text-decoration:line-through">${fmtMoney(p.originalPrice)}</div>` : ''}</td>
      <td class="${p.stock <= 5 && p.stock < 999 ? 'td-stock-low' : 'td-stock-ok'}">${p.stock >= 999 ? '∞' : p.stock}</td>
      <td><strong>${(p.sold || 0).toLocaleString()}</strong></td>
      <td>
        <span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'Đang bán' : 'Ẩn'}</span>
        ${p.hot ? '<span class="badge badge-hot" style="margin-left:4px">HOT</span>' : ''}
        ${p.featured ? '<span class="badge badge-processing" style="margin-left:4px">Nổi bật</span>' : ''}
      </td>
      <td><div class="td-actions">
        <button class="btn-edit" onclick="openProductModal(${p.id})"><i class="fas fa-edit"></i> Sửa</button>
        <button class="btn-toggle" onclick="toggleProduct(${p.id})">${p.active ? '<i class="fas fa-eye-slash"></i> Ẩn' : '<i class="fas fa-eye"></i> Hiện'}</button>
        <button class="btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  // Pagination
  const totalPages = Math.ceil(total / PROD_PER_PAGE);
  document.getElementById('prodPaginationInfo').textContent = `Hiển thị ${start + 1}-${Math.min(start + PROD_PER_PAGE, total)} / ${total} sản phẩm`;
  const pBtns = document.getElementById('prodPaginationBtns');
  pBtns.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === prodPageNum) btn.classList.add('active');
    btn.onclick = () => { prodPageNum = i; renderProductsTable(); };
    pBtns.appendChild(btn);
  }
}

// ===== PRODUCT MODAL =====
function openProductModal(productId = null) {
  const data = getData();

  // Fill category dropdown
  const catSel = document.getElementById('prod-category');
  catSel.innerHTML = data.categories.filter(c => c.active).map(c =>
    `<option value="${c.id}">${c.name}</option>`).join('');

  if (productId) {
    const p = data.products.find(x => x.id === productId);
    if (!p) return;
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-edit" style="color:var(--primary);margin-right:6px"></i>Chỉnh sửa sản phẩm';
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-game').value = p.game || '';
    document.getElementById('prod-category').value = p.categoryId;
    document.getElementById('prod-badge').value = p.badge || '';
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-originalPrice').value = p.originalPrice || '';
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-image').value = p.image || '';
    document.getElementById('prod-description').value = p.description || '';
    document.getElementById('prod-details').value = p.details || '';
    document.getElementById('prod-featured').checked = p.featured || false;
    document.getElementById('prod-hot').checked = p.hot || false;
    document.getElementById('prod-active').checked = p.active !== false;
  } else {
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-plus" style="color:var(--primary);margin-right:6px"></i>Thêm sản phẩm mới';
    document.getElementById('prod-id').value = '';
    ['prod-name', 'prod-game', 'prod-price', 'prod-originalPrice', 'prod-image', 'prod-description', 'prod-details'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('prod-stock').value = '10';
    document.getElementById('prod-badge').value = '';
    document.getElementById('prod-featured').checked = false;
    document.getElementById('prod-hot').checked = false;
    document.getElementById('prod-active').checked = true;
  }

  document.getElementById('productModalBg').classList.add('open');
}

function closeProductModal() { document.getElementById('productModalBg').classList.remove('open'); }

function saveProduct() {
  const data = getData();
  const id = parseInt(document.getElementById('prod-id').value) || null;
  const name = document.getElementById('prod-name').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const catId = parseInt(document.getElementById('prod-category').value);

  if (!name || !price || !catId) { adminToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error'); return; }

  const productData = {
    name, price, categoryId: catId,
    game: document.getElementById('prod-game').value.trim(),
    badge: document.getElementById('prod-badge').value || null,
    originalPrice: parseFloat(document.getElementById('prod-originalPrice').value) || price,
    stock: parseInt(document.getElementById('prod-stock').value) || 10,
    image: document.getElementById('prod-image').value.trim() || null,
    description: document.getElementById('prod-description').value.trim(),
    details: document.getElementById('prod-details').value.trim(),
    featured: document.getElementById('prod-featured').checked,
    hot: document.getElementById('prod-hot').checked,
    active: document.getElementById('prod-active').checked,
  };

  if (id) {
    const idx = data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      data.products[idx] = { ...data.products[idx], ...productData };
      adminToast('Cập nhật sản phẩm thành công!', 'success');
    }
  } else {
    productData.id = data.settings.nextProductId++;
    productData.sold = 0;
    productData.rating = 5.0;
    productData.reviews = 0;
    data.products.push(productData);
    adminToast('Thêm sản phẩm thành công!', 'success');
  }

  saveData(data);
  closeProductModal();
  renderProductsTable();
  updateNavBadges();
}

function toggleProduct(id) {
  const data = getData();
  const p = data.products.find(x => x.id === id);
  if (!p) return;
  p.active = !p.active;
  saveData(data);
  renderProductsTable();
  adminToast(`Sản phẩm đã ${p.active ? 'hiện' : 'ẩn'}!`, 'info');
}

function deleteProduct(id) {
  if (!confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;
  const data = getData();
  data.products = data.products.filter(p => p.id !== id);
  saveData(data);
  renderProductsTable();
  updateNavBadges();
  adminToast('Đã xóa sản phẩm!', 'info');
}

// ===== CATEGORIES =====
function renderCategories() {
  const data = getData();
  const grid = document.getElementById('catsGrid');
  if (!grid) return;

  grid.innerHTML = data.categories.map(cat => {
    const count = data.products.filter(p => p.categoryId === cat.id).length;
    return `<div class="cat-admin-card">
      <div class="cat-admin-icon" style="background:${cat.color}22;color:${cat.color}"><i class="${cat.icon}"></i></div>
      <div class="cat-admin-info">
        <h3>${cat.name}</h3>
        <p>${count} sản phẩm · ${cat.active ? 'Đang hoạt động' : 'Đã ẩn'}</p>
        <p style="font-size:11px;color:var(--muted);margin-top:2px">${cat.description || ''}</p>
      </div>
      <div class="cat-admin-actions">
        <button class="btn-edit" onclick="openCatModal(${cat.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" onclick="deleteCat(${cat.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function openCatModal(catId = null) {
  if (catId) {
    const data = getData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return;
    document.getElementById('catModalTitle').innerHTML = '<i class="fas fa-edit" style="color:var(--green);margin-right:6px"></i>Chỉnh sửa danh mục';
    document.getElementById('cat-id').value = cat.id;
    document.getElementById('cat-name').value = cat.name;
    document.getElementById('cat-icon').value = cat.icon;
    document.getElementById('cat-color').value = cat.color;
    document.getElementById('cat-description').value = cat.description || '';
    document.getElementById('cat-active').checked = cat.active;
  } else {
    document.getElementById('catModalTitle').innerHTML = '<i class="fas fa-plus" style="color:var(--green);margin-right:6px"></i>Thêm danh mục';
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-icon').value = 'fas fa-gamepad';
    document.getElementById('cat-color').value = '#7c3aed';
    document.getElementById('cat-description').value = '';
    document.getElementById('cat-active').checked = true;
  }
  document.getElementById('catModalBg').classList.add('open');
}

function closeCatModal() { document.getElementById('catModalBg').classList.remove('open'); }

function saveCat() {
  const data = getData();
  const id = parseInt(document.getElementById('cat-id').value) || null;
  const name = document.getElementById('cat-name').value.trim();
  if (!name) { adminToast('Vui lòng nhập tên danh mục!', 'error'); return; }

  const catData = {
    name,
    icon: document.getElementById('cat-icon').value.trim() || 'fas fa-tag',
    color: document.getElementById('cat-color').value,
    description: document.getElementById('cat-description').value.trim(),
    active: document.getElementById('cat-active').checked,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
  };

  if (id) {
    const idx = data.categories.findIndex(c => c.id === id);
    if (idx !== -1) { data.categories[idx] = { ...data.categories[idx], ...catData }; adminToast('Cập nhật danh mục thành công!', 'success'); }
  } else {
    catData.id = data.settings.nextCategoryId++;
    data.categories.push(catData);
    adminToast('Thêm danh mục thành công!', 'success');
  }

  saveData(data);
  closeCatModal();
  renderCategories();
}

function deleteCat(id) {
  const data = getData();
  const count = data.products.filter(p => p.categoryId === id).length;
  if (count > 0) { adminToast(`Không thể xóa! Danh mục có ${count} sản phẩm.`, 'error'); return; }
  if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return;
  data.categories = data.categories.filter(c => c.id !== id);
  saveData(data);
  renderCategories();
  adminToast('Đã xóa danh mục!', 'info');
}

// ===== ORDERS =====
function renderOrdersTable() {
  const data = getData();
  const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';

  let orders = [...data.orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (search) orders = orders.filter(o => o.customer.name.toLowerCase().includes(search) || String(o.id).includes(search) || (o.customer.email || '').toLowerCase().includes(search));
  if (statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);

  document.getElementById('orderCount').textContent = orders.length;

  document.getElementById('ordersTableBody').innerHTML = orders.map(o => `<tr>
    <td><strong>#${o.id}</strong></td>
    <td>
      <div style="font-weight:600">${o.customer.name}</div>
      <div style="font-size:12px;color:var(--muted)">${o.customer.phone || o.customer.email || ''}</div>
    </td>
    <td style="font-size:12px;color:var(--muted);max-width:180px">
      ${o.items.map(i => `${i.name} x${i.qty}`).join('<br>')}
    </td>
    <td class="td-price">${fmtMoney(o.total)}</td>
    <td style="font-size:12px;color:var(--muted)">${fmtDate(o.date)}</td>
    <td><span style="font-size:12px;font-weight:600">${o.paymentMethod || ''}</span></td>
    <td>${statusBadge(o.status)}</td>
    <td><div class="td-actions">
      <button class="btn-status" onclick="openOrderModal(${o.id})"><i class="fas fa-edit"></i> Sửa</button>
      <button class="btn-delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

function openOrderModal(orderId) {
  const data = getData();
  const order = data.orders.find(o => o.id === orderId);
  if (!order) return;
  editingOrderId = orderId;

  document.getElementById('orderModalBody').innerHTML = `
    <div style="margin-bottom:16px;padding:14px;background:var(--bg3);border-radius:10px">
      <div style="font-weight:700;margin-bottom:8px">Đơn hàng #${order.id}</div>
      <div style="font-size:13px;color:var(--muted)">Khách: ${order.customer.name} | ${order.customer.phone || order.customer.email}</div>
      <div style="font-size:13px;color:var(--muted)">Ngày đặt: ${fmtDate(order.date)}</div>
      <div style="font-size:13px;margin-top:6px">${order.items.map(i => `${i.name} x${i.qty} — ${fmtMoney(i.price * i.qty)}`).join('<br>')}</div>
      <div style="font-size:16px;font-weight:800;color:var(--accent);margin-top:8px">Tổng: ${fmtMoney(order.total)}</div>
    </div>
    <div class="form-group">
      <label>Cập nhật trạng thái</label>
      <select id="order-status-sel" style="width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 13px;border-radius:8px;font-size:13px;font-family:inherit">
        <option value="pending" ${order.status==='pending'?'selected':''}>⏳ Chờ xử lý</option>
        <option value="processing" ${order.status==='processing'?'selected':''}>⚙️ Đang xử lý</option>
        <option value="completed" ${order.status==='completed'?'selected':''}>✅ Hoàn thành</option>
        <option value="cancelled" ${order.status==='cancelled'?'selected':''}>❌ Đã hủy</option>
      </select>
    </div>`;

  document.getElementById('orderModalBg').classList.add('open');
}

function closeOrderModal() { document.getElementById('orderModalBg').classList.remove('open'); editingOrderId = null; }

function saveOrderStatus() {
  if (!editingOrderId) return;
  const data = getData();
  const order = data.orders.find(o => o.id === editingOrderId);
  if (!order) return;
  order.status = document.getElementById('order-status-sel').value;
  saveData(data);
  closeOrderModal();
  renderOrdersTable();
  updateNavBadges();
  adminToast('Cập nhật trạng thái đơn hàng thành công!', 'success');
}

function deleteOrder(id) {
  if (!confirm('Bạn có chắc muốn xóa đơn hàng này không?')) return;
  const data = getData();
  data.orders = data.orders.filter(o => o.id !== id);
  saveData(data);
  renderOrdersTable();
  updateNavBadges();
  adminToast('Đã xóa đơn hàng!', 'info');
}

// ===== SETTINGS =====
function loadSettings() {
  const data = getData();
  const s = data.settings;
  document.getElementById('set-siteName').value = s.siteName || '';
  document.getElementById('set-heroTitle').value = s.heroTitle || '';
  document.getElementById('set-heroSubtitle').value = s.heroSubtitle || '';
  document.getElementById('set-announcement').value = s.announcementText || '';
  document.getElementById('set-facebook').value = s.contactFacebook || '';
  document.getElementById('set-discord').value = s.contactDiscord || '';
  document.getElementById('set-email').value = s.contactEmail || '';
  document.getElementById('set-telegram').value = s.contactTelegram || '';
  document.getElementById('set-adminUser').value = s.adminUsername || 'admin';
}

function saveSettings(type) {
  const data = getData();
  if (type === 'site') {
    data.settings.siteName = document.getElementById('set-siteName').value.trim();
    data.settings.heroTitle = document.getElementById('set-heroTitle').value.trim();
    data.settings.heroSubtitle = document.getElementById('set-heroSubtitle').value.trim();
    data.settings.announcementText = document.getElementById('set-announcement').value.trim();
    adminToast('Đã lưu thông tin website!', 'success');
  } else if (type === 'contact') {
    data.settings.contactFacebook = document.getElementById('set-facebook').value.trim();
    data.settings.contactDiscord = document.getElementById('set-discord').value.trim();
    data.settings.contactEmail = document.getElementById('set-email').value.trim();
    data.settings.contactTelegram = document.getElementById('set-telegram').value.trim();
    adminToast('Đã lưu thông tin liên hệ!', 'success');
  } else if (type === 'password') {
    const curPass = document.getElementById('set-curPass').value;
    const newPass = document.getElementById('set-newPass').value;
    const confPass = document.getElementById('set-confPass').value;
    const newUser = document.getElementById('set-adminUser').value.trim();
    if (curPass !== data.settings.adminPassword) { adminToast('Mật khẩu hiện tại không đúng!', 'error'); return; }
    if (newPass && newPass !== confPass) { adminToast('Mật khẩu mới không khớp!', 'error'); return; }
    if (newUser) data.settings.adminUsername = newUser;
    if (newPass) data.settings.adminPassword = newPass;
    ['set-curPass', 'set-newPass', 'set-confPass'].forEach(id => document.getElementById(id).value = '');
    adminToast('Đã cập nhật thông tin đăng nhập!', 'success');
  }
  saveData(data);
}

function exportData() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mmoshop-data-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  adminToast('Xuất dữ liệu thành công!', 'success');
}

function confirmReset() {
  if (!confirm('⚠️ Bạn có chắc muốn reset về dữ liệu mặc định? Toàn bộ thay đổi sẽ bị mất!')) return;
  resetData();
  location.reload();
}

// ===== HELPERS =====
function fmtMoney(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' tr ₫';
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
}

function fmtDate(str) {
  const d = new Date(str);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function statusBadge(status) {
  const map = { pending: ['badge-pending', 'Chờ xử lý'], processing: ['badge-processing', 'Đang xử lý'], completed: ['badge-completed', 'Hoàn thành'], cancelled: ['badge-cancelled', 'Đã hủy'] };
  const [cls, label] = map[status] || ['badge-inactive', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function adminToast(msg, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const div = document.createElement('div');
  div.className = `admin-toast ${type}`;
  div.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ===== USERS =====
let userPageNum = 1;
const USER_PER_PAGE = 15;

function renderUsersTable() {
  const data = getData();
  const users = data.users || [];
  const search = (document.getElementById('userSearch')?.value || '').toLowerCase();
  const sort = document.getElementById('userSortFilter')?.value || 'new';

  let filtered = users.slice();
  if (search) filtered = filtered.filter(u =>
    (u.fullname || '').toLowerCase().includes(search) ||
    (u.username || '').toLowerCase().includes(search) ||
    (u.email || '').toLowerCase().includes(search) ||
    (u.phone || '').toLowerCase().includes(search)
  );
  if (sort === 'new') filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  else if (sort === 'old') filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  else if (sort === 'balance') filtered.sort((a, b) => (b.balance || 0) - (a.balance || 0));

  document.getElementById('userCount').textContent = filtered.length;

  const total = filtered.length;
  const start = (userPageNum - 1) * USER_PER_PAGE;
  const slice = filtered.slice(start, start + USER_PER_PAGE);

  if (slice.length === 0) {
    document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-users" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>Chưa có người dùng đăng ký nào</td></tr>`;
    document.getElementById('userPaginationInfo').textContent = 'Không có người dùng';
    document.getElementById('userPaginationBtns').innerHTML = '';
    return;
  }

  document.getElementById('usersTableBody').innerHTML = slice.map(u => {
    const initials = (u.fullname || u.username || '?').slice(0,1).toUpperCase();
    const userOrders = data.orders.filter(o => o.customer.email === u.email || o.customer.phone === u.phone);
    return `<tr>
      <td style="color:var(--muted);font-size:12px">#${u.id}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar">${initials}</div>
          <div>
            <div style="font-weight:700;font-size:13px">${u.fullname || u.username}</div>
            <div style="font-size:11px;color:var(--muted)">@${u.username}</div>
          </div>
        </div>
      </td>
      <td style="font-size:13px">${u.email || '<span style="color:var(--muted)">—</span>'}</td>
      <td style="font-size:13px">${u.phone || '<span style="color:var(--muted)">—</span>'}</td>
      <td><span class="balance-chip"><i class="fas fa-wallet" style="font-size:10px"></i>${fmtMoney(u.balance || 0)}</span></td>
      <td style="font-weight:600">${userOrders.length}</td>
      <td style="font-size:12px;color:var(--muted)">${u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
      <td><div class="td-actions">
        <button class="btn-view" onclick="openUserDetailModal(${u.id})"><i class="fas fa-eye"></i> Chi tiết</button>
        <button class="btn-balance" onclick="openAddBalanceModal(${u.id})"><i class="fas fa-plus"></i> Cộng tiền</button>
        <button class="btn-notif" onclick="openSendNotifUserModal(${u.id})"><i class="fas fa-bell"></i></button>
        <button class="btn-delete" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  document.getElementById('userPaginationInfo').textContent = `Hiển thị ${start + 1}-${Math.min(start + USER_PER_PAGE, total)} / ${total} người dùng`;
  const pBtns = document.getElementById('userPaginationBtns');
  pBtns.innerHTML = '';
  const totalPages = Math.ceil(total / USER_PER_PAGE);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === userPageNum) btn.classList.add('active');
    btn.onclick = () => { userPageNum = i; renderUsersTable(); };
    pBtns.appendChild(btn);
  }
}

function deleteUser(id) {
  if (!confirm('Bạn có chắc muốn xóa tài khoản người dùng này không?')) return;
  const data = getData();
  data.users = (data.users || []).filter(u => u.id !== id);
  saveData(data);
  renderUsersTable();
  updateNavBadges();
  adminToast('Đã xóa tài khoản người dùng!', 'info');
}

function openUserDetailModal(userId) {
  const data = getData();
  const u = (data.users || []).find(x => x.id === userId);
  if (!u) return;
  const userOrders = data.orders.filter(o => o.customer.email === u.email || o.customer.phone === u.phone);
  const totalSpent = userOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const initials = (u.fullname || u.username || '?').slice(0,1).toUpperCase();

  document.getElementById('userDetailBody').innerHTML = `
    <div class="user-detail-panel">
      <div class="ud-avatar">${initials}</div>
      <div class="ud-info">
        <h3>${u.fullname || u.username}</h3>
        <p>@${u.username} • Đăng ký: ${u.createdAt ? fmtDate(u.createdAt) : '—'}</p>
      </div>
      <div class="ud-stats">
        <div class="ud-stat"><div class="v">${fmtMoney(u.balance || 0)}</div><div class="l">Số dư</div></div>
        <div class="ud-stat"><div class="v">${userOrders.length}</div><div class="l">Đơn hàng</div></div>
        <div class="ud-stat"><div class="v">${fmtMoney(totalSpent)}</div><div class="l">Đã chi tiêu</div></div>
        <div class="ud-stat"><div class="v">${userOrders.filter(o => o.status === 'completed').length}</div><div class="l">Hoàn thành</div></div>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">Thông tin liên hệ</div>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;display:grid;gap:6px">
        <div><span style="color:var(--muted);width:90px;display:inline-block">Email:</span> ${u.email || '—'}</div>
        <div><span style="color:var(--muted);width:90px;display:inline-block">Điện thoại:</span> ${u.phone || '—'}</div>
        <div><span style="color:var(--muted);width:90px;display:inline-block">Tên hiển thị:</span> ${u.fullname || '—'}</div>
      </div>
    </div>
    ${userOrders.length > 0 ? `
    <div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">Lịch sử mua hàng</div>
      <table class="history-table-mini">
        <thead><tr><th>Mã ĐH</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
        <tbody>${userOrders.slice().sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,10).map(o => `<tr>
          <td><strong>#${o.id}</strong></td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.items.map(i=>i.name).join(', ')}</td>
          <td style="font-weight:700;color:#e94560">${fmtMoney(o.total)}</td>
          <td>${o.date ? o.date.split('T')[0] : '—'}</td>
          <td>${statusBadge(o.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">Chưa có đơn hàng nào</div>'}
  `;
  document.getElementById('userDetailModalBg').classList.add('open');
}

function closeUserDetailModal() { document.getElementById('userDetailModalBg').classList.remove('open'); }

function openAddBalanceModal(userId) {
  const data = getData();
  const u = (data.users || []).find(x => x.id === userId);
  if (!u) return;
  document.getElementById('balance-userId').value = userId;
  document.getElementById('balance-amount').value = '';
  document.getElementById('balance-note').value = '';
  document.getElementById('balance-userInfo').innerHTML = `
    <i class="fas fa-user-circle" style="color:var(--primary);margin-right:6px"></i>
    <strong>${u.fullname || u.username}</strong> — Số dư hiện tại: <strong style="color:#16a34a">${fmtMoney(u.balance || 0)}</strong>
  `;
  document.getElementById('addBalanceModalBg').classList.add('open');
}

function closeAddBalanceModal() { document.getElementById('addBalanceModalBg').classList.remove('open'); }

function saveAddBalance() {
  const userId = parseInt(document.getElementById('balance-userId').value);
  const amount = parseFloat(document.getElementById('balance-amount').value);
  if (!amount || amount <= 0) { adminToast('Vui lòng nhập số tiền hợp lệ!', 'error'); return; }
  const data = getData();
  const u = (data.users || []).find(x => x.id === userId);
  if (!u) { adminToast('Không tìm thấy người dùng!', 'error'); return; }
  u.balance = (u.balance || 0) + amount;

  // Tạo thông báo tự động
  if (!data.notifications) data.notifications = [];
  if (!data.settings.nextNotificationId) data.settings.nextNotificationId = 1;
  const note = document.getElementById('balance-note').value.trim();
  data.notifications.push({
    id: data.settings.nextNotificationId++,
    userId: userId,
    title: '💰 Tài khoản được cộng tiền',
    message: `Số dư của bạn được cộng thêm ${fmtMoney(amount)}.${note ? ' Lý do: ' + note : ''} Số dư hiện tại: ${fmtMoney(u.balance)}.`,
    type: 'success',
    read: false,
    createdAt: new Date().toISOString()
  });

  saveData(data);
  closeAddBalanceModal();
  renderUsersTable();
  adminToast(`Đã cộng ${fmtMoney(amount)} cho ${u.fullname || u.username}!`, 'success');
}

function openSendNotifUserModal(userId) {
  const data = getData();
  const u = (data.users || []).find(x => x.id === userId);
  if (!u) return;
  document.getElementById('snu-userId').value = userId;
  document.getElementById('snu-title').value = '';
  document.getElementById('snu-message').value = '';
  document.getElementById('snu-type').value = 'info';
  document.getElementById('snu-userInfo').innerHTML = `
    <i class="fas fa-user-circle" style="color:var(--primary);margin-right:6px"></i>
    Gửi đến: <strong>${u.fullname || u.username}</strong> (${u.email || u.phone || '—'})
  `;
  document.getElementById('sendNotifUserModalBg').classList.add('open');
}

function closeSendNotifUserModal() { document.getElementById('sendNotifUserModalBg').classList.remove('open'); }

function saveSendNotifUser() {
  const userId = parseInt(document.getElementById('snu-userId').value);
  const title = document.getElementById('snu-title').value.trim();
  const message = document.getElementById('snu-message').value.trim();
  const type = document.getElementById('snu-type').value;
  if (!title || !message) { adminToast('Vui lòng điền tiêu đề và nội dung!', 'error'); return; }
  const data = getData();
  if (!data.notifications) data.notifications = [];
  if (!data.settings.nextNotificationId) data.settings.nextNotificationId = 1;
  data.notifications.push({
    id: data.settings.nextNotificationId++,
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
  saveData(data);
  closeSendNotifUserModal();
  adminToast('Đã gửi thông báo!', 'success');
}

// ===== NOTIFICATIONS PAGE =====
function renderNotificationsPage() {
  const data = getData();
  const users = data.users || [];

  // Populate recipient dropdown
  const sel = document.getElementById('notif-recipient');
  if (sel) {
    sel.innerHTML = '<option value="all">📢 Gửi tất cả người dùng</option>' +
      users.map(u => `<option value="${u.id}">${u.fullname || u.username} (${u.email || u.phone || '—'})</option>`).join('');
  }

  // Render notification history
  const notifs = [...(data.notifications || [])].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
  const listEl = document.getElementById('notifHistoryList');
  if (!listEl) return;

  if (notifs.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-bell-slash" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>Chưa có thông báo nào được gửi</div>';
    return;
  }

  const typeConfig = {
    info: { icon: 'fa-info-circle', cls: 'notif-type-broadcast' },
    success: { icon: 'fa-check-circle', cls: 'notif-type-success' },
    warning: { icon: 'fa-exclamation-triangle', cls: 'notif-type-warning' },
    promo: { icon: 'fa-gift', cls: 'notif-type-broadcast' },
    error: { icon: 'fa-times-circle', cls: 'notif-type-error' }
  };

  listEl.innerHTML = notifs.map(n => {
    const cfg = typeConfig[n.type] || typeConfig.info;
    const recipient = n.userId === null || n.userId === 'all'
      ? '📢 Tất cả người dùng'
      : (() => { const u = users.find(x => x.id === n.userId); return u ? (u.fullname || u.username) : `User #${n.userId}`; })();
    const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : '—';
    return `<div class="notif-list-item">
      <div class="notif-icon ${cfg.cls}"><i class="fas ${cfg.icon}"></i></div>
      <div class="notif-info">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-meta"><i class="fas fa-user" style="margin-right:4px"></i>${recipient} · <i class="fas fa-clock" style="margin-left:4px;margin-right:4px"></i>${dateStr}</div>
      </div>
      <button class="btn-delete" style="padding:4px 8px;font-size:11px;flex-shrink:0;align-self:flex-start" onclick="deleteNotif(${n.id})"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('');
}

function sendNotification() {
  const recipient = document.getElementById('notif-recipient')?.value;
  const title = document.getElementById('notif-title')?.value.trim();
  const message = document.getElementById('notif-message')?.value.trim();
  const type = document.getElementById('notif-type')?.value || 'info';
  if (!title || !message) { adminToast('Vui lòng điền tiêu đề và nội dung!', 'error'); return; }

  const data = getData();
  if (!data.notifications) data.notifications = [];
  if (!data.settings.nextNotificationId) data.settings.nextNotificationId = 1;

  const userId = (recipient === 'all') ? null : parseInt(recipient);
  data.notifications.push({
    id: data.settings.nextNotificationId++,
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });

  saveData(data);
  document.getElementById('notif-title').value = '';
  document.getElementById('notif-message').value = '';
  renderNotificationsPage();
  const recipientLabel = (recipient === 'all') ? 'tất cả người dùng' : 'người dùng đã chọn';
  adminToast(`Đã gửi thông báo đến ${recipientLabel}!`, 'success');
}

function deleteNotif(id) {
  const data = getData();
  data.notifications = (data.notifications || []).filter(n => n.id !== id);
  saveData(data);
  renderNotificationsPage();
}

function clearAllNotifications() {
  if (!confirm('Xóa tất cả thông báo?')) return;
  const data = getData();
  data.notifications = [];
  saveData(data);
  renderNotificationsPage();
  adminToast('Đã xóa tất cả thông báo!', 'info');
}

