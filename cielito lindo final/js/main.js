// ============================================================
// MAIN.JS — Lógica principal del sitio (Firebase Compat)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Ocultar loader después de un momento
  setTimeout(() => {
    document.getElementById('page-loader')?.classList.add('hidden');
  }, 1800);

  Auth.init();

  loadCabinData();
  await Gallery.init();
  await Calendar.init('calendar-container', onDatesSelected);
  await Reviews.loadReviews();
  Reviews.initStarInput();

  initScrollAnimations();
  initNavbar();
  initTheme();
  initHamburger();
  initParallax();
});

// ── Cargar datos de cabaña ────────────────────────────────
async function loadCabinData() {
  try {
    const snap = await db.collection('cabins').doc('cielito-lindo').get();
    if (!snap.exists) return;
    const data = snap.data();

    const descEl  = document.getElementById('cabin-description');
    if (descEl && data.descripcion) descEl.textContent = data.descripcion;

    const priceEl = document.getElementById('price-per-night');
    if (priceEl && data.precio) priceEl.textContent = `$${data.precio.toLocaleString('es-AR')}`;
  } catch (e) {
    console.error('Error cargando cabaña:', e);
  }
}

// ── Selección de fechas ───────────────────────────────────
let selectedCheckIn  = null;
let selectedCheckOut = null;

async function onDatesSelected(start, end) {
  selectedCheckIn  = start;
  selectedCheckOut = end;

  const ciDisp = document.getElementById('checkin-display');
  const coDisp = document.getElementById('checkout-display');
  const ciBox  = document.getElementById('checkin-box');
  const coBox  = document.getElementById('checkout-box');

  if (ciDisp) ciDisp.textContent = formatDateES(start);
  if (coDisp) coDisp.textContent = formatDateES(end);
  if (ciBox)  ciBox.classList.add('filled');
  if (coBox)  coBox.classList.add('filled');

  const personas = parseInt(document.getElementById('book-persons')?.value || '2');
  const { total, noches, precioPorNoche } = await Bookings.calculatePrice(start, end, personas);

  const summary    = document.getElementById('booking-summary');
  const nightsLabel = document.getElementById('nights-label');
  const nightsPrice = document.getElementById('nights-price');
  const totalPrice  = document.getElementById('total-price');

  if (summary)     summary.classList.add('visible');
  if (nightsLabel) nightsLabel.textContent = `${noches} ${noches === 1 ? 'noche' : 'noches'} × $${precioPorNoche.toLocaleString('es-AR')}`;
  if (nightsPrice) nightsPrice.textContent = `$${total.toLocaleString('es-AR')}`;
  if (totalPrice)  totalPrice.textContent  = `$${total.toLocaleString('es-AR')}`;
}

// ── Manejar reserva ───────────────────────────────────────
async function handleBooking() {
  const user = Auth.getCurrentUser();
  if (!user) {
    Toast.show('Ingresá para realizar una reserva', 'warning');
    openLoginModal();
    return;
  }

  if (!selectedCheckIn || !selectedCheckOut) {
    Toast.show('Seleccioná las fechas de ingreso y salida en el calendario', 'warning');
    document.getElementById('calendar-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const telefono = document.getElementById('book-phone')?.value?.trim();
  if (!telefono) {
    Toast.show('Ingresá tu teléfono de contacto', 'warning');
    document.getElementById('book-phone')?.focus();
    return;
  }

  const btn = document.getElementById('btn-book');
  if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

  const personas = parseInt(document.getElementById('book-persons')?.value || '2');
  const { total } = await Bookings.calculatePrice(selectedCheckIn, selectedCheckOut, personas);

  const result = await Bookings.createBooking({
    userId:           Auth.getCurrentUser().uid,
    userName:         user.displayName || user.email.split('@')[0],
    userEmail:        user.email,
    telefono,
    fechaIngreso:     selectedCheckIn,
    fechaSalida:      selectedCheckOut,
    cantidadPersonas: document.getElementById('book-persons')?.value,
    precioTotal:      total,
    notas:            document.getElementById('book-notes')?.value
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Confirmar reserva'; }

  if (result.ok) {
    selectedCheckIn  = null;
    selectedCheckOut = null;
    Calendar.reset();
    const ciDisp = document.getElementById('checkin-display');
    const coDisp = document.getElementById('checkout-display');
    if (ciDisp) ciDisp.textContent = 'Seleccioná';
    if (coDisp) coDisp.textContent = 'Seleccioná';
    document.getElementById('booking-summary')?.classList.remove('visible');
    document.getElementById('checkin-box')?.classList.remove('filled');
    document.getElementById('checkout-box')?.classList.remove('filled');
    const phoneEl = document.getElementById('book-phone');
    const notesEl = document.getElementById('book-notes');
    if (phoneEl) phoneEl.value = '';
    if (notesEl) notesEl.value = '';

    Toast.show(`¡Reserva confirmada! ID: #${result.id.slice(-6).toUpperCase()}`, 'success', 5000);
  }
}

// ── Formulario de contacto ────────────────────────────────
async function sendContactForm() {
  const name  = document.getElementById('contact-name')?.value?.trim();
  const email = document.getElementById('contact-email')?.value?.trim();
  const phone = document.getElementById('contact-phone')?.value?.trim();
  const msg   = document.getElementById('contact-msg')?.value?.trim();

  if (!name || !email || !msg) {
    Toast.show('Completá los campos obligatorios', 'warning'); return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    Toast.show('Email inválido', 'error'); return;
  }

  try {
    await db.collection('contactMessages').add({
      nombre: name,
      email,
      telefono: phone,
      mensaje:  msg,
      fecha:    firebase.firestore.FieldValue.serverTimestamp(),
      leido:    false
    });
    Toast.show('¡Mensaje enviado! Te respondemos pronto.', 'success');
    ['contact-name','contact-email','contact-phone','contact-msg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } catch (e) {
    console.error(e);
    Toast.show('Error al enviar el mensaje', 'error');
  }
}

// ── Modal Login ───────────────────────────────────────────
function openLoginModal() {
  document.getElementById('login-modal')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
  document.getElementById('login-modal')?.classList.remove('active');
  document.body.style.overflow = '';
}

function switchAuthTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`tab-${tab}`)?.classList.add('active');
}

document.getElementById('login-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'login-modal') closeLoginModal();
});

async function handleLogin() {
  const email    = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  if (!email || !password) { Toast.show('Completá los campos', 'warning'); return; }
  const result = await Auth.login(email, password);
  if (result.ok) closeLoginModal();
}

async function handleRegister() {
  const nombre   = document.getElementById('reg-name')?.value?.trim();
  const email    = document.getElementById('reg-email')?.value?.trim();
  const telefono = document.getElementById('reg-phone')?.value?.trim();
  const password = document.getElementById('reg-password')?.value;
  if (!nombre || !email || !password) { Toast.show('Completá los campos obligatorios', 'warning'); return; }
  const result = await Auth.register({ nombre, email, telefono, password });
  if (result.ok) closeLoginModal();
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const modal = document.getElementById('login-modal');
  if (!modal?.classList.contains('active')) return;
  const activeTab = document.querySelector('.modal-tab-content.active');
  if (activeTab?.id === 'tab-login')    handleLogin();
  if (activeTab?.id === 'tab-register') handleRegister();
});

document.addEventListener('change', async (e) => {
  if (e.target?.id === 'book-persons' && selectedCheckIn && selectedCheckOut) {
    await onDatesSelected(selectedCheckIn, selectedCheckOut);
  }
});

// ── Navbar ────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Hamburger ─────────────────────────────────────────────
function initHamburger() {
  const btn      = document.getElementById('hamburger');
  const links    = document.getElementById('nav-links');
  const closeBtn = document.getElementById('close-menu');

  btn?.addEventListener('click', () => {
    links?.classList.toggle('open');
    document.body.style.overflow = links?.classList.contains('open') ? 'hidden' : '';
  });
  closeBtn?.addEventListener('click', () => {
    links?.classList.remove('open');
    document.body.style.overflow = '';
  });
  links?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ── Scroll Animations ─────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.fade-up, .gallery-item').forEach(el => observer.observe(el));
}

// ── Parallax Hero ─────────────────────────────────────────
function initParallax() {
  const bg = document.getElementById('hero-bg');
  if (!bg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY < window.innerHeight) {
      bg.style.transform = `scale(1.05) translateY(${window.scrollY * 0.2}px)`;
    }
  }, { passive: true });
}

// ── Theme ─────────────────────────────────────────────────
function initTheme() {
  const btn   = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
  btn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Toast ─────────────────────────────────────────────────
const Toast = (() => {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;';
        document.body.appendChild(container);
      }
    }
    return container;
  }

  function show(message, type = 'info', duration = 3500) {
    const c = getContainer();
    const toast = document.createElement('div');
    const colors = { success: '#2e7d32', error: '#c62828', warning: '#e65100', info: '#1565c0' };
    toast.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:.75rem 1.25rem;border-radius:.5rem;font-size:.9rem;max-width:320px;box-shadow:0 4px 12px rgba(0,0,0,.2);opacity:0;transform:translateX(1rem);transition:all .3s;`;
    toast.textContent = message;
    c.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(1rem)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();

// ── Utils ─────────────────────────────────────────────────
function formatDateES(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}
