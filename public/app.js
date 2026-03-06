// ===== Auth =====
function getToken() {
    return localStorage.getItem('admin_token');
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleAuthError(res) {
    if (res.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login.html';
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/login.html';
}

// Check auth on page load
(async function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    try {
        const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        // Update user display
        const json = await res.json();
        if (json.success) {
            const nameEl = document.querySelector('.user-name');
            const emailParts = json.data.email.split('@');
            if (nameEl) nameEl.textContent = emailParts[0];
        }
    } catch (_) {
        window.location.href = '/login.html';
    }
})();

// ===== State =====
const API_URL = '/api/products';
let allProducts = [];
let currentFilter = 'all';
let currentSearch = '';
let editingId = null;
let deletingId = null;

// ===== DOM Elements =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const productsTbody = $('#products-tbody');
const tableLoading = $('#table-loading');
const emptyState = $('#empty-state');
const productsTable = $('#products-table');
const searchInput = $('#search-input');
const statsTotal = $('#stat-total');
const statsInfant = $('#stat-infant');
const statsToddler = $('#stat-toddler');
const statsChild = $('#stat-child');

// Modal elements
const productModal = $('#product-modal');
const deleteModal = $('#delete-modal');
const productForm = $('#product-form');
const modalTitle = $('#modal-title');

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
});

// ===== Event Listeners =====
function setupEventListeners() {
    // Add product
    $('#btn-add-product').addEventListener('click', () => openProductModal());

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value.trim();
            renderProducts();
        }, 300);
    });

    // Category filter chips
    $$('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            $$('.chip').forEach((c) => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.category;
            renderProducts();
        });
    });

    // Modal close
    $('#modal-close').addEventListener('click', closeProductModal);
    $('#btn-cancel').addEventListener('click', closeProductModal);
    $('#delete-modal-close').addEventListener('click', closeDeleteModal);
    $('#delete-cancel').addEventListener('click', closeDeleteModal);

    // Modal overlay click
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
    });
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // Form submit
    productForm.addEventListener('submit', handleFormSubmit);

    // Delete confirm
    $('#delete-confirm').addEventListener('click', handleDelete);

    // Dynamic list buttons
    $('#btn-add-image').addEventListener('click', () =>
        addDynamicItem('images-list', 'image')
    );
    $('#btn-add-color').addEventListener('click', () =>
        addDynamicItem('colors-list', 'color')
    );
    $('#btn-add-feature').addEventListener('click', () =>
        addDynamicItem('features-list', 'feature')
    );
    $('#btn-add-highlight').addEventListener('click', () =>
        addDynamicItem('highlights-list', 'highlight')
    );
    $('#btn-add-spec').addEventListener('click', () =>
        addDynamicItem('specs-list', 'spec')
    );

    // Auto-generate slug from name
    $('#form-name').addEventListener('input', (e) => {
        if (!editingId) {
            $('#form-slug').value = slugify(e.target.value);
        }
    });

    // Mobile sidebar toggle
    $('#mobile-toggle').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeDeleteModal();
        }
    });
}

// ===== API =====
async function loadProducts() {
    try {
        showLoading(true);
        const res = await fetch(API_URL, { headers: authHeaders() });
        if (handleAuthError(res)) return;
        const json = await res.json();

        if (json.success) {
            allProducts = json.data;
            updateStats();
            renderProducts();
        } else {
            showToast('Lỗi tải sản phẩm: ' + json.error, 'error');
        }
    } catch (err) {
        showToast('Không thể kết nối server: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function createProduct(data) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (handleAuthError(res)) return { success: false };
    return res.json();
}

async function updateProduct(id, data) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (handleAuthError(res)) return { success: false };
    return res.json();
}

async function deleteProduct(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    if (handleAuthError(res)) return { success: false };
    return res.json();
}

// ===== Rendering =====
function renderProducts() {
    let filtered = [...allProducts];

    // Filter by category
    if (currentFilter !== 'all') {
        filtered = filtered.filter((p) => p.category === currentFilter);
    }

    // Filter by search
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        productsTable.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        productsTable.style.display = 'table';
        emptyState.style.display = 'none';
    }

    productsTbody.innerHTML = filtered
        .map(
            (p) => `
    <tr data-id="${p.id}">
      <td>
        <img
          class="product-thumb"
          src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/48'}"
          alt="${p.name}"
          loading="lazy"
        >
      </td>
      <td>
        <div class="product-name-cell">
          <span class="product-name">${escapeHtml(p.name)}</span>
          <span class="product-slug">${escapeHtml(p.slug)}</span>
        </div>
      </td>
      <td>${escapeHtml(p.brand)}</td>
      <td><span class="category-badge ${p.category}">${categoryLabel(p.category)}</span></td>
      <td><strong>${escapeHtml(p.price)}</strong></td>
      <td>${p.badge ? `<span class="badge-tag ${p.badge_type || ''}">${escapeHtml(p.badge)}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>
        <div class="actions-cell">
          <button class="action-btn edit" title="Chỉnh sửa" onclick="editProduct(${p.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete" title="Xóa" onclick="confirmDelete(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `
        )
        .join('');
}

function updateStats() {
    statsTotal.textContent = allProducts.length;
    statsInfant.textContent = allProducts.filter((p) => p.category === 'infant').length;
    statsToddler.textContent = allProducts.filter((p) => p.category === 'toddler').length;
    statsChild.textContent = allProducts.filter((p) => p.category === 'child').length;
}

function showLoading(show) {
    tableLoading.style.display = show ? 'flex' : 'none';
    if (show) {
        productsTable.style.display = 'none';
        emptyState.style.display = 'none';
    }
}

// ===== Product Modal =====
function openProductModal(product = null) {
    editingId = product ? product.id : null;
    modalTitle.textContent = product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới';

    // Reset form
    productForm.reset();
    $('#form-id').value = '';

    // Clear dynamic lists
    clearDynamicList('images-list');
    clearDynamicList('colors-list');
    clearDynamicList('features-list');
    clearDynamicList('highlights-list');
    clearDynamicList('specs-list');

    if (product) {
        // Populate form
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

        // Populate images
        if (product.images && product.images.length) {
            product.images.forEach((url) => addDynamicItem('images-list', 'image', { url }));
        }

        // Populate colors
        if (product.colors && product.colors.length) {
            product.colors.forEach((c) =>
                addDynamicItem('colors-list', 'color', { name: c.name, hex: c.hex })
            );
        }

        // Populate features
        if (product.features && product.features.length) {
            product.features.forEach((f) =>
                addDynamicItem('features-list', 'feature', { value: f })
            );
        }

        // Populate highlights
        if (product.highlights && product.highlights.length) {
            product.highlights.forEach((h) =>
                addDynamicItem('highlights-list', 'highlight', { value: h })
            );
        }

        // Populate specs
        if (product.specs) {
            Object.entries(product.specs).forEach(([key, val]) =>
                addDynamicItem('specs-list', 'spec', { key, value: val })
            );
        }
    } else {
        // Add empty default items
        addDynamicItem('images-list', 'image');
        addDynamicItem('colors-list', 'color');
        addDynamicItem('features-list', 'feature');
        addDynamicItem('highlights-list', 'highlight');
        addDynamicItem('specs-list', 'spec');
    }

    productModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    productModal.classList.remove('open');
    document.body.style.overflow = '';
    editingId = null;
}

// ===== Edit / Delete =====
function editProduct(id) {
    const product = allProducts.find((p) => p.id === id);
    if (product) openProductModal(product);
}

function confirmDelete(id, name) {
    deletingId = id;
    $('#delete-product-name').textContent = name;
    deleteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    deleteModal.classList.remove('open');
    document.body.style.overflow = '';
    deletingId = null;
}

async function handleDelete() {
    if (!deletingId) return;

    try {
        const json = await deleteProduct(deletingId);
        if (json.success) {
            showToast('Đã xóa sản phẩm thành công!', 'success');
            closeDeleteModal();
            await loadProducts();
        } else {
            showToast('Lỗi: ' + json.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

// ===== Form Submit =====
async function handleFormSubmit(e) {
    e.preventDefault();

    const btnText = $('#btn-submit .btn-text');
    const btnSpinner = $('#btn-submit .btn-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    try {
        const data = collectFormData();

        let json;
        if (editingId) {
            json = await updateProduct(editingId, data);
        } else {
            json = await createProduct(data);
        }

        if (json.success) {
            showToast(
                editingId ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!',
                'success'
            );
            closeProductModal();
            await loadProducts();
        } else {
            showToast('Lỗi: ' + json.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

function collectFormData() {
    return {
        name: $('#form-name').value.trim(),
        slug: $('#form-slug').value.trim(),
        brand: $('#form-brand').value,
        category: $('#form-category').value,
        price: $('#form-price').value.trim(),
        age_range: $('#form-age-range').value.trim(),
        weight: $('#form-weight').value.trim(),
        badge: $('#form-badge').value.trim() || null,
        badge_type: $('#form-badge-type').value || null,
        description: $('#form-description').value.trim(),
        images: collectImages(),
        colors: collectColors(),
        features: collectSimpleList('features-list'),
        highlights: collectSimpleList('highlights-list'),
        specs: collectSpecs(),
    };
}

function collectImages() {
    const items = $$('#images-list .dynamic-item');
    const result = [];
    items.forEach((item) => {
        const val = item.querySelector('input[data-field="url"]').value.trim();
        if (val) result.push(val);
    });
    return result;
}

function collectColors() {
    const items = $$('#colors-list .dynamic-item');
    const result = [];
    items.forEach((item) => {
        const name = item.querySelector('input[data-field="name"]').value.trim();
        const hex = item.querySelector('input[data-field="hex"]').value;
        if (name) result.push({ name, hex });
    });
    return result;
}

function collectSimpleList(listId) {
    const items = $$(`#${listId} .dynamic-item`);
    const result = [];
    items.forEach((item) => {
        const val = item.querySelector('input[data-field="value"]').value.trim();
        if (val) result.push(val);
    });
    return result;
}

function collectSpecs() {
    const items = $$('#specs-list .dynamic-item');
    const result = {};
    items.forEach((item) => {
        const key = item.querySelector('input[data-field="key"]').value.trim();
        const val = item.querySelector('input[data-field="value"]').value.trim();
        if (key) result[key] = val;
    });
    return result;
}

// ===== Dynamic List Management =====
function addDynamicItem(listId, type, data = {}) {
    const list = document.getElementById(listId);
    const item = document.createElement('div');
    item.className = 'dynamic-item';

    const removeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    switch (type) {
        case 'image':
            item.innerHTML = `
        <input type="text" data-field="url" placeholder="https://example.com/image.jpg" value="${escapeAttr(data.url || '')}">
        <button type="button" class="remove-btn" onclick="removeItem(this)">${removeSvg}</button>
      `;
            break;
        case 'color':
            item.innerHTML = `
        <input type="text" data-field="name" placeholder="Tên màu" value="${escapeAttr(data.name || '')}" style="flex:2">
        <input type="color" data-field="hex" value="${data.hex || '#2d2d2d'}">
        <button type="button" class="remove-btn" onclick="removeItem(this)">${removeSvg}</button>
      `;
            break;
        case 'feature':
        case 'highlight':
            item.innerHTML = `
        <input type="text" data-field="value" placeholder="${type === 'feature' ? 'VD: ISOFIX' : 'VD: Xoay 360° dễ dàng'}" value="${escapeAttr(data.value || '')}">
        <button type="button" class="remove-btn" onclick="removeItem(this)">${removeSvg}</button>
      `;
            break;
        case 'spec':
            item.innerHTML = `
        <input type="text" data-field="key" placeholder="Tên thông số" value="${escapeAttr(data.key || '')}" style="flex:1">
        <input type="text" data-field="value" placeholder="Giá trị" value="${escapeAttr(data.value || '')}" style="flex:1.5">
        <button type="button" class="remove-btn" onclick="removeItem(this)">${removeSvg}</button>
      `;
            break;
    }

    list.appendChild(item);
}

function removeItem(btn) {
    const item = btn.closest('.dynamic-item');
    item.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(() => item.remove(), 200);
}

function clearDynamicList(listId) {
    document.getElementById(listId).innerHTML = '';
}

// ===== Toast =====
function showToast(message, type = 'info') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== Utilities =====
function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function categoryLabel(cat) {
    const labels = {
        infant: 'Sơ sinh',
        toddler: 'Trẻ nhỏ',
        child: 'Trẻ lớn',
    };
    return labels[cat] || cat;
}

// Expose to global for onclick handlers
window.editProduct = editProduct;
window.confirmDelete = confirmDelete;
window.removeItem = removeItem;
window.logout = logout;
