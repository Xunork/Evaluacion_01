const STORAGE_KEY = 'ferreteria_products_v1';

const state = {
  products: [],
  users: [],
  currentUser: null,
  selectedRole: 'admin'
};

const ADMIN_PASSWORD = 'admin123';

const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const productList = document.getElementById('product-list');
const adminProductList = document.getElementById('admin-product-list');
const adminTab = document.getElementById('admin-tab');
const catalogTab = document.getElementById('catalog-tab');
const loginForm = document.getElementById('login-form');
const userBadge = document.getElementById('user-badge');
const logoutBtn = document.getElementById('logout-btn');
const roleButtons = document.querySelectorAll('.role-btn');
const productForm = document.getElementById('product-form');
const resetFormBtn = document.getElementById('reset-form');

async function init() {
  await loadUsersAndProducts();
  bindEvents();
  renderProducts();
  updateSummary();
  loginScreen.classList.add('active');
}

async function loadUsersAndProducts() {
  try {
    const [usersRes, productsRes] = await Promise.all([
      fetch('./data/users.json'),
      fetch('./data/products.json')
    ]);

    const usersData = await usersRes.json();
    const productsData = await productsRes.json();

    state.users = usersData.users;

    const savedProducts = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    state.products = savedProducts && Array.isArray(savedProducts) && savedProducts.length
      ? savedProducts
      : productsData;
  } catch (error) {
    console.error('Error cargando datos:', error);
    state.users = [
      { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
      { username: 'cliente', password: 'cliente123', role: 'cliente', name: 'Cliente' }
    ];
    state.products = [
      { id: 1, name: 'Taladro', category: 'Herramienta', price: 150000, stock: 5, description: 'Taladro de uso general.' }
    ];
  }
}

function bindEvents() {
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const clientViewBtn = document.getElementById('client-view-btn');

  adminLoginBtn.addEventListener('click', () => {
    state.selectedRole = 'admin';
    roleButtons.forEach((btn) => btn.classList.toggle('active', btn === adminLoginBtn));
    document.getElementById('password').focus();
  });

  clientViewBtn.addEventListener('click', () => {
    state.selectedRole = 'cliente';
    roleButtons.forEach((btn) => btn.classList.toggle('active', btn === clientViewBtn));
    state.currentUser = { username: 'cliente', role: 'cliente', name: 'Cliente' };
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    userBadge.textContent = 'Cliente';
    renderLayout();
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const password = document.getElementById('password').value.trim();

    if (password !== ADMIN_PASSWORD) {
      alert('Contraseña incorrecta. Solo el administrador puede ingresar.');
      return;
    }

    state.currentUser = { username: 'admin', role: 'admin', name: 'Administrador' };
    state.selectedRole = 'admin';
    roleButtons.forEach((btn) => btn.classList.toggle('active', btn === adminLoginBtn));
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    userBadge.textContent = 'Administrador';
    renderLayout();
  });

  catalogTab.addEventListener('click', () => showPanel('catalog'));
  adminTab.addEventListener('click', () => showPanel('admin'));

  logoutBtn.addEventListener('click', () => {
    state.currentUser = null;
    state.selectedRole = 'admin';
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
    loginForm.reset();
    document.getElementById('password').value = '';
    roleButtons.forEach((btn) => btn.classList.toggle('active', btn.id === 'admin-login-btn'));
  });

  productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      alert('Solo el administrador puede modificar el inventario.');
      return;
    }

    const idValue = document.getElementById('product-id').value;
    const newProduct = {
      id: idValue ? Number(idValue) : Date.now(),
      name: document.getElementById('name').value.trim(),
      category: document.getElementById('category').value.trim(),
      price: Number(document.getElementById('price').value),
      stock: Number(document.getElementById('stock').value),
      description: document.getElementById('description').value.trim()
    };

    if (!newProduct.name || !newProduct.category || !newProduct.description || Number.isNaN(newProduct.price) || Number.isNaN(newProduct.stock)) {
      alert('Completa todos los campos correctamente.');
      return;
    }

    if (idValue) {
      state.products = state.products.map((product) =>
        product.id === Number(idValue) ? { ...product, ...newProduct } : product
      );
    } else {
      state.products.unshift(newProduct);
    }

    saveProducts();
    renderProducts();
    resetProductForm();
  });

  resetFormBtn.addEventListener('click', resetProductForm);
}

function renderLayout() {
  const isAdmin = state.currentUser && state.currentUser.role === 'admin';

  adminTab.classList.toggle('hidden-admin', !isAdmin);
  if (!isAdmin) {
    showPanel('catalog');
  } else {
    showPanel('catalog');
  }
}

function showPanel(panelName) {
  const catalogSection = document.getElementById('catalog-section');
  const adminSection = document.getElementById('admin-section');

  catalogSection.classList.toggle('active', panelName === 'catalog');
  adminSection.classList.toggle('active', panelName === 'admin');

  catalogTab.classList.toggle('active', panelName === 'catalog');
  adminTab.classList.toggle('active', panelName === 'admin');
}

function renderProducts() {
  productList.innerHTML = '';

  state.products.forEach((product) => {
    const article = document.createElement('article');
    article.className = `product-card ${product.stock === 0 ? 'out-of-stock' : ''}`;
    article.innerHTML = `
      <div class="card-header">
        <h3>${product.name}</h3>
      </div>
      <div class="card-body">
        <span class="category-tag">${product.category}</span>
        <div class="price">$${formatPrice(product.price)}</div>
        <p>${product.description}</p>
        <div class="stock ${product.stock > 0 ? 'available' : 'zero'}">
          ${product.stock > 0 ? `Disponible: ${product.stock} unidades` : 'Sin stock'}
        </div>
      </div>
    `;
    productList.appendChild(article);
  });

  updateSummary();

  if (state.currentUser && state.currentUser.role === 'admin') {
    renderAdminProducts();
  } else {
    adminProductList.innerHTML = '';
  }
}

function renderAdminProducts() {
  adminProductList.innerHTML = '';

  state.products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'admin-product-card';
    card.innerHTML = `
      <h4>${product.name}</h4>
      <p><strong>Categoría:</strong> ${product.category}</p>
      <p><strong>Precio:</strong> $${formatPrice(product.price)}</p>
      <p><strong>Stock:</strong> ${product.stock}</p>
      <div class="admin-actions">
        <button class="edit-btn" data-id="${product.id}">Editar</button>
        <button class="delete-btn" data-id="${product.id}">Eliminar</button>
      </div>
    `;

    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    editBtn.addEventListener('click', () => fillProductForm(product));
    deleteBtn.addEventListener('click', () => deleteProduct(product.id));

    adminProductList.appendChild(card);
  });
}

function fillProductForm(product) {
  document.getElementById('product-id').value = product.id;
  document.getElementById('name').value = product.name;
  document.getElementById('category').value = product.category;
  document.getElementById('price').value = product.price;
  document.getElementById('stock').value = product.stock;
  document.getElementById('description').value = product.description;
  showPanel('admin');
  document.getElementById('name').focus();
}

function deleteProduct(productId) {
  if (!confirm('¿Estás seguro de eliminar este producto?')) return;
  state.products = state.products.filter((product) => product.id !== productId);
  saveProducts();
  renderProducts();
  resetProductForm();
}

function resetProductForm() {
  productForm.reset();
  document.getElementById('product-id').value = '';
}

function updateSummary() {
  const total = state.products.length;
  const available = state.products.filter((product) => product.stock > 0).length;
  const empty = total - available;

  document.getElementById('summary-total').textContent = total;
  document.getElementById('summary-available').textContent = available;
  document.getElementById('summary-empty').textContent = empty;
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
}

function formatPrice(value) {
  return Number(value).toLocaleString('es-CL');
}

init();
