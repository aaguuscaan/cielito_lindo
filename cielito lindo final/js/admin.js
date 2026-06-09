// ============================================================
// ADMIN.JS - Panel de Administración
// ============================================================

const Admin = (() => {

  async function init() {
    // Verificar que sea admin
    const role = Auth.getRole();
    if (role !== 'admin') {
      window.location.href = 'index.html';
      return;
    }
    await loadDashboard();
    await loadBookingsTable();
    await loadCalendarAdmin();
    bindTabNavigation();
  }

  // Dashboard stats
  async function loadDashboard() {
    try {
      const bookings = await Bookings.getAllBookings();
      const now = new Date();
      const active = bookings.filter(b => b.estado === 'confirmada' || b.estado === 'pendiente');
      const thisMonth = bookings.filter(b => {
        const d = b.creadoEn?.toDate ? b.creadoEn.toDate() : new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const revenue = bookings.filter(b => b.estado === 'confirmada').reduce((s, b) => s + (b.precioTotal || 0), 0);

      const el = (id) => document.getElementById(id);
      if (el('stat-active')) el('stat-active').textContent = active.length;
      if (el('stat-month')) el('stat-month').textContent = thisMonth.length;
      if (el('stat-revenue')) el('stat-revenue').textContent = `$${revenue.toLocaleString('es-AR')}`;
      if (el('stat-total')) el('stat-total').textContent = bookings.length;
    } catch (e) { console.error(e); }
  }

  // Tabla de reservas
  async function loadBookingsTable(filter = 'all') {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row"><span class="loader-sm"></span> Cargando...</td></tr>';

    let bookings = await Bookings.getAllBookings();
    if (filter !== 'all') bookings = bookings.filter(b => b.estado === filter);

    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No hay reservas</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => {
      const ingreso = b.fechaIngreso?.toDate ? b.fechaIngreso.toDate() : new Date(b.fechaIngreso);
      const salida = b.fechaSalida?.toDate ? b.fechaSalida.toDate() : new Date(b.fechaSalida);
      const esBloqueo = b.esBloqueo;
      return `
        <tr class="booking-row ${esBloqueo ? 'booking-row--blocked' : ''}">
          <td><span class="booking-id">#${b.id.slice(-6).toUpperCase()}</span></td>
          <td>${esBloqueo ? '<em>Bloqueo</em>' : escapeHtml(b.userName || '')}</td>
          <td>${esBloqueo ? '—' : escapeHtml(b.userEmail || '')}</td>
          <td>${formatDate(ingreso)}</td>
          <td>${formatDate(salida)}</td>
          <td>${esBloqueo ? '—' : (b.cantidadPersonas || 1) + ' pers.'}</td>
          <td><span class="status-badge status-badge--${b.estado}">${b.estado}</span></td>
          <td class="actions-cell">
            ${!esBloqueo ? `
              <button class="btn-action btn-action--confirm" onclick="Admin.changeStatus('${b.id}', 'confirmada')" title="Confirmar">✓</button>
              <button class="btn-action btn-action--cancel" onclick="Admin.changeStatus('${b.id}', 'cancelada')" title="Cancelar">✕</button>
            ` : ''}
            <button class="btn-action btn-action--delete" onclick="Admin.removeBooking('${b.id}')" title="Eliminar">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function changeStatus(id, estado) {
    await Bookings.updateBookingStatus(id, estado);
    await loadBookingsTable();
    await loadDashboard();
  }

  async function removeBooking(id) {
    if (!confirm('¿Eliminar esta reserva?')) return;
    await Bookings.deleteBooking(id);
    await loadBookingsTable();
    await loadDashboard();
  }

  // Actualizar precio
  async function updatePrice() {
    const input = document.getElementById('admin-price-input');
    if (!input) return;
    const precio = parseInt(input.value);
    if (!precio || precio < 1) { Toast.show('Precio inválido', 'error'); return; }
    await db.collection('cabins').doc('cielito-lindo').update({ precio });
    Toast.show('Precio actualizado', 'success');
  }

  // Cargar precio actual
  async function loadCurrentPrice() {
    const input = document.getElementById('admin-price-input');
    if (!input) return;
    const doc = await db.collection('cabins').doc('cielito-lindo').get();
    if (doc.exists) input.value = doc.data().precio;
  }

  // Bloquear fechas
  async function blockDatesHandler() {
    const inicio = document.getElementById('block-start')?.value;
    const fin = document.getElementById('block-end')?.value;
    const motivo = document.getElementById('block-reason')?.value;
    if (!inicio || !fin || inicio >= fin) {
      Toast.show('Fechas inválidas', 'error'); return;
    }
    await Bookings.blockDates(inicio, fin, motivo);
    await loadBookingsTable();
  }

  // Subir imagen
  async function uploadImage(file) {
    if (!file) return;
    const btn = document.getElementById('upload-btn');
    if (btn) btn.disabled = true;

    const ref = storage.ref(`cabins/cielito-lindo/${Date.now()}_${file.name}`);
    const task = ref.put(file);

    task.on('state_changed',
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        const bar = document.getElementById('upload-progress');
        if (bar) bar.style.width = pct + '%';
      },
      (err) => {
        Toast.show('Error al subir imagen', 'error');
        if (btn) btn.disabled = false;
      },
      async () => {
        const url = await task.snapshot.ref.getDownloadURL();
        await db.collection('cabins').doc('cielito-lindo').update({
          imagenes: firebase.firestore.FieldValue.arrayUnion(url)
        });
        Toast.show('Imagen subida', 'success');
        if (btn) btn.disabled = false;
        loadGalleryAdmin();
      }
    );
  }

  // Galería admin
  async function loadGalleryAdmin() {
    const container = document.getElementById('admin-gallery');
    if (!container) return;
    const doc = await db.collection('cabins').doc('cielito-lindo').get();
    const imgs = doc.data()?.imagenes || [];
    if (!imgs.length) {
      container.innerHTML = '<p class="empty-note">No hay imágenes aún</p>';
      return;
    }
    container.innerHTML = imgs.map((url, i) => `
      <div class="admin-img-card">
        <img src="${url}" alt="Imagen ${i+1}" loading="lazy">
        <button class="btn-remove-img" onclick="Admin.removeImage('${url}')" title="Eliminar">✕</button>
      </div>
    `).join('');
  }

  async function removeImage(url) {
    await db.collection('cabins').doc('cielito-lindo').update({
      imagenes: firebase.firestore.FieldValue.arrayRemove(url)
    });
    Toast.show('Imagen eliminada', 'info');
    loadGalleryAdmin();
  }

  // Calendario admin
  async function loadCalendarAdmin() {
    await Calendar.init('admin-calendar', () => {});
  }

  // Tab navigation
  function bindTabNavigation() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tab}`)?.classList.add('active');
        if (tab === 'settings') {
          loadCurrentPrice();
          loadGalleryAdmin();
        }
        if (tab === 'calendar') loadCalendarAdmin();
      });
    });

    // Filtros
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadBookingsTable(btn.dataset.filter);
      });
    });
  }

  // Utils
  function formatDate(date) {
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, changeStatus, removeBooking, updatePrice, blockDatesHandler, uploadImage, removeImage, loadGalleryAdmin };
})();
