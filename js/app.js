/**
 * MMO Shop VN - Frontend Logic
 */

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('mmo_cart') || '[]');
let activeCategoryId = 0;
let currentPage = 1;
const PAGE_SIZE = 12;
let filteredProducts = [];
let modalQty = 1;
let currentModalProduct = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
  const data = getData();
  applySettings(data.settings);
  renderCategories(data);
  renderFeatured(data);
  applyFilters();
  renderCart();
  renderFooterCategories(data);
});

function applySettings(s) {
  document.title = (s.siteName || 'MMO Shop VN') + ' - Tài Nguyên Game';
  const ht = document.getElementById('heroTitle');
  const hs = document.getElementById('heroSubtitle');
  const ann = document.getElementById('announcementText');
  const fb = document.getElementById('footerFb');
  const dc = document.getElementById('footerDc');
  const em = document.getElementById('footerEmail');
  const tg = document.getElementById('footerTg');
  if (ht && s.heroTitle) ht.innerHTML = s.heroTitle.replace(/\n/g, '<br>').replace(/(Số 1|Chất Lượng|Tốt Nhất|MMO)/gi, '<span class="gradient-text">$1</span>');
  if (hs && s.heroSubtitle) hs.innerHTML = s.heroSubtitle.replace(/·/g, '·').replace(/\n/g, '<br>');
  if (ann && s.announcementText) ann.textContent = s.announcementText;
  if (fb) fb.textContent = s.contactFacebook || '';
  if (dc) dc.textContent = s.contactDiscord || '';
  if (em) em.textContent = s.contactEmail || '';
  if (tg) tg.textContent = s.contactTelegram || '';
}

// ===== CATEGORIES =====
function renderCategories(data) {
  const grid = document.getElementById('categoriesGrid');
  const tabs = document.getElementById('filterTabs');
  if (!grid) return;
  const cats = data.categories.filter(c => c.active);
  const products = data.products.filter(p => p.active);

  // Category grid
  grid.innerHTML = cats.map(cat => {
    const count = products.filter(p => p.categoryId === cat.id).length;
    return `<div class="category-card" style="--c:${cat.color}" onclick="filterByCategory(${cat.id},null)" data-cat="${cat.id}">
      <div class="cat-icon" style="background:${cat.color}22;color:${cat.color}"><i class="${cat.icon}"></i></div>
      <div class="cat-name">${cat.name}</div>
      <div class="cat-count">${count} sản phẩm</div>
    </div>`;
  }).join('');

  // Filter tabs
  tabs.innerHTML = `<button class="filter-tab active" onclick="filterByCategory(0,this)">Tất cả</button>` +
    cats.map(cat => `<button class="filter-tab" onclick="filterByCategory(${cat.id},this)">${cat.name}</button>`).join('');
}

function renderFooterCategories(data) {
  const el = document.getElementById('footerCategories');
  if (!el) return;
  el.innerHTML = data.categories.filter(c => c.active).map(c =>
    `<li><a href="#" onclick="filterByCategory(${c.id},null);document.getElementById('products').scrollIntoView({behavior:'smooth'});return false"><i class="${c.icon}" style="color:${c.color};margin-right:6px;font-size:12px"></i>${c.name}</a></li>`
  ).join('');
}

// ===== PRODUCTS =====
function renderFeatured(data) {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  const featured = data.products.filter(p => p.active && (p.featured || p.hot)).slice(0, 8);
  grid.innerHTML = featured.map(p => productCardHTML(p, data.categories)).join('');
}

function applyFilters() {
  const data = getData();
  let products = data.products.filter(p => p.active);

  // Category filter
  if (activeCategoryId > 0) products = products.filter(p => p.categoryId === activeCategoryId);

  // Search
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  if (q) products = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    (p.game || '').toLowerCase().includes(q)
  );

  // Price range
  const minP = parseFloat(document.getElementById('minPrice')?.value) || 0;
  const maxP = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
  if (minP > 0) products = products.filter(p => p.price >= minP);
  if (maxP < Infinity) products = products.filter(p => p.price <= maxP);

  // Sort
  const sort = document.getElementById('sortSelect')?.value || 'default';
  if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  else if (sort === 'sold') products.sort((a, b) => (b.sold || 0) - (a.sold || 0));
  else if (sort === 'rating') products.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  filteredProducts = products;
  currentPage = 1;
  renderProductsGrid(data.categories);
}

function renderProductsGrid(categories) {
  const grid = document.getElementById('productsGrid');
  const btn = document.getElementById('loadMoreBtn');
  if (!grid) return;

  if (!categories) categories = getData().categories;
  const slice = filteredProducts.slice(0, currentPage * PAGE_SIZE);
  grid.innerHTML = slice.length > 0
    ? slice.map(p => productCardHTML(p, categories)).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)"><i class="fas fa-search" style="font-size:48px;display:block;margin-bottom:12px"></i>Không tìm thấy sản phẩm phù hợp</div>`;

  if (btn) btn.classList.toggle('hidden', slice.length >= filteredProducts.length);
}

function loadMore() {
  currentPage++;
  renderProductsGrid();
}

function filterByCategory(catId, btn) {
  activeCategoryId = catId;
  // Update tabs
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Update category cards
  document.querySelectorAll('.category-card').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.cat) === catId);
  });
  applyFilters();
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
}

function handleSearch() {
  applyFilters();
}

function productCardHTML(p, categories) {
  const cat = categories.find(c => c.id === p.categoryId);
  const discount = p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const stars = '★'.repeat(Math.round(p.rating || 5)) + '☆'.repeat(5 - Math.round(p.rating || 5));
  const badgeMap = { 'HOT': 'badge-hot', 'SALE': 'badge-sale', 'VIP': 'badge-vip', 'HIẾM': 'badge-rare', 'MỚI': 'badge-new' };
  const imgSeed = p.image || `https://picsum.photos/seed/${p.id}/400/300`;
  return `<div class="product-card" onclick="openModal(${p.id})">
    <div class="product-img">
      <img src="${imgSeed}" alt="${p.name}" loading="lazy" onerror="this.src='https://picsum.photos/seed/default${p.id}/400/300'">
      ${p.badge ? `<span class="product-badge ${badgeMap[p.badge] || 'badge-hot'}">${p.badge}</span>` : ''}
      ${p.stock <= 5 && p.stock > 0 ? `<span class="stock-low">Còn ${p.stock}</span>` : ''}
    </div>
    <div class="product-body">
      <div class="product-game">${p.game || (cat ? cat.name : '')}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-rating">
        <span class="stars">${'★'.repeat(Math.floor(p.rating || 5))}</span>
        <span>${(p.rating || 5).toFixed(1)}</span>
        <span>(${p.reviews || 0})</span>
      </div>
      <div class="product-price">
        <span class="price-current">${formatPrice(p.price)}</span>
        ${p.originalPrice > p.price ? `<span class="price-original">${formatPrice(p.originalPrice)}</span><span class="price-discount">-${discount}%</span>` : ''}
      </div>
      <div class="product-meta">
        <span><i class="fas fa-box"></i> ${p.stock >= 999 ? '∞' : p.stock} kho</span>
        <span><i class="fas fa-fire"></i> Đã bán: ${(p.sold || 0).toLocaleString()}</span>
      </div>
      <div class="product-actions" onclick="event.stopPropagation()">
        <button class="btn-cart" onclick="addToCart(${p.id});event.stopPropagation()"><i class="fas fa-cart-plus"></i> Thêm vào giỏ</button>
        <button class="btn-view" onclick="openModal(${p.id});event.stopPropagation()" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
      </div>
    </div>
  </div>`;
}

// ===== MODAL =====
function openModal(productId) {
  const data = getData();
  const p = data.products.find(x => x.id === productId);
  if (!p) return;
  currentModalProduct = p;
  modalQty = 1;

  const cat = data.categories.find(c => c.id === p.categoryId);
  const discount = p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const imgSeed = p.image || `https://picsum.photos/seed/${p.id}/400/300`;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-img">
      <img src="${imgSeed}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/default${p.id}/400/300'">
    </div>
    <div class="modal-info">
      <div class="modal-game">${p.game || (cat ? cat.name : '')}</div>
      <h2 class="modal-name">${p.name}</h2>
      <div class="modal-rating">
        <span class="stars">${'★'.repeat(Math.floor(p.rating || 5))}</span>
        <strong>${(p.rating || 5).toFixed(1)}</strong>
        <span>(${p.reviews || 0} đánh giá)</span>
        <span>·</span>
        <span>Đã bán: <strong style="color:var(--accent)">${(p.sold || 0).toLocaleString()}</strong></span>
      </div>
      <div class="modal-price">
        <span class="price-current">${formatPrice(p.price)}</span>
        ${p.originalPrice > p.price ? `<span class="price-original">${formatPrice(p.originalPrice)}</span><span class="price-discount">-${discount}%</span>` : ''}
      </div>
      <div class="modal-stock"><i class="fas fa-check-circle"></i> Còn ${p.stock >= 999 ? 'không giới hạn' : p.stock + ' sản phẩm'} trong kho</div>
      <p class="modal-desc">${p.description}</p>
      ${p.details ? `<div class="modal-details">${p.details}</div>` : ''}
      <div class="modal-qty-row">
        <label>Số lượng:</label>
        <div class="qty-control">
          <button onclick="changeModalQty(-1)"><i class="fas fa-minus"></i></button>
          <span id="modalQtyVal">1</span>
          <button onclick="changeModalQty(1)"><i class="fas fa-plus"></i></button>
        </div>
        <span style="color:var(--muted);font-size:13px">Tổng: <strong style="color:var(--accent)" id="modalTotal">${formatPrice(p.price)}</strong></span>
      </div>
      <div class="modal-btns">
        <button class="btn-add-modal" onclick="addToCart(${p.id},document.getElementById('modalQtyVal').textContent*1);showToast('Đã thêm vào giỏ hàng!','success')">
          <i class="fas fa-cart-plus"></i> Thêm vào giỏ
        </button>
        <button class="btn-buy-modal" onclick="addToCart(${p.id},document.getElementById('modalQtyVal').textContent*1);closeModal();toggleCart()">
          <i class="fas fa-bolt"></i> Mua ngay
        </button>
      </div>
    </div>`;

  document.getElementById('productModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function changeModalQty(delta) {
  if (!currentModalProduct) return;
  modalQty = Math.max(1, Math.min(modalQty + delta, currentModalProduct.stock >= 999 ? 99 : currentModalProduct.stock));
  document.getElementById('modalQtyVal').textContent = modalQty;
  document.getElementById('modalTotal').textContent = formatPrice(currentModalProduct.price * modalQty);
}

function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow = '';
  currentModalProduct = null;
}

function handleModalClick(e) {
  if (e.target === document.getElementById('productModal')) closeModal();
}

// ===== CART =====
function saveCart() { localStorage.setItem('mmo_cart', JSON.stringify(cart)); }

function addToCart(productId, qty = 1) {
  const data = getData();
  const p = data.products.find(x => x.id === productId);
  if (!p) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, p.stock >= 999 ? 99 : p.stock);
  } else {
    cart.push({ id: productId, qty, name: p.name, price: p.price, image: p.image || `https://picsum.photos/seed/${p.id}/400/300` });
  }
  saveCart();
  renderCart();
  showToast('Đã thêm vào giỏ hàng!', 'success');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function updateCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function clearCart() {
  if (!confirm('Xóa tất cả sản phẩm trong giỏ hàng?')) return;
  cart = [];
  saveCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const count = document.getElementById('cartCount');
  if (!container) return;

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  if (count) count.textContent = totalQty;

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-cart"></i><p>Giỏ hàng trống</p><p style="font-size:13px;margin-top:4px">Thêm sản phẩm để bắt đầu mua hàng</p></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='https://picsum.photos/seed/cart${item.id}/400/300'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateCartQty(${item.id},-1)"><i class="fas fa-minus"></i></button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="updateCartQty(${item.id},1)"><i class="fas fa-plus"></i></button>
          <button class="btn-remove-item" onclick="removeFromCart(${item.id})" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');

  if (footer) {
    footer.style.display = 'block';
    document.getElementById('cartTotal').textContent = formatPrice(total);
  }
}

function toggleCart() {
  document.getElementById('cartSidebar').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open');
}

// ===== CHECKOUT =====
function openCheckout() {
  if (cart.length === 0) { showToast('Giỏ hàng đang trống!', 'error'); return; }
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  document.getElementById('checkoutContent').innerHTML = `
    <div class="checkout-summary">
      ${cart.map(i => `<div class="row"><span>${i.name} x${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></div>`).join('')}
      <div class="row"><span>Tổng thanh toán</span><span>${formatPrice(total)}</span></div>
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:7px">Họ tên</label>
      <input type="text" id="co-name" placeholder="Nguyễn Văn A" style="width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:14px;font-family:inherit">
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:7px">Số điện thoại / Email</label>
      <input type="text" id="co-contact" placeholder="0912345678 hoặc email@gmail.com" style="width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:14px;font-family:inherit">
    </div>
    <div class="form-group" style="margin-bottom:20px">
      <label style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:7px">Phương thức thanh toán</label>
      <select id="co-payment" style="width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:14px;font-family:inherit;cursor:pointer">
        <option value="Momo">💗 Ví Momo</option>
        <option value="Banking">🏦 Chuyển khoản ngân hàng</option>
        <option value="Viettel Money">📱 Viettel Money</option>
        <option value="ZaloPay">💙 ZaloPay</option>
      </select>
    </div>
    <button class="btn-confirm" onclick="confirmOrder()"><i class="fas fa-check-circle"></i> Xác nhận đặt hàng - ${formatPrice(total)}</button>`;

  document.getElementById('checkoutModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
  document.body.style.overflow = '';
}

function handleCheckoutClick(e) {
  if (e.target === document.getElementById('checkoutModal')) closeCheckout();
}

function confirmOrder() {
  const name = document.getElementById('co-name')?.value.trim();
  const contact = document.getElementById('co-contact')?.value.trim();
  const payment = document.getElementById('co-payment')?.value;
  if (!name || !contact) { showToast('Vui lòng điền đầy đủ thông tin!', 'error'); return; }

  const data = getData();
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const newOrder = {
    id: data.settings.nextOrderId++,
    date: new Date().toISOString(),
    customer: { name, email: contact.includes('@') ? contact : '', phone: !contact.includes('@') ? contact : '' },
    items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.price })),
    total, status: 'pending', paymentMethod: payment
  };
  data.orders.unshift(newOrder);
  saveData(data);

  cart = [];
  saveCart();
  renderCart();
  closeCheckout();
  toggleCart();

  document.getElementById('checkoutContent').innerHTML = '';
  showToast('🎉 Đặt hàng thành công! Chúng tôi sẽ liên hệ bạn sớm.', 'success');
  setTimeout(() => showToast(`📦 Mã đơn hàng: #${newOrder.id}`, 'info'), 600);
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.innerHTML = `<i class="fas ${icons[type] || icons.info} toast-icon"></i><span>${msg}</span>`;
  container.appendChild(div);
  setTimeout(() => { div.classList.add('out'); setTimeout(() => div.remove(), 300); }, 3000);
}

// ===== HELPERS =====
function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}
