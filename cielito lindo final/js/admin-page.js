// ============================================================
// ADMIN-PAGE.JS — Lógica de la página admin.html
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Loader
  setTimeout(() => {
    document.getElementById('page-loader')?.classList.add('hidden');
  }, 1400);// ============================================================
// ADMIN-PAGE.JS — Lógica de admin.html (Firebase Compat)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('page-loader')?.classList.add('hidden');
  }, 1400);

  const saved = localStorage.getItem('theme') || 'light';
  applyAdminTheme(saved);
  document.getElementById('admin-theme-toggle')?.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyAdminTheme(next);
    localStorage.setItem('theme', next);
  });

  Auth.init(async (user, role) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    if (role !== 'admin') {
      document.getElementById('page-loader')?.classList.add('hidden');
      const guard = document.getElementById('auth-guard');
      const app   = document.getElementById('admin-app');
      if (guard) guard.style.display = 'flex';
      if (app)   app.style.display   = 'none';
      return;
    }
    const guard = document.getElementById('auth-guard');
    const app   = document.getElementById('admin-app');
    if (guard) guard.style.display = 'none';
    if (app)   app.style.display   = 'block';

    const nameEl = document.getElementById('admin-user-name');
    if (nameEl) nameEl.textContent = user.displayName || user.email;

    await Admin.init();
    bindNav();
    loadAdminReviews();
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('admin-sidebar')?.classList.toggle('open');
  });
});

// ── Tab Nav ───────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tab}`)?.classList.add('active');

      const titles = {
        dashboard: 'Dashboard', bookings: 'Reservas', calendar: 'Calendario',
        block: 'Bloquear fechas', settings: 'Configuración',
        'gallery-tab': 'Galería', 'reviews-tab': 'Reseñas'
      };
      const titleEl = document.getElementById('admin-page-title');
      if (titleEl) titleEl.textContent = titles[tab] || 'Admin';

      if (tab === 'settings')    { Admin.loadCurrentPrice(); loadAdminDesc(); Admin.loadGalleryAdmin(); }
      if (tab === 'calendar')     Admin.loadCalendarAdmin();
      if (tab === 'gallery-tab')  Admin.loadGalleryAdmin();
      if (tab === 'reviews-tab')  loadAdminReviews();
      if (tab === 'bookings')     loadFullBookingsTable();

      if (window.innerWidth < 768) {
        document.getElementById('admin-sidebar')?.classList.remove('open');
      }
    });
  });

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadFullBookingsTable(btn.dataset.filter);
    });
  });
}

// ── Full Bookings Table ───────────────────────────────────
async function loadFullBookingsTable(filter = 'all') {
  const tbody = document.getElementById('bookings-tbody-full');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row"><span class="loader-sm"></span></td></tr>';

  let bookings = await Bookings.getAllBookings();
  if (filter !== 'all') bookings = bookings.filter(b => b.estado === filter);

  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No hay reservas</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const ingreso   = b.fechaIngreso?.toDate ? b.fechaIngreso.toDate() : new Date(b.fechaIngreso);
    const salida    = b.fechaSalida?.toDate  ? b.fechaSalida.toDate()  : new Date(b.fechaSalida);
    const esBloqueo = b.esBloqueo;
    return `
      <tr class="${esBloqueo ? 'booking-row--blocked' : ''}">
        <td><span class="booking-id">#${b.id.slice(-6).toUpperCase()}</span></td>
        <td>${esBloqueo ? '<em>Bloqueo</em>' : escAdm(b.userName)}</td>
        <td>${esBloqueo ? '—' : escAdm(b.userEmail)}</td>
        <td>${fmtAdm(ingreso)}</td>
        <td>${fmtAdm(salida)}</td>
        <td>${esBloqueo ? '—' : (b.cantidadPersonas || 1) + ' pers.'}</td>
        <td><span class="status-badge status-badge--${b.estado}">${b.estado}</span></td>
        <td class="actions-cell">
          ${!esBloqueo ? `
            <button class="btn-action btn-action--confirm" onclick="Admin.changeStatus('${b.id}','confirmada')" title="Confirmar">✓</button>
            <button class="btn-action btn-action--cancel"  onclick="Admin.changeStatus('${b.id}','cancelada')"  title="Cancelar">✕</button>
          ` : ''}
          <button class="btn-action btn-action--delete" onclick="removeAndReload('${b.id}')" title="Eliminar">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function removeAndReload(id) {
  if (!confirm('¿Eliminar esta reserva permanentemente?')) return;
  await Bookings.deleteBooking(id);
  loadFullBookingsTable();
}

// ── Admin Reviews ─────────────────────────────────────────
async function loadAdminReviews() {
  const container = document.getElementById('admin-reviews-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:2rem;"><span class="loader-sm"></span></div>';

  try {
    const snap    = await db.collection('reviews').orderBy('fecha', 'desc').get();
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!reviews.length) {
      container.innerHTML = '<p class="empty-note">No hay reseñas aún</p>'; return;
    }

    container.innerHTML = reviews.map(r => {
      const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date();
      const stars = '★'.repeat(r.puntuacion || 5) + '☆'.repeat(5 - (r.puntuacion || 5));
      return `
        <div class="admin-review-row">
          <div class="admin-review-info">
            <strong>${escAdm(r.usuario || 'Anónimo')}</strong>
            <span style="color:var(--sand);margin:0 .5rem;">${stars}</span>
            <span style="font-size:.8rem;color:var(--gray);">${fecha.toLocaleDateString('es-AR')}</span>
          </div>
          <p style="font-size:.9rem;color:var(--gray);margin:.4rem 0 .8rem;">${escAdm(r.comentario || '')}</p>
          <button class="btn-action btn-action--delete" style="width:auto;padding:.3rem .8rem;"
            onclick="deleteReview('${r.id}')">🗑 Eliminar</button>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p class="empty-note">Error al cargar reseñas</p>';
  }
}

async function deleteReview(id) {
  if (!confirm('¿Eliminar esta reseña?')) return;
  await db.collection('reviews').doc(id).delete();
  Toast.show('Reseña eliminada', 'info');
  loadAdminReviews();
}

// ── Image upload ──────────────────────────────────────────
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    Toast.show('La imagen supera los 5MB', 'error'); return;
  }
  Admin.uploadImage(file);
  event.target.value = '';
}

const uploadZone = document.getElementById('upload-zone');
uploadZone?.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--wood)'; });
uploadZone?.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone?.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) Admin.uploadImage(file);
});

// ── Save description ──────────────────────────────────────
async function loadAdminDesc() {
  try {
    const snap = await db.collection('cabins').doc('cielito-lindo').get();
    const el   = document.getElementById('admin-desc');
    if (el && snap.exists) el.value = snap.data().descripcion || '';
  } catch (e) { console.error(e); }
}

async function saveDescription() {
  const desc = document.getElementById('admin-desc')?.value?.trim();
  if (!desc) { Toast.show('Escribí una descripción', 'warning'); return; }
  await db.collection('cabins').doc('cielito-lindo').update({ descripcion: desc });
  Toast.show('Descripción actualizada', 'success');
}

// ── Navigation ────────────────────────────────────────────
function goToSite() { window.open('index.html', '_blank'); }

// ── Utils ─────────────────────────────────────────────────
function fmtAdm(date) {
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function escAdm(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function applyAdminTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('admin-theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Toast (fallback si no está en main.js) ────────────────
if (typeof Toast === 'undefined') {
  var Toast = (() => {
    function show(message, type = 'info', duration = 3500) {
      let c = document.getElementById('toast-container');
      if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        c.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;';
        document.body.appendChild(c);
      }
      const toast  = document.createElement('div');
      const colors = { success:'#2e7d32', error:'#c62828', warning:'#e65100', info:'#1565c0' };
      toast.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:.75rem 1.25rem;border-radius:.5rem;font-size:.9rem;max-width:320px;box-shadow:0 4px 12px rgba(0,0,0,.2);opacity:0;transform:translateX(1rem);transition:all .3s;`;
      toast.textContent = message;
      c.appendChild(toast);
      requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
      setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateX(1rem)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    return { show };
  })();
}


  // Theme
  const saved = localStorage.getItem('theme') || 'light';
  applyAdminTheme(saved);
  document.getElementById('admin-theme-toggle')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyAdminTheme(next);
    localStorage.setItem('theme', next);
  });

  // Auth guard
  Auth.init(async (user, role) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    if (role !== 'admin') {
      document.getElementById('page-loader')?.classList.add('hidden');
      document.getElementById('auth-guard').style.display = 'flex';
      document.getElementById('admin-app').style.display = 'none';
      return;
    }
    document.getElementById('auth-guard').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    document.getElementById('admin-user-name').textContent = user.displayName || user.email;

    await Admin.init();
    bindNav();
    loadAdminReviews();
  });

  // Sidebar mobile
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('admin-sidebar')?.classList.toggle('open');
  });
});

// ── Tab Nav ───────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      // Active state sidebar
      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      // Show tab
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tab}`)?.classList.add('active');
      // Title
      const titles = {
        dashboard: 'Dashboard',
        bookings: 'Reservas',
        calendar: 'Calendario',
        block: 'Bloquear fechas',
        settings: 'Configuración',
        'gallery-tab': 'Galería',
        'reviews-tab': 'Reseñas'
      };
      document.getElementById('admin-page-title').textContent = titles[tab] || 'Admin';
      // Actions por tab
      if (tab === 'settings') { Admin.loadCurrentPrice(); loadAdminDesc(); Admin.loadGalleryAdmin(); }
      if (tab === 'calendar') Admin.loadCalendarAdmin();
      if (tab === 'gallery-tab') Admin.loadGalleryAdmin();
      if (tab === 'reviews-tab') loadAdminReviews();
      if (tab === 'bookings') loadFullBookingsTable();

      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        document.getElementById('admin-sidebar')?.classList.remove('open');
      }
    });
  });

  // Bind filter buttons in bookings tab
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadFullBookingsTable(btn.dataset.filter);
    });
  });
}

// ── Full Bookings Table (tab reservas) ────────────────────
async function loadFullBookingsTable(filter = 'all') {
  const tbody = document.getElementById('bookings-tbody-full');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row"><span class="loader-sm"></span></td></tr>';

  let bookings = await Bookings.getAllBookings();
  if (filter !== 'all') bookings = bookings.filter(b => b.estado === filter);

  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No hay reservas</td></tr>'; return;
  }

  tbody.innerHTML = bookings.map(b => {
    const ingreso = b.fechaIngreso?.toDate ? b.fechaIngreso.toDate() : new Date(b.fechaIngreso);
    const salida = b.fechaSalida?.toDate ? b.fechaSalida.toDate() : new Date(b.fechaSalida);
    const esBloqueo = b.esBloqueo;
    return `
      <tr class="${esBloqueo ? 'booking-row--blocked' : ''}">
        <td><span class="booking-id">#${b.id.slice(-6).toUpperCase()}</span></td>
        <td>${esBloqueo ? '<em>Bloqueo</em>' : escAdm(b.userName)}</td>
        <td>${esBloqueo ? '—' : escAdm(b.userEmail)}</td>
        <td>${fmtAdm(ingreso)}</td>
        <td>${fmtAdm(salida)}</td>
        <td>${esBloqueo ? '—' : (b.cantidadPersonas || 1) + ' pers.'}</td>
        <td><span class="status-badge status-badge--${b.estado}">${b.estado}</span></td>
        <td class="actions-cell">
          ${!esBloqueo ? `
            <button class="btn-action btn-action--confirm" onclick="Admin.changeStatus('${b.id}','confirmada')" title="Confirmar">✓</button>
            <button class="btn-action btn-action--cancel" onclick="Admin.changeStatus('${b.id}','cancelada')" title="Cancelar">✕</button>
          ` : ''}
          <button class="btn-action btn-action--delete" onclick="removeAndReload('${b.id}')" title="Eliminar">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function removeAndReload(id) {
  if (!confirm('¿Eliminar esta reserva permanentemente?')) return;
  await Bookings.deleteBooking(id);
  loadFullBookingsTable();
}

// ── Admin Reviews ─────────────────────────────────────────
async function loadAdminReviews() {
  const container = document.getElementById('admin-reviews-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:2rem;"><span class="loader-sm"></span></div>';

  const snap = await db.collection('reviews').orderBy('fecha', 'desc').get();
  const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (!reviews.length) {
    container.innerHTML = '<p class="empty-note">No hay reseñas aún</p>'; return;
  }

  container.innerHTML = reviews.map(r => {
    const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date();
    const stars = '★'.repeat(r.puntuacion || 5) + '☆'.repeat(5 - (r.puntuacion || 5));
    return `
      <div class="admin-review-row">
        <div class="admin-review-info">
          <strong>${escAdm(r.usuario || 'Anónimo')}</strong>
          <span style="color:var(--sand);margin:0 .5rem;">${stars}</span>
          <span style="font-size:.8rem;color:var(--gray);">${fecha.toLocaleDateString('es-AR')}</span>
        </div>
        <p style="font-size:.9rem;color:var(--gray);margin:.4rem 0 .8rem;">${escAdm(r.comentario || '')}</p>
        <button class="btn-action btn-action--delete" style="width:auto;padding:.3rem .8rem;"
          onclick="deleteReview('${r.id}')">🗑 Eliminar</button>
      </div>
    `;
  }).join('');
}

async function deleteReview(id) {
  if (!confirm('¿Eliminar esta reseña?')) return;
  await db.collection('reviews').doc(id).delete();
  Toast.show('Reseña eliminada', 'info');
  loadAdminReviews();
}

// ── Image upload ──────────────────────────────────────────
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    Toast.show('La imagen supera los 5MB', 'error'); return;
  }
  Admin.uploadImage(file);
  event.target.value = '';
}

// Drag & drop
const uploadZone = document.getElementById('upload-zone');
uploadZone?.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--wood)'; });
uploadZone?.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone?.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) Admin.uploadImage(file);
});

// ── Save description ──────────────────────────────────────
async function loadAdminDesc() {
  import { doc, getDoc } from "firebase/firestore";

const ref = doc(db, "cabins", "cielito-lindo");
const snap = await getDoc(ref);
  const el = document.getElementById('admin-desc');
  if (el && doc.exists) el.value = doc.data().descripcion || '';
}

async function saveDescription() {
  const desc = document.getElementById('admin-desc')?.value?.trim();
  if (!desc) { Toast.show('Escribí una descripción', 'warning'); return; }
  await db.collection('cabins').doc('cielito-lindo').update({ descripcion: desc });
  Toast.show('Descripción actualizada', 'success');
}

// ── Navigation ────────────────────────────────────────────
function goToSite() { window.open('index.html', '_blank'); }

// ── Utils ─────────────────────────────────────────────────
function fmtAdm(date) {
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function escAdm(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function applyAdminTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('admin-theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}
