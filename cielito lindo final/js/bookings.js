// ============================================================
// BOOKINGS.JS - Sistema de Reservas
// ============================================================

const Bookings = (() => {

  // Obtener todas las reservas activas
  async function getActiveBookings() {
    const snap = await db.collection('bookings')
      .where('estado', 'in', ['confirmada', 'pendiente'])
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Obtener fechas bloqueadas (reservadas)
  async function getBlockedDates() {
    const bookings = await getActiveBookings();
    const blocked = [];
    bookings.forEach(b => {
      const start = b.fechaIngreso.toDate ? b.fechaIngreso.toDate() : new Date(b.fechaIngreso);
      const end = b.fechaSalida.toDate ? b.fechaSalida.toDate() : new Date(b.fechaSalida);
      const current = new Date(start);
      while (current < end) {
        blocked.push(new Date(current).toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });
    return blocked;
  }

  // Verificar disponibilidad
  async function isAvailable(checkIn, checkOut) {
    const blocked = await getBlockedDates();
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const current = new Date(start);
    while (current < end) {
      const dateStr = current.toISOString().split('T')[0];
      if (blocked.includes(dateStr)) return false;
      current.setDate(current.getDate() + 1);
    }
    return true;
  }

  // Calcular precio
  async function calculatePrice(checkIn, checkOut, personas = 2) {
    const precios = {
      2: 100000,
      3: 150000,
      4: 200000,
      5: 250000,
      6: 300000
    };

    const precioNoche = precios[personas] || 100000;
    const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    return { total: nights * precioNoche, noches: nights, precioPorNoche: precioNoche };
  }

  // Crear reserva
  async function createBooking({ userId, userName, userEmail, telefono, fechaIngreso, fechaSalida, cantidadPersonas, precioTotal, notas }) {
    // Verificar disponibilidad
    const available = await isAvailable(fechaIngreso, fechaSalida);
    if (!available) {
      Toast.show('Las fechas seleccionadas ya están reservadas', 'error');
      return { ok: false };
    }

    try {
      const ref = await db.collection('bookings').add({
        userId,
        userName,
        userEmail,
        telefono,
        fechaIngreso: firebase.firestore.Timestamp.fromDate(new Date(fechaIngreso)),
        fechaSalida: firebase.firestore.Timestamp.fromDate(new Date(fechaSalida)),
        cantidadPersonas: parseInt(cantidadPersonas),
        precioTotal,
        notas: notas || '',
        estado: 'pendiente',
        creadoEn: import { serverTimestamp } from "firebase/firestore";
serverTimestamp(),
        cabinId: 'cielito-lindo'
      });
      Toast.show('¡Reserva solicitada con éxito!', 'success');
      return { ok: true, id: ref.id };
    } catch (e) {
      console.error(e);
      Toast.show('Error al crear la reserva', 'error');
      return { ok: false };
    }
  }

  // Obtener reservas del usuario actual
  async function getUserBookings(userId) {
    const snap = await db.collection('bookings')
      .where('userId', '==', userId)
      .orderBy('creadoEn', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Admin: todas las reservas
  async function getAllBookings() {
    const snap = await db.collection('bookings')
      .orderBy('creadoEn', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Admin: actualizar estado
  async function updateBookingStatus(bookingId, estado) {
    await db.collection('bookings').doc(bookingId).update({ estado });
    Toast.show(`Reserva ${estado}`, 'success');
  }

  // Admin: eliminar reserva
  async function deleteBooking(bookingId) {
    await db.collection('bookings').doc(bookingId).delete();
    Toast.show('Reserva eliminada', 'info');
  }

  // Admin: bloquear fechas manualmente
  async function blockDates(fechaInicio, fechaFin, motivo) {
    await db.collection('bookings').add({
      userId: 'admin-block',
      userName: 'Bloqueado',
      userEmail: '',
      telefono: '',
      fechaIngreso: firebase.firestore.Timestamp.fromDate(new Date(fechaInicio)),
      fechaSalida: firebase.firestore.Timestamp.fromDate(new Date(fechaFin)),
      cantidadPersonas: 0,
      precioTotal: 0,
      notas: motivo || 'Bloqueo manual',
      estado: 'confirmada',
      esBloqueo: true,
      creadoEn: import { serverTimestamp } from "firebase/firestore";
serverTimestamp(),
      cabinId: 'cielito-lindo'
    });
    Toast.show('Fechas bloqueadas', 'success');
  }

  return { getBlockedDates, isAvailable, calculatePrice, createBooking, getUserBookings, getAllBookings, updateBookingStatus, deleteBooking, blockDates };
})();

// ============================================================
// CALENDAR.JS - Calendario Interactivo
// ============================================================

const Calendar = (() => {
  let blockedDates = [];
  let selectedStart = null;
  let selectedEnd = null;
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let onSelectCallback = null;
  let container = null;

  async function init(containerId, onSelect) {
    container = document.getElementById(containerId);
    if (!container) return;
    onSelectCallback = onSelect;
    blockedDates = await Bookings.getBlockedDates();
    render();
  }

  function render() {
    if (!container) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    let html = `
      <div class="calendar">
        <div class="calendar__header">
          <button class="cal-nav" id="cal-prev" aria-label="Mes anterior">&#8592;</button>
          <span class="calendar__title">${monthNames[currentMonth]} ${currentYear}</span>
          <button class="cal-nav" id="cal-next" aria-label="Mes siguiente">&#8594;</button>
        </div>
        <div class="calendar__days-header">
          ${dayNames.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="calendar__grid">
    `;

    // Días vacíos al inicio
    for (let i = 0; i < firstDay.getDay(); i++) {
      html += `<span class="cal-day cal-day--empty"></span>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentYear, currentMonth, d);
      const dateStr = date.toISOString().split('T')[0];
      const isPast = date < today;
      const isBlocked = blockedDates.includes(dateStr);
      const isStart = selectedStart && dateStr === selectedStart;
      const isEnd = selectedEnd && dateStr === selectedEnd;
      const isInRange = selectedStart && selectedEnd && dateStr > selectedStart && dateStr < selectedEnd;

      let classes = 'cal-day';
      if (isPast) classes += ' cal-day--past';
      if (isBlocked) classes += ' cal-day--blocked';
      if (isStart) classes += ' cal-day--start';
      if (isEnd) classes += ' cal-day--end';
      if (isInRange) classes += ' cal-day--in-range';
      const disabled = isPast || isBlocked;

      html += `<button class="${classes}" data-date="${dateStr}" ${disabled ? 'disabled' : ''}>${d}</button>`;
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Eventos
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      render();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      render();
    });
    container.querySelectorAll('.cal-day:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => handleDayClick(btn.dataset.date));
    });
  }

  function handleDayClick(dateStr) {
    if (!selectedStart || (selectedStart && selectedEnd)) {
      selectedStart = dateStr;
      selectedEnd = null;
    } else {
      if (dateStr <= selectedStart) {
        selectedStart = dateStr;
        selectedEnd = null;
      } else {
        // Verificar que no haya días bloqueados en el rango
        const start = new Date(selectedStart);
        const end = new Date(dateStr);
        const current = new Date(start);
        current.setDate(current.getDate() + 1);
        let conflict = false;
        while (current < end) {
          if (blockedDates.includes(current.toISOString().split('T')[0])) {
            conflict = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }
        if (conflict) {
          Toast.show('Hay fechas bloqueadas en ese rango', 'warning');
          selectedStart = dateStr;
          selectedEnd = null;
        } else {
          selectedEnd = dateStr;
          onSelectCallback && onSelectCallback(selectedStart, selectedEnd);
        }
      }
    }
    render();
  }

  function reset() {
    selectedStart = null;
    selectedEnd = null;
    render();
  }

  return { init, reset, getSelected: () => ({ start: selectedStart, end: selectedEnd }) };
})();
