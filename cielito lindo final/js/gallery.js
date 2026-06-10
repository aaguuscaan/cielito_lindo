// ============================================================
// GALLERY.JS — Firebase Compat
// ============================================================

const Gallery = (() => {
  let images = [];
  let currentIndex = 0;

  async function init() {
    // Intentar cargar imágenes de Firestore
    let firestoreImages = [];
    try {
      const snap = await db.collection('cabins').doc('cielito-lindo').get();
      if (snap.exists) firestoreImages = snap.data().imagenes || [];
    } catch (e) {
      console.warn('No se pudieron cargar imágenes de Firestore:', e);
    }

    const placeholders = [
      'img/cabins1.jpg',
      'img/cabins2.jpg',
      'img/cabins3.jpg',
      'img/cabins4.jpg',
      'img/cabins5.jpg',
      'img/cabin6.jpg'
    ];

    images = firestoreImages.length ? firestoreImages : placeholders;
    renderGrid();
    initLightbox();
  }

  function renderGrid() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = images.map((src, i) => `
      <div class="gallery-item" data-index="${i}" style="animation-delay: ${i * 0.1}s">
        <img src="${src}" alt="Cielito Lindo - imagen ${i+1}" loading="lazy">
        <div class="gallery-item__overlay">
          <span class="gallery-item__expand">⊕</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => openLightbox(parseInt(item.dataset.index)));
    });
  }

  function initLightbox() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    document.getElementById('lb-close')?.addEventListener('click', closeLightbox);
    document.getElementById('lb-prev')?.addEventListener('click', () => navigate(-1));
    document.getElementById('lb-next')?.addEventListener('click', () => navigate(1));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });
  }

  function openLightbox(index) {
    currentIndex = index;
    const lb  = document.getElementById('lightbox');
    const img = document.getElementById('lb-img');
    const counter = document.getElementById('lb-counter');
    if (!lb || !img) return;
    img.src = images[index];
    if (counter) counter.textContent = `${index + 1} / ${images.length}`;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    document.getElementById('lightbox')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + images.length) % images.length;
    const img     = document.getElementById('lb-img');
    const counter = document.getElementById('lb-counter');
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => { img.src = images[currentIndex]; img.style.opacity = '1'; }, 200);
    }
    if (counter) counter.textContent = `${currentIndex + 1} / ${images.length}`;
  }

  return { init };
})();

// ============================================================
// REVIEWS.JS — Firebase Compat
// ============================================================

const Reviews = (() => {

  async function loadReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    container.innerHTML = '<div class="reviews-loading"><span class="loader-sm"></span></div>';

    try {
      const snap = await db.collection('reviews')
        .orderBy('fecha', 'desc')
        .limit(10)
        .get();

      const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (!reviews.length) {
        container.innerHTML = '<p class="reviews-empty">Sé el primero en dejar una reseña</p>';
        return;
      }

      const avg = reviews.reduce((s, r) => s + (r.puntuacion || 5), 0) / reviews.length;
      const avgEl   = document.getElementById('reviews-avg');
      const starsEl = document.getElementById('reviews-stars');
      const countEl = document.getElementById('reviews-count');
      if (avgEl)   avgEl.textContent   = avg.toFixed(1);
      if (starsEl) starsEl.innerHTML   = renderStars(Math.round(avg));
      if (countEl) countEl.textContent = `${reviews.length} reseñas`;

      container.innerHTML = reviews.map(r => {
        const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date();
        return `
          <div class="review-card">
            <div class="review-card__header">
              <div class="review-avatar">${(r.usuario || 'A')[0].toUpperCase()}</div>
              <div>
                <div class="review-name">${escapeHtml(r.usuario || 'Anónimo')}</div>
                <div class="review-date">${fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</div>
              </div>
              <div class="review-stars">${renderStars(r.puntuacion || 5)}</div>
            </div>
            <p class="review-text">${escapeHtml(r.comentario || '')}</p>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('Error cargando reseñas:', e);
      container.innerHTML = '<p class="reviews-empty">No se pudieron cargar las reseñas</p>';
    }
  }

  async function submitReview() {
    const user = Auth.getCurrentUser();
    if (!user) {
      Toast.show('Iniciá sesión para dejar una reseña', 'warning');
      openLoginModal();
      return;
    }

    const comentario  = document.getElementById('review-comment')?.value?.trim();
    const puntuacion  = parseInt(document.querySelector('.star-input.active')?.dataset.star || 5);

    if (!comentario || comentario.length < 10) {
      Toast.show('Escribí al menos 10 caracteres', 'warning'); return;
    }

    const btn = document.getElementById('submit-review-btn');
    if (btn) btn.disabled = true;

    try {
      await db.collection('reviews').add({
        userId:     user.uid,
        usuario:    user.displayName || user.email.split('@')[0],
        comentario,
        puntuacion,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });
      Toast.show('¡Gracias por tu reseña!', 'success');
      document.getElementById('review-comment').value = '';
      document.querySelectorAll('.star-input').forEach(s => s.classList.remove('active'));
      await loadReviews();
    } catch (e) {
      Toast.show('Error al enviar reseña', 'error');
    }
    if (btn) btn.disabled = false;
  }

  function renderStars(n) {
    return Array.from({ length: 5 }, (_, i) =>
      `<span class="star ${i < n ? 'star--filled' : ''}">${i < n ? '★' : '☆'}</span>`
    ).join('');
  }

  function initStarInput() {
    document.querySelectorAll('.star-input').forEach((star, idx, arr) => {
      star.addEventListener('click', () => {
        arr.forEach((s, i) => s.classList.toggle('active', i <= idx));
      });
      star.addEventListener('mouseenter', () => {
        arr.forEach((s, i) => s.classList.toggle('star-hover', i <= idx));
      });
      star.addEventListener('mouseleave', () => {
        arr.forEach(s => s.classList.remove('star-hover'));
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { loadReviews, submitReview, initStarInput };
})();
