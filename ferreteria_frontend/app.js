const STORAGE_KEY = 'ferreteria_products_v2';

const state = {
  products: [],
  users: [],
  currentUser: null,
  selectedRole: 'admin',
  cart: []
};

const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const productList = document.getElementById('product-list');
const cartList = document.getElementById('cart-list');
const cartBadge = document.getElementById('cart-badge');
const cartItemCount = document.getElementById('cart-item-count');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');
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
  renderCart();
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
    state.users = [];
    state.products = [];
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
    state.currentUser = state.users.find((user) => user.role === 'cliente');
    if (!state.currentUser) {
      alert('No se encontró el perfil cliente en users.json.');
      return;
    }
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    userBadge.textContent = 'Cliente';
    renderLayout();
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const password = document.getElementById('password').value.trim();
    const adminUser = state.users.find(
      (user) => user.role === 'admin' && user.password === password
    );

    if (!adminUser) {
      alert('Contraseña incorrecta. Solo el administrador puede ingresar.');
      return;
    }

    state.currentUser = adminUser;
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

  checkoutBtn.addEventListener('click', checkoutCart);
}

function renderLayout() {
  const isAdmin = state.currentUser && state.currentUser.role === 'admin';

  adminTab.classList.toggle('hidden-admin', !isAdmin);
  if (!isAdmin) {
    showPanel('catalog');
  } else {
    showPanel('catalog');
  }
  renderProducts();
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
      <div class="product-image-wrap">
        <img class="product-image" src="${getProductImage(product)}" alt="${product.name}" loading="lazy">
      </div>
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
        <button class="buy-btn" data-id="${product.id}" ${getCartQuantity(product.id) >= product.stock ? 'disabled' : ''}>
          ${product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
        </button>
      </div>
    `;

    const productImage = article.querySelector('.product-image');
    productImage.addEventListener('error', () => {
      productImage.src = getFallbackImage(product);
    }, { once: true });

    const buyButton = article.querySelector('.buy-btn');
    buyButton.addEventListener('click', () => addToCart(product.id));
    productList.appendChild(article);
  });

  updateSummary();
  renderCart();

  if (state.currentUser && state.currentUser.role === 'admin') {
    renderAdminProducts();
  } else {
    adminProductList.innerHTML = '';
  }
}

function getProductImage(product) {
  const imageFiles = {
    'Taladro Bosch': 'Taladro Bosch.jpeg',
    'Sierra circular': 'Cierra Circular.jpeg',
    'Martillo de carpintero': 'Martillo de Carpintero.jpeg',
    'Llave inglesa 10"': 'llava inglesa10.jpeg',
    'Cinta métrica 5m': 'cintra metrica 5m.jpeg',
    'Taladro atornillador': 'Taladro Atornillador.jpeg',
    'Serrucho de metal': 'serrucho de metal.jpeg',
    'Pintura látex blanco': 'pintura latex blanco.jpeg',
    'Brocha 4"': 'brocha4.jpeg',
    'Rodillo 9"': 'Rodillo 9.jpeg',
    'Lija de grano 120': 'Lija grano 120.jpeg',
    'Pegamento instantáneo': 'Pegamento Instantaneo.jpeg',
    'Cemento 25kg': 'cemento25kg.jpeg',
    'Arena fina 20kg': 'arena fina 20kg.jpeg',
    'Cable eléctrico 2.5mm': 'Cable electrico2.5.jpeg',
    'Interruptor simple': 'Interruptor simple.jpeg',
    'Tubo PVC 1/2"': 'tubo pvc.jpeg',
    'Llave de paso': 'Llave de paso.jpeg',
    'Mango para escoba': 'mango para escoba.jpeg',
    'Escalera de aluminio': 'Escalera aluminio.jpeg',
    'Pulidora angular': 'pulidora angular.jpeg',
    'Compresor de aire': 'compresor de aire.jpeg',
    'Guantes de trabajo': 'Guantes-de-trabajo.jpeg',
    'Casco de seguridad': 'casco de seguridad.jpeg',
    'Soldadura eléctrica': 'soldadura electrica.jpeg',
    'Linterna LED': 'linterna LED.jpeg',
    'Foco led 12W': 'foco led 12w.jpeg',
    'Empaque de tornillos': 'empaque de tornillos.jpeg',
    'Tuerca de acero M8': 'Tuerca de acero m8.jpeg',
    'Arandela plana': 'arandela plana.jpeg',
    'Cinturón de herramientas': 'cinturon de herramientas.jpeg',
    'Set de destornilladores': 'set de destornilladores.jpeg',
    'Alicate de corte': 'alicate de corte.jpeg',
    'Soplador de aire': 'soplador de aire.jpeg',
    'Manguera de jardín': 'Manguera jardin.jpeg',
    'Boquilla para regadera': 'boquilla regadera.jpeg',
    'Balde de pintura 20L': 'balde de pintura 20l.jpeg',
    'Masilla para madera': 'masilla para madera.jpeg',
    'Sierra de mano': 'sierra de mano.jpeg',
    'Mécate de nylon': 'mecate de nylon.jpeg'
  };
  if (imageFiles[product.name]) {
    return `./data/product_images/${encodeURIComponent(imageFiles[product.name])}`;
  }
  return getFallbackImage(product);
}

function getFallbackImage(product) {
  const label = encodeURIComponent(product.name);
  const category = encodeURIComponent(product.category);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 500"><rect width="700" height="500" fill="#fff1f2"/><circle cx="350" cy="190" r="112" fill="#fecaca"/><text x="350" y="215" text-anchor="middle" font-size="120">🔧</text><text x="350" y="365" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#7f1d1d">${decodeURIComponent(label)}</text><text x="350" y="410" text-anchor="middle" font-family="Arial" font-size="21" fill="#b91c1c">${decodeURIComponent(category)}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product || getCartQuantity(productId) >= product.stock) {
    alert('Este producto está agotado.');
    return;
  }

  const cartItem = state.cart.find((item) => item.id === productId);
  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    state.cart.push({ id: productId, quantity: 1 });
  }
  renderProducts();
}

function getCartQuantity(productId) {
  return state.cart.find((item) => item.id === productId)?.quantity || 0;
}

function renderCart() {
  const validItems = state.cart.filter((item) => state.products.some((product) => product.id === item.id));
  state.cart = validItems;
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.cart.reduce((sum, item) => {
    const product = state.products.find((itemProduct) => itemProduct.id === item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  cartBadge.textContent = `Carrito: ${totalItems}`;
  cartItemCount.textContent = `${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}`;
  cartTotalPrice.textContent = `$${formatPrice(totalPrice)}`;
  checkoutBtn.disabled = state.cart.length === 0;
  cartList.innerHTML = '';

  if (state.cart.length === 0) {
    cartList.innerHTML = '<p class="empty-cart">Aún no agregas productos.</p>';
    return;
  }

  state.cart.forEach((item) => {
    const product = state.products.find((itemProduct) => itemProduct.id === item.id);
    const cartRow = document.createElement('div');
    cartRow.className = 'cart-item';
    cartRow.innerHTML = `
      <div>
        <strong>${product.name}</strong>
        <span>$${formatPrice(product.price * item.quantity)}</span>
      </div>
      <div class="cart-controls">
        <button class="quantity-btn" data-action="decrease" data-id="${product.id}" type="button">−</button>
        <span>${item.quantity}</span>
        <button class="quantity-btn" data-action="increase" data-id="${product.id}" type="button" ${item.quantity >= product.stock ? 'disabled' : ''}>+</button>
        <button class="remove-cart-btn" data-id="${product.id}" type="button">Quitar</button>
      </div>
    `;
    cartRow.querySelector('[data-action="decrease"]').addEventListener('click', () => changeCartQuantity(product.id, -1));
    cartRow.querySelector('[data-action="increase"]').addEventListener('click', () => changeCartQuantity(product.id, 1));
    cartRow.querySelector('.remove-cart-btn').addEventListener('click', () => removeFromCart(product.id));
    cartList.appendChild(cartRow);
  });
}

function changeCartQuantity(productId, amount) {
  const cartItem = state.cart.find((item) => item.id === productId);
  const product = state.products.find((item) => item.id === productId);
  if (!cartItem || !product) return;

  const nextQuantity = cartItem.quantity + amount;
  if (nextQuantity <= 0) {
    removeFromCart(productId);
    return;
  }
  if (nextQuantity > product.stock) return;
  cartItem.quantity = nextQuantity;
  renderProducts();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  renderProducts();
}

function checkoutCart() {
  if (state.cart.length === 0) return;

  const unavailable = state.cart.find((item) => {
    const product = state.products.find((itemProduct) => itemProduct.id === item.id);
    return !product || item.quantity > product.stock;
  });
  if (unavailable) {
    alert('Uno de los productos ya no tiene suficiente stock. Revisa tu carrito.');
    return;
  }

  const total = state.cart.reduce((sum, item) => {
    const product = state.products.find((itemProduct) => itemProduct.id === item.id);
    product.stock -= item.quantity;
    return sum + (product.price * item.quantity);
  }, 0);
  state.cart = [];
  saveProducts();
  renderProducts();
  alert(`Compra realizada. Total: $${formatPrice(total)}`);
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
