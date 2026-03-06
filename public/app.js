// ===== Auth State =====
let authToken = localStorage.getItem('cms_token') || null;

// ===== State =====
let allProducts = [];
let allBrands = [];
let allCategories = [];
let currentFilter = 'all';
let currentSearch = '';
let editingId = null;
let deletingId = null;
let deletingType = 'product';
let currentPage = 'dashboard';

// ===== DOM =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const loginScreen = $('#login-screen');
const loginForm = $('#login-form');
const loginError = $('#login-error');
const productsTbody = $('#products-tbody');
const tableLoading = $('#table-loading');
const emptyState = $('#empty-state');
const productsTable = $('#products-table');
const searchInput = $('#search-input');
const statsTotal = $('#stat-total');
const statsInfant = $('#stat-infant');
const statsToddler = $('#stat-toddler');
const statsChild = $('#stat-child');
const productModal = $('#product-modal');
const deleteModal = $('#delete-modal');
const productForm = $('#product-form');
const modalTitle = $('#modal-title');
const itemModal = $('#item-modal');
const itemForm = $('#item-form');
const headerActions = $('#header-actions');

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// ===== Auth =====
async function checkAuth() {
    if (!authToken) { showLogin(); return; }
    try {
        const res = await fetch('/api/auth/check', { headers: { Authorization: `Bearer ${authToken}` } });
        const json = await res.json();
        if (json.success && json.authenticated) showDashboard(json.user);
        else logout();
    } catch { showDashboard({ username: 'Admin' }); }
}

function showLogin() {
    loginScreen.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function showDashboard(user) {
    loginScreen.classList.add('hidden');
    document.body.style.overflow = '';
    const su = $('#sidebar-username');
    if (su && user) su.textContent = user.username || 'Admin';
    navigateTo('dashboard');
}

async function handleLogin(e) {
    e.preventDefault();
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    if (!username || !password) return;
    const btnText = $('#login-submit .btn-text');
    const btnSpinner = $('#login-submit .btn-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';
    loginError.style.display = 'none';
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (json.success) {
            authToken = json.data.token;
            localStorage.setItem('cms_token', authToken);
            showDashboard(json.data.user);
            loginForm.reset();
        } else {
            loginError.textContent = json.error;
            loginError.style.display = 'block';
        }
    } catch { loginError.textContent = 'Không thể kết nối server'; loginError.style.display = 'block'; }
    finally { btnText.style.display = 'inline'; btnSpinner.style.display = 'none'; }
}

function logout() {
    authToken = null;
    localStorage.removeItem('cms_token');
    allProducts = []; allBrands = []; allCategories = [];
    showLogin();
}

function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${authToken}`, ...extra };
}

// ===== Page Navigation =====
function navigateTo(page) {
    currentPage = page;

    // Toggle page visibility
    $('#page-dashboard').style.display = page === 'dashboard' || page === 'products' ? '' : 'none';
    $('#page-brands').style.display = page === 'brands' ? '' : 'none';
    $('#page-categories').style.display = page === 'categories' ? '' : 'none';

    // Update nav active state
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = $(`[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    // Update header
    const titles = {
        dashboard: ['Quản lý sản phẩm', 'Quản lý danh sách ghế ô tô trẻ em'],
        products: ['Quản lý sản phẩm', 'Quản lý danh sách ghế ô tô trẻ em'],
        brands: ['Quản lý thương hiệu', 'Thêm, sửa, xóa thương hiệu sản phẩm'],
        categories: ['Quản lý danh mục', 'Thêm, sửa, xóa danh mục sản phẩm'],
    };
    const [t, s] = titles[page] || titles.dashboard;
    $('#page-title').textContent = t;
    $('#page-subtitle').textContent = s;

    // Update header action button
    const addBtns = {
        dashboard: `<button class="btn btn-primary" id="btn-add-product" onclick="openProductModal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Thêm sản phẩm</button>`,
        products: `<button class="btn btn-primary" id="btn-add-product" onclick="openProductModal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Thêm sản phẩm</button>`,
        brands: `<button class="btn btn-primary" onclick="openItemModal('brand')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Thêm thương hiệu</button>`,
        categories: `<button class="btn btn-primary" onclick="openItemModal('category')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Thêm danh mục</button>`,
    };
    headerActions.innerHTML = addBtns[page] || addBtns.dashboard;

    // Load data
    if (page === 'dashboard' || page === 'products') loadProducts();
    else if (page === 'brands') loadBrands();
    else if (page === 'categories') loadCategories();

    // Close mobile sidebar
    $('#sidebar').classList.remove('open');
}

// ===== Event Listeners =====
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    $('#btn-logout').addEventListener('click', logout);

    // Sidebar navigation
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { currentSearch = e.target.value.trim(); renderProducts(); }, 300);
    });

    // Category filter chips
    $$('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            $$('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.category;
            renderProducts();
        });
    });

    // Product modal
    $('#modal-close').addEventListener('click', closeProductModal);
    $('#btn-cancel').addEventListener('click', closeProductModal);
    productModal.addEventListener('click', e => { if (e.target === productModal) closeProductModal(); });
    productForm.addEventListener('submit', handleFormSubmit);

    // Delete modal
    $('#delete-modal-close').addEventListener('click', closeDeleteModal);
    $('#delete-cancel').addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });
    $('#delete-confirm').addEventListener('click', handleDelete);

    // Item (brand/category) modal
    $('#item-modal-close').addEventListener('click', closeItemModal);
    $('#item-cancel').addEventListener('click', closeItemModal);
    itemModal.addEventListener('click', e => { if (e.target === itemModal) closeItemModal(); });
    itemForm.addEventListener('submit', handleItemSubmit);
    $('#item-form-name').addEventListener('input', e => {
        if (!$('#item-form-id').value) $('#item-form-slug').value = slugify(e.target.value);
    });

    // Dynamic list buttons
    $('#btn-add-image').addEventListener('click', () => addDynamicItem('images-list', 'image'));
    $('#btn-add-color').addEventListener('click', () => addDynamicItem('colors-list', 'color'));
    $('#btn-add-feature').addEventListener('click', () => addDynamicItem('features-list', 'feature'));
    $('#btn-add-highlight').addEventListener('click', () => addDynamicItem('highlights-list', 'highlight'));
    $('#btn-add-spec').addEventListener('click', () => addDynamicItem('specs-list', 'spec'));

    // Auto-slug for product name
    $('#form-name').addEventListener('input', e => { if (!editingId) $('#form-slug').value = slugify(e.target.value); });
    $('#mobile-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeProductModal(); closeDeleteModal(); closeItemModal(); }
    });
}

// ===== Products API =====
async function loadProducts() {
    try {
        showLoading(true);
        const res = await fetch('/api/products', { headers: authHeaders() });
        if (res.status === 401) { logout(); return; }
        const json = await res.json();
        if (json.success) { allProducts = json.data; updateStats(); renderProducts(); }
        else showToast('Lỗi tải sản phẩm: ' + json.error, 'error');
    } catch (err) { showToast('Không thể kết nối: ' + err.message, 'error'); }
    finally { showLoading(false); }
}

async function createProduct(data) {
    const res = await fetch('/api/products', { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data) });
    if (res.status === 401) { logout(); return { success: false }; }
    return res.json();
}

async function updateProduct(id, data) {
    const res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data) });
    if (res.status === 401) { logout(); return { success: false }; }
    return res.json();
}

async function deleteProductApi(id) {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { logout(); return { success: false }; }
    return res.json();
}

// ===== Brands API =====
async function loadBrands() {
    try {
        $('#brands-loading').style.display = 'flex';
        $('#brands-table').style.display = 'none';
        $('#brands-empty').style.display = 'none';
        const res = await fetch('/api/brands', { headers: authHeaders() });
        if (res.status === 401) { logout(); return; }
        const json = await res.json();
        if (json.success) { allBrands = json.data; renderBrands(); }
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
    finally { $('#brands-loading').style.display = 'none'; }
}

function renderBrands() {
    const tbody = $('#brands-tbody');
    if (!allBrands.length) {
        $('#brands-table').style.display = 'none';
        $('#brands-empty').style.display = 'flex';
        return;
    }
    $('#brands-table').style.display = 'table';
    $('#brands-empty').style.display = 'none';
    tbody.innerHTML = allBrands.map(b => `
    <tr>
      <td><strong>${escapeHtml(b.name)}</strong></td>
      <td><span class="product-slug">${escapeHtml(b.slug)}</span></td>
      <td>${escapeHtml(b.description || '—')}</td>
      <td><span class="category-badge ${b.is_active ? 'infant' : 'child'}">${b.is_active ? 'Hoạt động' : 'Ẩn'}</span></td>
      <td>${b.sort_order}</td>
      <td><div class="actions-cell">
        <button class="action-btn edit" onclick="editItem('brand',${b.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="action-btn delete" onclick="deleteItem('brand',${b.id},'${escapeHtml(b.name).replace(/'/g, "\\'")}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div></td>
    </tr>
  `).join('');
}

// ===== Categories API =====
async function loadCategories() {
    try {
        $('#categories-loading').style.display = 'flex';
        $('#categories-table').style.display = 'none';
        $('#categories-empty').style.display = 'none';
        const res = await fetch('/api/categories', { headers: authHeaders() });
        if (res.status === 401) { logout(); return; }
        const json = await res.json();
        if (json.success) { allCategories = json.data; renderCategories(); }
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
    finally { $('#categories-loading').style.display = 'none'; }
}

function renderCategories() {
    const tbody = $('#categories-tbody');
    if (!allCategories.length) {
        $('#categories-table').style.display = 'none';
        $('#categories-empty').style.display = 'flex';
        return;
    }
    $('#categories-table').style.display = 'table';
    $('#categories-empty').style.display = 'none';
    tbody.innerHTML = allCategories.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td><span class="product-slug">${escapeHtml(c.slug)}</span></td>
      <td>${escapeHtml(c.description || '—')}</td>
      <td><span class="category-badge ${c.is_active ? 'infant' : 'child'}">${c.is_active ? 'Hoạt động' : 'Ẩn'}</span></td>
      <td>${c.sort_order}</td>
      <td><div class="actions-cell">
        <button class="action-btn edit" onclick="editItem('category',${c.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="action-btn delete" onclick="deleteItem('category',${c.id},'${escapeHtml(c.name).replace(/'/g, "\\'")}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div></td>
    </tr>
  `).join('');
}

// ===== Item Modal (Brand/Category) =====
function openItemModal(type, item = null) {
    $('#item-form-type').value = type;
    $('#item-form-id').value = item ? item.id : '';
    $('#item-modal-title').textContent = item
        ? `Chỉnh sửa ${type === 'brand' ? 'thương hiệu' : 'danh mục'}`
        : `Thêm ${type === 'brand' ? 'thương hiệu' : 'danh mục'} mới`;

    itemForm.reset();
    if (item) {
        $('#item-form-name').value = item.name || '';
        $('#item-form-slug').value = item.slug || '';
        $('#item-form-description').value = item.description || '';
        $('#item-form-sort').value = item.sort_order || 0;
        $('#item-form-active').checked = item.is_active !== false;
    } else {
        $('#item-form-active').checked = true;
    }

    itemModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeItemModal() {
    itemModal.classList.remove('open');
    document.body.style.overflow = '';
}

function editItem(type, id) {
    const list = type === 'brand' ? allBrands : allCategories;
    const item = list.find(i => i.id === id);
    if (item) openItemModal(type, item);
}

function deleteItem(type, id, name) {
    deletingId = id;
    deletingType = type;
    $('#delete-product-name').textContent = name;
    deleteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

async function handleItemSubmit(e) {
    e.preventDefault();
    const type = $('#item-form-type').value;
    const id = $('#item-form-id').value;
    const endpoint = type === 'brand' ? '/api/brands' : '/api/categories';

    const btnText = $('#item-submit .btn-text');
    const btnSpinner = $('#item-submit .btn-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    const data = {
        name: $('#item-form-name').value.trim(),
        slug: $('#item-form-slug').value.trim(),
        description: $('#item-form-description').value.trim(),
        sort_order: parseInt($('#item-form-sort').value) || 0,
        is_active: $('#item-form-active').checked,
    };

    try {
        const res = await fetch(id ? `${endpoint}/${id}` : endpoint, {
            method: id ? 'PUT' : 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        if (res.status === 401) { logout(); return; }
        const json = await res.json();
        if (json.success) {
            showToast(id ? 'Cập nhật thành công!' : 'Thêm mới thành công!', 'success');
            closeItemModal();
            if (type === 'brand') loadBrands(); else loadCategories();
        } else showToast('Lỗi: ' + json.error, 'error');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
    finally { btnText.style.display = 'inline'; btnSpinner.style.display = 'none'; }
}

// ===== Products Render =====
function renderProducts() {
    let filtered = [...allProducts];
    if (currentFilter !== 'all') filtered = filtered.filter(p => p.category === currentFilter);
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
        );
    }
    if (!filtered.length) {
        productsTable.style.display = 'none'; emptyState.style.display = 'flex';
    } else {
        productsTable.style.display = 'table'; emptyState.style.display = 'none';
    }
    productsTbody.innerHTML = filtered.map(p => `
    <tr>
      <td><img class="product-thumb" src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/48'}" alt="${p.name}" loading="lazy"></td>
      <td><div class="product-name-cell"><span class="product-name">${escapeHtml(p.name)}</span><span class="product-slug">${escapeHtml(p.slug)}</span></div></td>
      <td>${escapeHtml(p.brand)}</td>
      <td><span class="category-badge ${p.category}">${categoryLabel(p.category)}</span></td>
      <td><strong>${escapeHtml(p.price)}</strong></td>
      <td>${p.badge ? `<span class="badge-tag ${p.badge_type || ''}">${escapeHtml(p.badge)}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td><div class="actions-cell">
        <button class="action-btn edit" onclick="editProduct(${p.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="action-btn delete" onclick="confirmDelete(${p.id},'${escapeHtml(p.name).replace(/'/g, "\\'")}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div></td>
    </tr>
  `).join('');
}

function updateStats() {
    statsTotal.textContent = allProducts.length;
    statsInfant.textContent = allProducts.filter(p => p.category === 'infant').length;
    statsToddler.textContent = allProducts.filter(p => p.category === 'toddler').length;
    statsChild.textContent = allProducts.filter(p => p.category === 'child').length;
}

function showLoading(show) {
    tableLoading.style.display = show ? 'flex' : 'none';
    if (show) { productsTable.style.display = 'none'; emptyState.style.display = 'none'; }
}

// ===== Product Modal =====
function openProductModal(product = null) {
    editingId = product ? product.id : null;
    modalTitle.textContent = product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới';
    productForm.reset();
    $('#form-id').value = '';
    ['images-list', 'colors-list', 'features-list', 'highlights-list', 'specs-list'].forEach(id => clearDynamicList(id));

    // Populate brand select dynamically
    const brandSelect = $('#form-brand');
    brandSelect.innerHTML = '<option value="">Chọn thương hiệu</option>';
    allBrands.forEach(b => {
        brandSelect.innerHTML += `<option value="${escapeAttr(b.name)}">${escapeHtml(b.name)}</option>`;
    });
    // Fallback if no brands loaded
    if (!allBrands.length) {
        brandSelect.innerHTML += '<option value="Nhật Hạ Platinum">Nhật Hạ Platinum</option><option value="Nhật Hạ Gold">Nhật Hạ Gold</option>';
    }

    // Populate category select dynamically
    const catSelect = $('#form-category');
    catSelect.innerHTML = '<option value="">Chọn danh mục</option>';
    allCategories.forEach(c => {
        catSelect.innerHTML += `<option value="${escapeAttr(c.slug)}">${escapeHtml(c.name)}</option>`;
    });
    if (!allCategories.length) {
        catSelect.innerHTML += '<option value="infant">Sơ sinh</option><option value="toddler">Trẻ nhỏ</option><option value="child">Trẻ lớn</option>';
    }

    if (product) {
        $('#form-id').value = product.id;
        $('#form-name').value = product.name || '';
        $('#form-slug').value = product.slug || '';
        $('#form-brand').value = product.brand || '';
        $('#form-category').value = product.category || '';
        $('#form-price').value = product.price || '';
        $('#form-age-range').value = product.age_range || '';
        $('#form-weight').value = product.weight || '';
        $('#form-badge').value = product.badge || '';
        $('#form-badge-type').value = product.badge_type || '';
        $('#form-description').value = product.description || '';
        if (product.images?.length) product.images.forEach(url => addDynamicItem('images-list', 'image', { url }));
        if (product.colors?.length) product.colors.forEach(c => addDynamicItem('colors-list', 'color', { name: c.name, hex: c.hex }));
        if (product.features?.length) product.features.forEach(f => addDynamicItem('features-list', 'feature', { value: f }));
        if (product.highlights?.length) product.highlights.forEach(h => addDynamicItem('highlights-list', 'highlight', { value: h }));
        if (product.specs) Object.entries(product.specs).forEach(([key, val]) => addDynamicItem('specs-list', 'spec', { key, value: val }));
    } else {
        addDynamicItem('images-list', 'image');
        addDynamicItem('colors-list', 'color');
        addDynamicItem('features-list', 'feature');
        addDynamicItem('highlights-list', 'highlight');
        addDynamicItem('specs-list', 'spec');
    }

    // Load brands/categories for the product form if not loaded
    if (!allBrands.length) fetch('/api/brands', { headers: authHeaders() }).then(r => r.json()).then(j => { if (j.success) allBrands = j.data; });
    if (!allCategories.length) fetch('/api/categories', { headers: authHeaders() }).then(r => r.json()).then(j => { if (j.success) allCategories = j.data; });

    productModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() { productModal.classList.remove('open'); document.body.style.overflow = ''; editingId = null; }

function editProduct(id) {
    const p = allProducts.find(x => x.id === id);
    if (p) openProductModal(p);
}

function confirmDelete(id, name) {
    deletingId = id;
    deletingType = 'product';
    $('#delete-product-name').textContent = name;
    deleteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() { deleteModal.classList.remove('open'); document.body.style.overflow = ''; deletingId = null; deletingType = 'product'; }

async function handleDelete() {
    if (!deletingId) return;
    try {
        let json;
        if (deletingType === 'brand') {
            const res = await fetch(`/api/brands/${deletingId}`, { method: 'DELETE', headers: authHeaders() });
            if (res.status === 401) { logout(); return; }
            json = await res.json();
        } else if (deletingType === 'category') {
            const res = await fetch(`/api/categories/${deletingId}`, { method: 'DELETE', headers: authHeaders() });
            if (res.status === 401) { logout(); return; }
            json = await res.json();
        } else {
            json = await deleteProductApi(deletingId);
        }
        if (json.success) {
            showToast('Đã xóa thành công!', 'success');
            closeDeleteModal();
            if (deletingType === 'brand') loadBrands();
            else if (deletingType === 'category') loadCategories();
            else loadProducts();
        } else showToast('Lỗi: ' + json.error, 'error');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const btnText = $('#btn-submit .btn-text'); const btnSpinner = $('#btn-submit .btn-spinner');
    btnText.style.display = 'none'; btnSpinner.style.display = 'inline-flex';
    try {
        const data = collectFormData();
        const json = editingId ? await updateProduct(editingId, data) : await createProduct(data);
        if (json.success) {
            showToast(editingId ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!', 'success');
            closeProductModal(); await loadProducts();
        } else showToast('Lỗi: ' + json.error, 'error');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
    finally { btnText.style.display = 'inline'; btnSpinner.style.display = 'none'; }
}

function collectFormData() {
    return {
        name: $('#form-name').value.trim(), slug: $('#form-slug').value.trim(),
        brand: $('#form-brand').value, category: $('#form-category').value,
        price: $('#form-price').value.trim(), age_range: $('#form-age-range').value.trim(),
        weight: $('#form-weight').value.trim(), badge: $('#form-badge').value.trim() || null,
        badge_type: $('#form-badge-type').value || null, description: $('#form-description').value.trim(),
        images: collectImages(), colors: collectColors(),
        features: collectSimpleList('features-list'), highlights: collectSimpleList('highlights-list'),
        specs: collectSpecs(),
    };
}

function collectImages() { const r = []; $$('#images-list .dynamic-item').forEach(i => { const v = i.querySelector('input[data-field="url"]').value.trim(); if (v) r.push(v); }); return r; }
function collectColors() { const r = []; $$('#colors-list .dynamic-item').forEach(i => { const n = i.querySelector('input[data-field="name"]').value.trim(); const h = i.querySelector('input[data-field="hex"]').value; if (n) r.push({ name: n, hex: h }); }); return r; }
function collectSimpleList(id) { const r = []; $$(`#${id} .dynamic-item`).forEach(i => { const v = i.querySelector('input[data-field="value"]').value.trim(); if (v) r.push(v); }); return r; }
function collectSpecs() { const r = {}; $$('#specs-list .dynamic-item').forEach(i => { const k = i.querySelector('input[data-field="key"]').value.trim(); const v = i.querySelector('input[data-field="value"]').value.trim(); if (k) r[k] = v; }); return r; }

// ===== Dynamic Lists =====
function addDynamicItem(listId, type, data = {}) {
    const list = document.getElementById(listId);
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    const rmSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const templates = {
        image: `<input type="text" data-field="url" placeholder="https://example.com/image.jpg" value="${escapeAttr(data.url || '')}"><button type="button" class="remove-btn" onclick="removeItem(this)">${rmSvg}</button>`,
        color: `<input type="text" data-field="name" placeholder="Tên màu" value="${escapeAttr(data.name || '')}" style="flex:2"><input type="color" data-field="hex" value="${data.hex || '#2d2d2d'}"><button type="button" class="remove-btn" onclick="removeItem(this)">${rmSvg}</button>`,
        feature: `<input type="text" data-field="value" placeholder="VD: ISOFIX" value="${escapeAttr(data.value || '')}"><button type="button" class="remove-btn" onclick="removeItem(this)">${rmSvg}</button>`,
        highlight: `<input type="text" data-field="value" placeholder="VD: Xoay 360°" value="${escapeAttr(data.value || '')}"><button type="button" class="remove-btn" onclick="removeItem(this)">${rmSvg}</button>`,
        spec: `<input type="text" data-field="key" placeholder="Tên" value="${escapeAttr(data.key || '')}" style="flex:1"><input type="text" data-field="value" placeholder="Giá trị" value="${escapeAttr(data.value || '')}" style="flex:1.5"><button type="button" class="remove-btn" onclick="removeItem(this)">${rmSvg}</button>`,
    };
    item.innerHTML = templates[type] || '';
    list.appendChild(item);
}

function removeItem(btn) { const i = btn.closest('.dynamic-item'); i.style.animation = 'toastOut 0.2s ease forwards'; setTimeout(() => i.remove(), 200); }
function clearDynamicList(id) { document.getElementById(id).innerHTML = ''; }

// ===== Toast =====
function showToast(message, type = 'info') {
    const c = $('#toast-container'); const t = document.createElement('div'); t.className = `toast ${type}`;
    const icons = { success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' };
    t.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ===== Utils =====
function slugify(t) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escapeAttr(s) { if (!s) return ''; return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function categoryLabel(c) { const cat = allCategories.find(x => x.slug === c); if (cat) return cat.name; const l = { infant: 'Sơ sinh', toddler: 'Trẻ nhỏ', child: 'Trẻ lớn' }; return l[c] || c; }

// Globals
window.editProduct = editProduct;
window.confirmDelete = confirmDelete;
window.removeItem = removeItem;
window.openProductModal = openProductModal;
window.openItemModal = openItemModal;
window.editItem = editItem;
window.deleteItem = deleteItem;
